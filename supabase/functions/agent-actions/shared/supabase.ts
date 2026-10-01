import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

export async function verifySuperAdmin(supabase: ReturnType<typeof createSupabaseClient>, userId: string) {
  const { data, error } = await supabase
    .from('platform_admins')
    .select('id, activo')
    .eq('user_id', userId)
    .eq('activo', true)
    .single();

  if (error || !data) {
    throw new Error('No autorizado: Solo superadministradores pueden ejecutar esta acción');
  }
  return data;
}

export function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export function handleOptions(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req.headers.get('origin')) });
  }
  return null;
}