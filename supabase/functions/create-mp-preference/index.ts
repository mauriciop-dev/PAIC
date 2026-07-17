import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const PRICE_COP = 140000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!MP_ACCESS_TOKEN) {
      throw new Error('Configuracion incompleta: MERCADO_PAGO_ACCESS_TOKEN no configurado');
    }

    const { conjuntoInfo } = await req.json();

    if (!conjuntoInfo?.name || !conjuntoInfo?.id) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos del conjunto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const successRedirectUrl = req.headers.get('origin') || 'https://app.paicai.com.co';

    const preferencePayload = {
      items: [{
        title: `Suscripcion Plan Pro - PAIC (${conjuntoInfo.name})`,
        description: `Acceso completo a la plataforma PAIC para ${conjuntoInfo.name}.`,
        quantity: 1,
        unit_price: PRICE_COP,
        currency_id: 'COP',
      }],
      payer: {
        name: conjuntoInfo.adminName || '',
        email: conjuntoInfo.adminEmail || '',
      },
      back_urls: {
        success: successRedirectUrl,
        failure: successRedirectUrl,
        pending: successRedirectUrl,
      },
      auto_return: 'approved',
      external_reference: `paic-${conjuntoInfo.id}-${Date.now()}`,
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferencePayload),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      throw new Error(errorData.message || 'Error al crear preferencia de pago');
    }

    const data = await mpResponse.json();

    return new Response(
      JSON.stringify({ init_point: data.init_point }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
