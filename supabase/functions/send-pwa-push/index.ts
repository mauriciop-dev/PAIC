/**
 * Supabase Edge Function para enviar notificaciones PWA
 * Uso: supabase.functions.invoke('send-pwa-push', { body: {...} })
 *
 * Compatible con Edge Runtime (Deno). Usa web-push vía esm.sh
 * y Web Crypto API para el cifrado VAPID.
 *
 * Variables de entorno requeridas (Supabase secrets):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
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
    const body = await req.json();
    const { conjuntoId, title, body: messageBody, userIds, type, url, datos, icon, badge } = body;
    console.log('🔔 send-pwa-push invoked:', { conjuntoId, title, userIds, type });

    if (!conjuntoId) {
      return new Response(
        JSON.stringify({ error: 'conjuntoId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente de Supabase con service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener claves VAPID exclusivamente de secretos de servidor
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@paicai.com.co';

    if (!publicKey || !privateKey) {
      console.error('❌ VAPID keys not configured in server secrets');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to Supabase project secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener suscripciones push por conjunto_id
    let query = supabase
      .from('pwa_push_subscriptions')
      .select('*')
      .eq('conjunto_id', conjuntoId);

    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    const { data: subscriptions, error: subError } = await query;

    console.log('📱 Subscriptions found:', subscriptions?.length, 'error:', subError?.message);

    if (subError) {
      console.error('Error obteniendo suscripciones:', subError);
      return new Response(
        JSON.stringify({ error: 'Error obteniendo suscripciones', details: subError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('⚠️ No subscriptions found for conjunto:', conjuntoId);
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, total: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Importar web-push (Deno-compatible via esm.sh)
    const webPush = await import('https://esm.sh/web-push@3.6.4');

    webPush.setVapidDetails(
      vapidSubject,
      publicKey,
      privateKey
    );

    const payload = JSON.stringify({
      title: title || 'PAIC',
      body: messageBody || '',
      icon: icon || '/icon-192x192.png',
      badge: badge || '/badge-72x72.png',
      data: {
        url: url || '/',
        type,
        conjuntoId,
        datos
      }
    });

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

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
        console.log('✅ Sent to:', sub.endpoint.substring(0, 50) + '...');
      } catch (error) {
        console.error('❌ Error enviando a', sub.endpoint, error);
        failed++;

        // Si la suscripción expiró, eliminarla
        if (error.statusCode === 410 || error.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    }

    // Limpiar suscripciones expiradas
    if (expiredEndpoints.length > 0) {
      for (const endpoint of expiredEndpoints) {
        await supabase
          .from('pwa_push_subscriptions')
          .delete()
          .eq('endpoint', endpoint);
      }
      console.log('🗑️ Suscripciones expiradas eliminadas:', expiredEndpoints.length);
    }

    const result = {
      sent,
      failed,
      total: subscriptions?.length || 0,
      activeMembers: subscriptions?.length || 0,
      removed: expiredEndpoints.length
    };

    console.log('📊 Result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Error en send-pwa-push:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});