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
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user } } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
    if (!user) return json({ error: 'No autenticado' }, 401);
    const { conjuntoId, apartment, email, residentName, conjuntoName } = await req.json();
    const token = `${crypto.randomUUID()}${crypto.randomUUID()}${crypto.randomUUID()}`;
    const { data: profile, error: profileError } = await admin.from('user_profiles').select('id,conjunto_id,role').eq('id', user.id).maybeSingle();
    if (profileError) return json({ error: `Perfil: ${profileError.message}` }, 500);
    if (!profile || profile.conjunto_id !== conjuntoId || !['admin', 'trial', 'subscriber', 'internal'].includes(profile.role)) return json({ error: 'Sin permisos para este conjunto' }, 403);
    const { data: resident, error: residentError } = await admin.from('residents').select('name,email,pwa_status').eq('conjunto_id', conjuntoId).eq('apartment', apartment).maybeSingle();
    if (residentError) return json({ error: `Residente: ${residentError.message}` }, 500);
    if (!resident || !resident.email || resident.email.trim().toLowerCase() !== email.trim().toLowerCase()) return json({ error: 'Residente o correo no válido' }, 400);
    await admin.from('pwa_resident_invitations').update({ revoked_at: new Date().toISOString() }).eq('conjunto_id', conjuntoId).eq('apartment', apartment).is('used_at', null).is('revoked_at', null);
    const { data: invitation, error: invitationError } = await admin.from('pwa_resident_invitations').insert({ conjunto_id: conjuntoId, apartment, email_normalized: email.trim().toLowerCase(), token_hash: await sha256(token), created_by: user.id }).select('id').single();
    if (invitationError) return json({ error: `Invitación: ${invitationError.message}` }, 500);
    const { error: updateError } = await admin.from('residents').update({ pwa_status: 'invited', pwa_invited_at: new Date().toISOString(), pwa_revoked_at: null }).eq('conjunto_id', conjuntoId).eq('apartment', apartment);
    if (updateError) return json({ error: `Estado residente: ${updateError.message}` }, 500);
    const url = `${Deno.env.get('PWA_RESIDENTS_URL') ?? 'https://usuarios.paicai.com.co'}/?token=${encodeURIComponent(token)}`;
    const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
    const sent = await resend.emails.send({
      from: `Administración PAIC <${Deno.env.get('SENDER_EMAIL')!}>`, to: [email],
      subject: `Invitación a la PWA de ${conjuntoName ?? 'tu conjunto'} - PAIC`,
      html: `<h2>Hola ${residentName ?? 'residente'}</h2><p>Te invitamos a ingresar a la PWA de ${conjuntoName ?? 'tu conjunto'}.</p><p>Unidad: ${apartment}</p><p><a href="${url}">Ingresar a PAIC Residentes</a></p><p>Esta invitación vence en 7 días.</p>`
    });
    if (sent.error) return json({ error: sent.error.message }, 502);
    return json({ ok: true, invitationId: invitation.id });
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Error interno' }, 500); }
});
