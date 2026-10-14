/**
 * Supabase Edge Function para enviar notificaciones PWA
 * Uso: supabase.functions.invoke('send-pwa-push', { body: {...} })
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { conjuntoId, title, body, userIds, type, url, datos } = await req.json();

    // Crear cliente de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener suscripciones push
    let query = supabase
      .from('pwa_push_subscriptions')
      .select('*');

    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    } else {
      // Todos los usuarios del conjunto
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('conjunto_id', conjuntoId)
        .eq('activo', true);
      
      if (users && users.length > 0) {
        query = query.in('user_id', users.map(u => u.id));
      }
    }

    const { data: subscriptions, error } = await query;
    
    if (error) {
      console.error('Error obteniendo suscripciones:', error);
      return new Response(
        JSON.stringify({ error: 'Error obteniendo suscripciones' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Importar web-push
    const webPush = await import('https://esm.sh/web-push@3.6.4');
    
    webPush.setVapidDetails(
      'mailto:admin@paicai.com.co',
      vapidPublicKey,
      vapidPrivateKey
    );

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        url: url || '/',
        type,
        conjuntoId,
        datos
      }
    });

    let sent = 0;
    let failed = 0;

    // Enviar a cada suscripción
    for (const sub of subscriptions || []) {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.subscription?.keys?.p256dh,
            auth: sub.subscription?.keys?.auth
          }
        };

        await webPush.sendNotification(subscription, payload);
        sent++;
      } catch (error) {
        console.error('Error enviando a', sub.endpoint, error);
        failed++;
        
        // Si la suscripción expiró, eliminarla
        if (error.statusCode === 410) {
          await supabase
            .from('pwa_push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        }
      }
    }

    // Actualizar estadísticas
    const result = {
      sent,
      failed,
      total: subscriptions?.length || 0,
      activeMembers: subscriptions?.length || 0
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en send-pwa-push:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
