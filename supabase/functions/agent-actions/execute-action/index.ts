import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, verifySuperAdmin, corsHeaders, handleOptions } from '../shared/supabase.ts';

// Import action handlers
import { blockIp } from '../block-ip/index.ts';
import { createPrFix } from '../create-pr-fix/index.ts';
import { simplifyForm } from '../simplify-form/index.ts';
import { revokeSessions } from '../revoke-sessions/index.ts';
import { notifyAdmin } from '../notify-admin/index.ts';

const ACTION_HANDLERS: Record<string, (supabase: any, payload: any) => Promise<any>> = {
  'block_ip': blockIp,
  'create_pr_fix': createPrFix,
  'simplify_form': simplifyForm,
  'revoke_sessions': revokeSessions,
  'notify_admin': notifyAdmin,
};

serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers,
      });
    }

    const supabase = createSupabaseClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers,
      });
    }

    // Verify superadmin
    await verifySuperAdmin(supabase, user.id);

    const { action, payload } = await req.json();

    if (!action || !ACTION_HANDLERS[action]) {
      return new Response(JSON.stringify({ error: `Acción no soportada: ${action}` }), {
        status: 400,
        headers,
      });
    }

    const result = await ACTION_HANDLERS[action](supabase, payload);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[agent-actions] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers,
    });
  }
});