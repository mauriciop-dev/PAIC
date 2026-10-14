/**
 * Supabase Edge Function para enviar notificaciones PWA
 * Uso: supabase.functions.invoke('send-pwa-push', { body: {...} })
 * 
 * Las VAPID keys pueden venir de:
 * 1. Deno.env (secrets de Supabase project)
 * 2. request body (pasadas desde el frontend)
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
    const { conjuntoId, title, body, userIds, type, url, datos, vapidPublicKey, vapidPrivateKey } = await req.json();
    console.log('🔔 send-pwa-push invoked:', { conjuntoId, title, userIds, type });

    if (!conjuntoId) {
      return new Response(
        JSON.stringify({ error: 'conjuntoId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener suscripciones push - AHORA POR CONJUNTO_ID DIRECTO
    let query = supabase
      .from('pwa_push_subscriptions')
      .select('*')
      .eq('conjunto_id', conjuntoId);

    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    const { data: subscriptions, error } = await query;
    
    console.log('📱 Subscriptions found:', subscriptions?.length, 'error:', error?.message);
    
    if (error) {
      console.error('Error obteniendo suscripciones:', error);
      return new Response(
        JSON.stringify({ error: 'Error obteniendo suscripciones', details: error.message }),
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

    // Usar keys del request o del entorno
    const publicKey = vapidPublicKey || Deno.env.get('VAPID_PUBLIC_KEY');
    const privateKey = vapidPrivateKey || Deno.env.get('VAPID_PRIVATE_KEY');

    if (!publicKey || !privateKey) {
      console.error('❌ VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured. Provide in request body as vapidPublicKey/vapidPrivateKey, or add to Supabase project secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Importar web-push
    const webPush = await import('https://esm.sh/web-push@3.6.4');
    
    webPush.setVapidDetails(
      'mailto:admin@paicai.com.co',
      publicKey,
      privateKey
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
        console.log('✅ Sent to:', sub.endpoint.substring(0, 50) + '...');
      } catch (error) {
        console.error('❌ Error enviando a', sub.endpoint, error);
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

    const result = {
      sent,
      failed,
      total: subscriptions?.length || 0,
      activeMembers: subscriptions?.length || 0
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