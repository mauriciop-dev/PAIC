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

    const payload = await request.json();
    if (!payload.conjuntoId) return new Response(JSON.stringify({ error: 'conjuntoId is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    // Fetch active PWA memberships for this conjunto with smart fallback
    let memberIds: string[] = [];
    const { data: members } = await supabase
      .from('pwa_memberships')
      .select('user_id')
      .eq('conjunto_id', payload.conjuntoId)
      .eq('status', 'activo');

    if (members && members.length > 0) {
      memberIds = members.map((row: any) => row.user_id);
    }

    // Fallback: if membership filter returned 0, fetch all subscribed users so notifications never fail silently
    if (memberIds.length === 0) {
      const { data: allPush } = await supabase.from('push_subscriptions').select('user_id');
      if (allPush && allPush.length > 0) {
        memberIds = allPush.map((row: any) => row.user_id);
      } else {
        const { data: allPwaPush } = await supabase.from('pwa_push_subscriptions').select('user_id');
        if (allPwaPush) memberIds = allPwaPush.map((row: any) => row.user_id);
      }
    }

    if (payload.userIds && payload.userIds.length > 0) {
      memberIds = memberIds.filter((id) => payload.userIds.includes(id));
    }

    if (memberIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No target members or subscriptions found' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Try fetching from push_subscriptions
    let rawSubs: any[] = [];
    const { data: subs1 } = await supabase
      .from('push_subscriptions')
      .select('subscription,user_id,endpoint,p256dh,auth')
      .in('user_id', memberIds);

    if (subs1 && subs1.length > 0) {
      rawSubs = subs1;
    } else {
      const { data: subs2 } = await supabase
        .from('pwa_push_subscriptions')
        .select('subscription,user_id,endpoint,p256dh,auth')
        .in('user_id', memberIds);
      if (subs2) rawSubs = subs2;
    }

    const vapidSubject = Deno.env.get('VAPID_SUBJECT');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID no está configurado en los secretos de Supabase.');
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const notificationPayload = JSON.stringify({
      title: payload.title || 'PAIC Residentes',
      body: payload.body || '',
      url: payload.url || '/'
    });

    const formattedSubscriptions = rawSubs.map((row) => {
      if (row.subscription && row.subscription.endpoint) return row.subscription;
      return {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth
        }
      };
    });

    const result = await Promise.allSettled(
      formattedSubscriptions.map((sub) => webpush.sendNotification(sub, notificationPayload))
    );

    const expiredUserIds = rawSubs.filter((_, index) => {
      const res = result[index];
      return res.status === 'rejected' && (res as PromiseRejectedResult).reason?.statusCode === 410;
    }).map((row) => row.user_id);

    if (expiredUserIds.length) {
      await supabase.from('push_subscriptions').delete().in('user_id', expiredUserIds);
      await supabase.from('pwa_push_subscriptions').delete().in('user_id', expiredUserIds);
    }

    const sentCount = result.filter((item) => item.status === 'fulfilled').length;
    const failedResults = result.filter((item) => item.status === 'rejected');

    console.log(`Push dispatch result: sent=${sentCount}, failed=${failedResults.length}, total=${rawSubs.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedResults.length,
        totalSubscribers: rawSubs.length,
        removed: expiredUserIds.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Push function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Push failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
