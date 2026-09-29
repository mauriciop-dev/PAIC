import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

type MercadoPagoResource = {
  id?: string | number;
  status?: string;
  collector_id?: string | number;
  metadata?: { preapproval_id?: string | number };
  preapproval_id?: string | number;
  next_payment_date?: string | null;
};

async function fetchResource(token: string, path: string): Promise<MercadoPagoResource> {
  const response = await fetch(`https://api.mercadopago.com/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const resource = await response.json();
  if (!response.ok) throw new Error('Mercado Pago no pudo verificar el evento.');
  return resource as MercadoPagoResource;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!supabaseUrl || !serviceRoleKey || !mercadoPagoToken) {
      return json({ error: 'La recepción de notificaciones no está configurada.' }, 500);
    }

    const notification = await request.json();
    const resourceId = notification?.data?.id ?? notification?.id;
    const eventType = notification?.type ?? notification?.topic;
    if (!resourceId || typeof eventType !== 'string') return json({ received: true });

    const isPreapprovalEvent = eventType.includes('subscription_preapproval') || eventType === 'preapproval';
    const eventResource = await fetchResource(
      mercadoPagoToken,
      `${isPreapprovalEvent ? 'preapproval' : 'v1/payments'}/${encodeURIComponent(String(resourceId))}`
    );
    const merchantResponse = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${mercadoPagoToken}` },
    });
    if (!merchantResponse.ok) throw new Error('No fue posible validar la cuenta receptora.');
    const merchant = await merchantResponse.json();
    if (String(eventResource.collector_id) !== String(merchant.id)) {
      return json({ received: true });
    }

    const preapprovalId = isPreapprovalEvent
      ? String(eventResource.id ?? resourceId)
      : eventResource.metadata?.preapproval_id ?? eventResource.preapproval_id;
    if (!preapprovalId) return json({ received: true });
    const preapproval = isPreapprovalEvent
      ? eventResource
      : await fetchResource(mercadoPagoToken, `preapproval/${encodeURIComponent(String(preapprovalId))}`);
    if (String(preapproval.collector_id) !== String(merchant.id)) return json({ received: true });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: conjunto, error: lookupError } = await admin
      .from('conjuntos')
      .select('id,plan_expires_at')
      .eq('preapproval_id', String(preapprovalId))
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!conjunto) return json({ received: true });

    if (preapproval.status === 'authorized') {
      const nextPaymentDate = preapproval.next_payment_date;
      if (nextPaymentDate && new Date(nextPaymentDate).getTime() > Date.now()) {
        const { error } = await admin
          .from('conjuntos')
          .update({ subscription_plan: 'Paid', plan_expires_at: nextPaymentDate })
          .eq('id', conjunto.id);
        if (error) throw error;
      }
    } else if (preapproval.status === 'cancelled' || preapproval.status === 'paused') {
      const { error } = await admin
        .from('conjuntos')
        .update({ preapproval_id: null })
        .eq('id', conjunto.id);
      if (error) throw error;
    }

    return json({ received: true });
  } catch (error) {
    console.error('No fue posible procesar la notificación de Mercado Pago:', error);
    return json({ error: 'No fue posible procesar la notificación.' }, 500);
  }
});
