import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@3.2.0';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return json({ error: 'No autenticado' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: 'No autenticado' }, 401);
    const { conjuntoId, apartment, email, residentName, conjuntoName } = await req.json();
    const token = `${crypto.randomUUID()}${crypto.randomUUID()}${crypto.randomUUID()}`;
    const result = await client.rpc('pwa_issue_resident_invitation', { target_conjunto: conjuntoId, target_apartment: apartment, target_email: email, target_token_hash: await sha256(token) });
    if (result.error) return json({ error: result.error.message }, 400);
    const url = `${Deno.env.get('PWA_RESIDENTS_URL') ?? 'https://usuarios.paicai.com.co'}/invitacion?token=${encodeURIComponent(token)}`;
    const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
    const sent = await resend.emails.send({
      from: `Administración PAIC <${Deno.env.get('SENDER_EMAIL')!}>`, to: [email],
      subject: `Invitación a la PWA de ${conjuntoName ?? 'tu conjunto'} - PAIC`,
      html: `<h2>Hola ${residentName ?? 'residente'}</h2><p>Te invitamos a ingresar a la PWA de ${conjuntoName ?? 'tu conjunto'}.</p><p>Unidad: ${apartment}</p><p><a href="${url}">Ingresar a PAIC Residentes</a></p><p>Esta invitación vence en 7 días.</p>`
    });
    if (sent.error) return json({ error: sent.error.message }, 502);
    return json({ ok: true, invitationId: result.data?.invitation_id });
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Error interno' }, 500); }
});
