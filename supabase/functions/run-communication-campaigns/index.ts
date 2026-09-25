import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@3.2.0';
import webpush from 'npm:web-push';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

type Campaign = {
  id: string;
  conjunto_id: string;
  channel: 'email' | 'pwa' | 'both';
  title: string;
  body: string;
  attachments: Array<{ name: string; url: string }>;
  created_by: string;
  audience: string;
  recurrence: 'none' | 'weekly' | 'monthly';
  next_run_at: string;
};

type Recipient = { apartment: string; email: string | null; user_id: string | null };

function nextRun(value: string, recurrence: Campaign['recurrence']) {
  if (recurrence === 'weekly') return new Date(new Date(value).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  if (recurrence === 'monthly') {
    const date = new Date(value);
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
    return date.toISOString();
  }
  return null;
}

function emailHtml(campaign: Campaign, conjuntoName: string) {
  const body = campaign.body.replace(/\n/g, '<br>');
  const attachments = campaign.attachments.map(file => `<p><a href="${file.url}">${file.name}</a></p>`).join('');
  return `<div style="font-family:sans-serif;max-width:600px;margin:auto"><h1>${campaign.title}</h1><p>${conjuntoName}</p><div>${body}</div>${attachments}</div>`;
}

async function sendPush(userIds: string[], campaign: Campaign) {
  if (!userIds.length) return { sent: 0, failed: 0 };
  const { data: subscriptions, error } = await admin.from('pwa_push_subscriptions').select('subscription,user_id').in('user_id', userIds);
  if (error) throw error;
  const vapidSubject = Deno.env.get('VAPID_SUBJECT');
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) throw new Error('VAPID no está configurado.');
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const results = await Promise.allSettled((subscriptions || []).map(row => webpush.sendNotification(row.subscription, JSON.stringify({ title: campaign.title, body: campaign.body, url: '/' }))));
  const expired = (subscriptions || []).filter((_, index) => results[index].status === 'rejected' && (results[index] as PromiseRejectedResult).reason?.statusCode === 410).map(row => row.user_id);
  if (expired.length) await admin.from('pwa_push_subscriptions').delete().in('user_id', expired);
  return { sent: results.filter(result => result.status === 'fulfilled').length, failed: results.filter(result => result.status === 'rejected').length };
}

async function executeCampaign(campaign: Campaign) {
  const { data: storedRecipients, error: recipientError } = await admin.from('communication_campaign_recipients').select('apartment,email,user_id').eq('campaign_id', campaign.id);
  if (recipientError) throw recipientError;
  let selected = (storedRecipients || []) as Recipient[];
  if (campaign.audience === 'all_residents' || campaign.audience === 'debtors') {
    const { data: residents, error: residentsError } = await admin.from('residents').select('apartment,email').eq('conjunto_id', campaign.conjunto_id);
    if (residentsError) throw residentsError;
    let apartments = (residents || []).map(resident => resident.apartment);
    if (campaign.audience === 'debtors') {
      const { data: accounts, error: accountsError } = await admin.from('account_status').select('apartment,outstanding_balance').eq('conjunto_id', campaign.conjunto_id);
      if (accountsError) throw accountsError;
      const debtorApartments = new Set((accounts || []).filter(account => Number(account.outstanding_balance || 0) > 0).map(account => account.apartment));
      apartments = apartments.filter(apartment => debtorApartments.has(apartment));
    }
    const emailByApartment = new Map((residents || []).map(resident => [resident.apartment, resident.email || null]));
    selected = apartments.map(apartment => ({ apartment, email: emailByApartment.get(apartment) || null, user_id: null }));
  }
  const { data: conjunto, error: conjuntoError } = await admin.from('conjuntos').select('name').eq('id', campaign.conjunto_id).single();
  if (conjuntoError) throw conjuntoError;
  let sent = 0;
  let failed = 0;

  if (campaign.channel === 'email' || campaign.channel === 'both') {
    const to = [...new Set(selected.map(recipient => recipient.email).filter((email): email is string => Boolean(email)))];
    if (to.length) {
      const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
      const result = await resend.emails.send({
        from: `Administración PAIC <${Deno.env.get('SENDER_EMAIL')!}>`,
        to,
        subject: campaign.title,
        html: emailHtml(campaign, conjunto.name),
      });
      if (result.error) throw new Error(result.error.message);
      sent += to.length;
    }
  }

  if (campaign.channel === 'pwa' || campaign.channel === 'both') {
    const apartments = [...new Set(selected.map(recipient => recipient.apartment))];
    const { error: communicationError } = await admin.from('pwa_communications').insert({
      conjunto_id: campaign.conjunto_id,
      title: campaign.title,
      body: campaign.body,
      attachment_url: campaign.attachments[0]?.url || null,
      status: 'publicado',
      published_at: new Date().toISOString(),
      created_by: campaign.created_by,
      audience: campaign.audience,
      target_apartments: apartments,
    });
    if (communicationError) throw communicationError;
    const { data: members, error: memberError } = await admin.from('pwa_memberships').select('user_id').eq('conjunto_id', campaign.conjunto_id).eq('status', 'activo').in('apartment', apartments);
    if (memberError) throw memberError;
    const pushResult = await sendPush([...new Set((members || []).map(member => member.user_id))], campaign);
    sent += pushResult.sent;
    failed += pushResult.failed;
  }

  return { sent, failed };
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const authorization = request.headers.get('Authorization');
  if (authorization !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) return json({ error: 'Unauthorized' }, 401);
  try {
    const { data: campaigns, error } = await admin.from('communication_campaigns').select('*').eq('status', 'active').lte('next_run_at', new Date().toISOString()).limit(25);
    if (error) throw error;
    const results = [];
    for (const campaign of (campaigns || []) as Campaign[]) {
      const run = await admin.from('communication_campaign_runs').insert({ campaign_id: campaign.id, status: 'running' }).select('id').single();
      if (run.error) throw run.error;
      try {
        const result = await executeCampaign(campaign);
        const next = nextRun(campaign.next_run_at, campaign.recurrence);
        const { error: updateError } = await admin.from('communication_campaigns').update({ last_run_at: new Date().toISOString(), next_run_at: next, status: next ? 'active' : 'completed', updated_at: new Date().toISOString() }).eq('id', campaign.id).eq('status', 'active');
        if (updateError) throw updateError;
        await admin.from('communication_campaign_runs').update({ status: result.failed ? 'partial' : 'completed', sent_count: result.sent, failed_count: result.failed, finished_at: new Date().toISOString() }).eq('id', run.data.id);
        results.push({ id: campaign.id, ...result });
      } catch (campaignError) {
        await admin.from('communication_campaign_runs').update({ status: 'failed', error: campaignError instanceof Error ? campaignError.message : 'Campaign failed', finished_at: new Date().toISOString() }).eq('id', run.data.id);
        results.push({ id: campaign.id, error: campaignError instanceof Error ? campaignError.message : 'Campaign failed' });
      }
    }
    return json({ processed: results.length, results });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Campaign runner failed' }, 500);
  }
});
