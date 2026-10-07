import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    const token = authHeader.replace('Bearer ', '');
    const { data: caller } = await supabase.auth.getUser(token);
    if (!caller.user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    const { data: profile } = await supabase.from('user_profiles').select('role,conjunto_id').eq('id', caller.user.id).maybeSingle();
    if (!profile || !['trial', 'subscriber'].includes(profile.role)) return new Response('Forbidden', { status: 403, headers: corsHeaders });

    const payload = await request.json();
    if (!payload.conjunto_id) return new Response('conjunto_id is required', { status: 400, headers: corsHeaders });
    if (!payload.apartment) return new Response('apartment is required', { status: 400, headers: corsHeaders });
    if (profile.conjunto_id !== payload.conjunto_id) return new Response('Forbidden', { status: 403, headers: corsHeaders });

    // Find membership for the apartment
    const { data: membership, error: membershipError } = await supabase
      .from('pwa_memberships')
      .select('user_id')
      .eq('conjunto_id', payload.conjunto_id)
      .eq('apartment', payload.apartment)
      .eq('status', 'activo')
      .maybeSingle();

    if (membershipError) throw membershipError;
    if (!membership) {
      return Response.json({ sent: 0, failed: 0, error: 'No active membership for apartment' }, { headers: corsHeaders });
    }

    // Get push subscription for this user
    const { data: subscription, error: subError } = await supabase
      .from('pwa_push_subscriptions')
      .select('subscription')
      .eq('user_id', membership.user_id)
      .maybeSingle();

    if (subError) throw subError;
    if (!subscription) {
      return Response.json({ sent: 0, failed: 0, error: 'No push subscription for user' }, { headers: corsHeaders });
    }

    const vapidSubject = Deno.env.get('VAPID_SUBJECT');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) throw new Error('VAPID no está configurado.');

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const pushPayload = {
      title: payload.title || 'PAIC Residentes',
      body: payload.body || '',
      type: payload.type || 'porteria',
      id: payload.resource_id || 'default',
      url: payload.url || '/',
      icon: payload.icon || '/logo-paic.png',
      badge: payload.badge || '/badge-paic.png',
    };

    try {
      await webpush.sendNotification(subscription.subscription, JSON.stringify(pushPayload));
      return Response.json({ sent: 1, failed: 0 }, { headers: corsHeaders });
    } catch (pushError: any) {
      const statusCode = pushError?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Subscription expired, remove it
        await supabase.from('pwa_push_subscriptions').delete().eq('user_id', membership.user_id);
      }
      return Response.json({ sent: 0, failed: 1, error: pushError.message }, { headers: corsHeaders });
    }
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Push failed' }, { status: 500, headers: corsHeaders });
  }
});