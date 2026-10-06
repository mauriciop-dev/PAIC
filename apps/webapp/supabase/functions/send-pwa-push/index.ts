import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (request) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: caller } = await supabase.auth.getUser(token);
    if (!caller.user) return new Response('Unauthorized', { status: 401 });
    const { data: profile } = await supabase.from('user_profiles').select('role,conjunto_id').eq('id', caller.user.id).maybeSingle();
    if (!profile || !['trial', 'subscriber'].includes(profile.role)) return new Response('Forbidden', { status: 403 });
    const payload = await request.json();
    if (!payload.conjuntoId) return new Response('conjuntoId is required', { status: 400 });
    if (profile.conjunto_id !== payload.conjuntoId) return new Response('Forbidden', { status: 403 });
    const { data: members, error: membersError } = await supabase.from('pwa_memberships').select('user_id').eq('conjunto_id', payload.conjuntoId).eq('status', 'activo');
    if (membersError) throw membersError;
    const memberIds = (members || []).map((row) => row.user_id).filter((id) => !payload.userIds?.length || payload.userIds.includes(id));
    const { data: subscriptions, error } = memberIds.length ? await supabase.from('pwa_push_subscriptions').select('subscription,user_id').in('user_id', memberIds) : { data: [], error: null };
    if (error) throw error;
    if (payload.dryRun) {
      return Response.json({
        total: subscriptions?.length || 0,
        activeMembers: memberIds.length,
        sent: 0,
        failed: 0,
        removed: 0,
      });
    }
    const vapidSubject = Deno.env.get('VAPID_SUBJECT');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) throw new Error('VAPID no está configurado.');
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    const result = await Promise.allSettled((subscriptions || []).map((row) => webpush.sendNotification(row.subscription, JSON.stringify({
      title: payload.title || 'PAIC Residentes',
      body: payload.body || '',
      type: payload.type || 'default',
      id: payload.id || 'default',
      url: payload.url || '/',
      icon: payload.icon || '/logo-paic.png',
      badge: payload.badge || '/logo-paic.png',
    }))));
    const expired = (subscriptions || []).filter((_, index) => {
      if (result[index].status !== 'rejected') return false;
      const statusCode = (result[index] as PromiseRejectedResult).reason?.statusCode;
      return statusCode === 404 || statusCode === 410;
    }).map((row) => row.user_id);
    if (expired.length) await supabase.from('pwa_push_subscriptions').delete().in('user_id', expired);
    return Response.json({
      total: subscriptions?.length || 0,
      sent: result.filter((item) => item.status === 'fulfilled').length,
      failed: result.filter((item) => item.status === 'rejected').length,
      removed: expired.length,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Push failed' }, { status: 500 });
  }
});
