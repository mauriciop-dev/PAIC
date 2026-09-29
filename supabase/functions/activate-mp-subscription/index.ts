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

type PaymentDetails = {
  status?: string;
  currency_id?: string;
  transaction_amount?: number;
  external_reference?: string | null;
  collector_id?: number | string;
  payer?: { email?: string };
  next_payment_date?: string;
  auto_recurring?: { transaction_amount?: number; currency_id?: string };
};

async function getMercadoPagoDetails(
  accessToken: string,
  paymentId: string | null,
  preapprovalId: string | null
): Promise<PaymentDetails> {
  if (!paymentId && !preapprovalId) throw new Error('Falta el identificador del pago.');
  const resource = paymentId
    ? `v1/payments/${encodeURIComponent(paymentId)}`
    : `preapproval/${encodeURIComponent(preapprovalId)}`;
  const response = await fetch(`https://api.mercadopago.com/${resource}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const details = await response.json();
  if (!response.ok) throw new Error('No fue posible verificar el pago con Mercado Pago.');
  return details as PaymentDetails;
}

async function isMerchantPayment(accessToken: string, collectorId: number | string | undefined): Promise<boolean> {
  if (collectorId === undefined) return false;
  const response = await fetch('https://api.mercadopago.com/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('No fue posible validar la cuenta receptora del pago.');
  const merchant = await response.json();
  return String(merchant.id) === String(collectorId);
}

function addBillingPeriod(from: Date, billing: 'monthly' | 'annual'): string {
  const result = new Date(from);
  if (billing === 'annual') {
    result.setUTCFullYear(result.getUTCFullYear() + 1);
  } else {
    const day = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
    result.setUTCDate(Math.min(day, lastDay));
  }
  return result.toISOString();
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  try {
    const authorization = request.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey || !mercadoPagoToken) {
      return json({ error: 'La confirmación de suscripción no está configurada.' }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: 'Inicia sesión para confirmar el pago.' }, 401);

    const payload = await request.json();
    const { conjuntoId, planName, billing, paymentId, preapprovalId } = payload ?? {};
    if (
      typeof conjuntoId !== 'string'
      || typeof planName !== 'string'
      || (billing !== 'monthly' && billing !== 'annual')
      || (!paymentId && !preapprovalId)
      || (paymentId !== undefined && typeof paymentId !== 'string' && typeof paymentId !== 'number')
      || (preapprovalId !== undefined && typeof preapprovalId !== 'string' && typeof preapprovalId !== 'number')
    ) {
      return json({ error: 'La información del pago está incompleta.' }, 400);
    }

    const expectedPrice = planPrices[planName]?.[billing];
    if (!expectedPrice) return json({ error: 'El plan seleccionado no es válido.' }, 400);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile, error: profileError } = await adminClient
      .from('user_profiles')
      .select('id,email,role,conjunto_id')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (
      !profile
      || profile.conjunto_id !== conjuntoId
      || !['trial', 'subscriber'].includes(profile.role)
    ) {
      return json({ error: 'No tienes permiso para activar este plan.' }, 403);
    }

    const payment = await getMercadoPagoDetails(
      mercadoPagoToken,
      paymentId ? String(paymentId) : null,
      preapprovalId ? String(preapprovalId) : null
    );
    if (!(await isMerchantPayment(mercadoPagoToken, payment.collector_id))) {
      return json({ error: 'El pago no corresponde a la cuenta de PAIC.' }, 403);
    }
    const paymentStatus = payment.status;
    const amount = paymentId ? payment.transaction_amount : payment.auto_recurring?.transaction_amount;
    const currency = paymentId ? payment.currency_id : payment.auto_recurring?.currency_id;
    if (paymentStatus !== (paymentId ? 'approved' : 'authorized')) {
      return json({ error: 'Mercado Pago aún no confirma el pago o la suscripción.' }, 402);
    }
    if (currency !== 'COP' || Number(amount) !== expectedPrice) {
      return json({ error: 'El valor verificado no coincide con el plan seleccionado.' }, 400);
    }

    const expectedExternalReference =
      `paic:${conjuntoId}:${authData.user.id}:${planName}:${billing}`;
    if (payment.external_reference !== expectedExternalReference) {
      return json({ error: 'No pudimos asociar el pago con la cuenta de esta copropiedad.' }, 403);
    }

    const expiresAt = !paymentId && payment.next_payment_date
      ? payment.next_payment_date
      : addBillingPeriod(new Date(), billing);
    const normalizedPaymentId = paymentId ? String(paymentId) : null;
    const normalizedPreapprovalId = preapprovalId ? String(preapprovalId) : null;
    const { error: activationError } = await adminClient.rpc('paic_activate_subscription', {
      target_conjunto_id: conjuntoId,
      target_event_id: normalizedPaymentId
        ? `payment:${normalizedPaymentId}`
        : `preapproval:${normalizedPreapprovalId}`,
      target_plan_name: planName,
      target_plan_price: expectedPrice,
      target_plan_expires_at: expiresAt,
      target_preapproval_id: normalizedPreapprovalId,
      target_payment_id: normalizedPaymentId,
    });
    if (activationError?.code === '23505') {
      return json({ error: 'Este pago ya fue utilizado para activar el plan.' }, 409);
    }
    if (activationError) throw activationError;

    return json({
      planName,
      planPrice: expectedPrice,
      planExpiresAt: expiresAt,
      preapprovalId: normalizedPreapprovalId,
      lastPaymentId: normalizedPaymentId,
    });
  } catch (error) {
    console.error('No fue posible activar la suscripción:', error);
    return json({ error: 'No fue posible confirmar la suscripción. Contacta a soporte si el pago ya fue aprobado.' }, 500);
  }
});
