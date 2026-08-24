import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
async function sha256(value: string) { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join(''); }
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { token } = await req.json();
    if (typeof token !== 'string' || token.length < 32) throw new Error('Token inválido');
    const { data, error } = await client.rpc('pwa_consume_resident_invitation', { target_token_hash: await sha256(token) });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, membership: data }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'No fue posible activar el acceso' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }); }
});
