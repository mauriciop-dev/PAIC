// supabase/functions/send-email/index.ts

// NOTE: No `declare namespace Deno` is needed as the Supabase environment provides these types globally.
// FIX: To resolve issues with Deno's global types not being recognized in some environments,
// this was updated to import and use the `serve` function from the Deno standard library
// instead of relying on the global `Deno.serve`.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { Resend } from 'npm:resend@3.2.0'

// --- CORS Headers ---
// Defines which domains and methods are allowed to access this function.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Environment Variable Validation ---
// Fail fast if secrets are not set in Supabase settings. This will cause a clear deployment error
// instead of a confusing runtime error.
// FIX: Added @ts-ignore to suppress TypeScript errors. Deno.env is available in the Supabase Edge Function runtime.
// @ts-ignore
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
if (!RESEND_API_KEY) {
  throw new Error("Server configuration error: The 'RESEND_API_KEY' secret is not set.");
}

// FIX: Added @ts-ignore to suppress TypeScript errors. Deno.env is available in the Supabase Edge Function runtime.
// @ts-ignore
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL');
if (!SENDER_EMAIL) {
  throw new Error("Server configuration error: The 'SENDER_EMAIL' secret is not set.");
}

const FALLBACK_SENDER_NAME = 'Administración PAIC';

// --- Initialize Resend Client ---
// Create the client once when the function loads for better performance.
const resend = new Resend(RESEND_API_KEY);

// --- Main Server Logic ---
serve(async (req) => {
  // Handle CORS preflight requests immediately. The browser sends this OPTIONS
  // request first to check if the actual request is safe to send.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse the incoming request body as JSON.
    const body = await req.json();
    console.log('Function received payload:', JSON.stringify(body, null, 2));

    const { to, subject, html, fromName } = body;

    // Validate that all required fields are present in the payload.
    if (!to || !Array.isArray(to) || to.length === 0 || !subject || !html) {
        return new Response(
            JSON.stringify({ success: false, error: 'Invalid payload: Missing required fields "to", "subject", or "html".' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
    
    // Send the email using the Resend API.
    const { data, error } = await resend.emails.send({
      from: `${fromName || FALLBACK_SENDER_NAME} <${SENDER_EMAIL}>`,
      to: to,
      subject: subject,
      html: html,
    });

    // If Resend returns an error, log it and throw an error to be caught below.
    if (error) {
      console.error('Resend API Error:', JSON.stringify(error, null, 2));
      throw new Error(`Resend API failed: ${error.message}`);
    }

    // If successful, return a success response with the data from Resend.
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // This catch block handles any unexpected errors during execution,
    // ensuring a proper JSON error response is always sent back.
    console.error('Caught in Deno.serve handler:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500, // 500 indicates an internal server error.
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});