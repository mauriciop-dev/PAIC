import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const planPrices: Record<string, { monthly: number; annual: number }> = {
  Torre: { monthly: 100000, annual: 1020000 },
  Edificio: { monthly: 160000, annual: 1632000 },
  Copropiedad: { monthly: 280000, annual: 2856000 },
  Megaproyecto: { monthly: 450000, annual: 4590000 },
  Condominio: { monthly: 750000, annual: 7650000 },
  Complejo: { monthly: 1200000, annual: 12240000 },
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  try {
    const authorization = request.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!authorization || !supabaseUrl || !anonKey || !mercadoPagoToken) {
      return json({ error: 'El proceso de suscripción no está configurado.' }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: 'Inicia sesión para seleccionar un plan.' }, 401);

    const payload = await request.json();
    const conjuntoId = payload?.conjuntoId;
    const planName = payload?.planName;
    const billing = payload?.billing;
    if (
      typeof conjuntoId !== 'string'
      || typeof planName !== 'string'
      || (billing !== 'monthly' && billing !== 'annual')
    ) {
      return json({ error: 'Selecciona un plan y una periodicidad válidos.' }, 400);
    }

    const price = planPrices[planName]?.[billing];
    if (!price) return json({ error: 'El plan seleccionado no es válido.' }, 400);

    const { data: profile, error: profileError } = await userClient
      .from('user_profiles')
      .select('email,role,conjunto_id')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (
      !profile
      || profile.conjunto_id !== conjuntoId
      || !['trial', 'subscriber'].includes(profile.role)
      || !profile.email
    ) {
      return json({ error: 'No tienes permiso para seleccionar un plan para esta copropiedad.' }, 403);
    }

    const baseUrl = Deno.env.get('PAIC_APP_URL') || 'https://app.paicai.com.co';
    const parsedBaseUrl = new URL(baseUrl);
    if (parsedBaseUrl.protocol !== 'https:' && parsedBaseUrl.hostname !== 'localhost') {
      return json({ error: 'La URL de retorno de PAIC no está configurada de forma segura.' }, 500);
    }
    const returnUrl = new URL('/', parsedBaseUrl);
    returnUrl.searchParams.set('subscription', 'return');

    const externalReference = `paic:${conjuntoId}:${authData.user.id}:${planName}:${billing}`;
    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: `Plan ${planName} de PAIC`,
        external_reference: externalReference,
        payer_email: profile.email,
        back_url: returnUrl.toString(),
        auto_recurring: {
          frequency: billing === 'annual' ? 12 : 1,
          frequency_type: 'months',
          transaction_amount: price,
          currency_id: 'COP',
        },
        status: 'pending',
      }),
    });
    const subscription = await response.json();
    if (!response.ok) {
      console.error('Mercado Pago rechazó la creación de la suscripción.');
      return json({ error: 'No fue posible iniciar el pago en Mercado Pago.' }, 502);
    }

    const checkoutUrl = typeof subscription.init_point === 'string' ? new URL(subscription.init_point) : null;
    const checkoutHost = checkoutUrl?.hostname || '';
    const isMercadoPagoHost = checkoutHost === 'mercadopago.com'
      || checkoutHost.endsWith('.mercadopago.com')
      || checkoutHost === 'mercadopago.com.co'
      || checkoutHost.endsWith('.mercadopago.com.co');
    if (
      (typeof subscription.id !== 'string' && typeof subscription.id !== 'number')
      || !checkoutUrl
      || checkoutUrl.protocol !== 'https:'
      || !isMercadoPagoHost
    ) {
      console.error('Mercado Pago devolvió una URL de suscripción inválida.');
      return json({ error: 'Mercado Pago devolvió un enlace de pago inválido.' }, 502);
    }

    return json({ init_point: subscription.init_point, preapproval_id: String(subscription.id) });
  } catch (error) {
    console.error('No fue posible iniciar la suscripción:', error);
    return json({ error: 'No fue posible iniciar el proceso de pago.' }, 500);
  }
});
