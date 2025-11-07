// supabase/functions/send-email/index.ts

// Add type definitions for `Deno.env` to resolve TypeScript errors.
declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };
}

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend@3.2.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL')
const FALLBACK_SENDER_NAME = 'Administración PAIC'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Main request handler logic
const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Ensure environment variables are configured. This is a critical server check.
  if (!RESEND_API_KEY) {
    throw new Error('Server configuration error: RESEND_API_KEY is not set.')
  }
  if (!SENDER_EMAIL) {
    throw new Error('Server configuration error: SENDER_EMAIL is not set.')
  }
  
  // Initialize Resend client here, only if keys exist.
  const resend = new Resend(RESEND_API_KEY)

  const body = await req.json()
  console.log('Function received payload:', JSON.stringify(body, null, 2))

  const { to, subject, html, fromName } = body
  if (!to || !Array.isArray(to) || to.length === 0 || !subject || !html) {
    throw new Error('Invalid payload: Missing required fields "to", "subject", or "html".')
  }

  const { data, error } = await resend.emails.send({
    from: `${fromName || FALLBACK_SENDER_NAME} <${SENDER_EMAIL}>`,
    to: to,
    subject: subject,
    html: html,
  })

  if (error) {
    console.error('Resend API Error:', JSON.stringify(error, null, 2))
    throw new Error(`Resend API failed: ${error.message}`)
  }

  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Start the server with the handler and a global error catcher.
// This is the most robust way to ensure all errors, even unexpected ones,
// return a proper CORS-enabled response, which is crucial for solving this type of issue.
serve(async (req: Request) => {
  try {
    return await handler(req);
  } catch (error) {
    console.error('Caught in serve-level catch:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400, // Use 400 for client-side/payload errors, 500 for server issues
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});