// supabase/functions/send-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend@3.2.0';

// Define CORS headers to be used in responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Start serving HTTP requests
serve(async (req) => {
  // --- Handle CORS preflight request ---
  // The browser sends this OPTIONS request first to check if the actual request is safe to send.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Get Environment Variables ---
    // Secrets must be set in the Supabase project dashboard: Project Settings -> Functions
    // @ts-ignore
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set in environment variables.");
    }

    // @ts-ignore
    const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL');
    if (!SENDER_EMAIL) {
        throw new Error("SENDER_EMAIL is not set in environment variables.");
    }
    const FALLBACK_SENDER_NAME = 'Administración PAIC';


    // --- Initialize Resend Client ---
    // It's initialized here to ensure it uses the latest env vars on each invocation.
    const resend = new Resend(RESEND_API_KEY);
    
    // --- Parse Request Body ---
    const { to, subject, html, fromName } = await req.json();
    
    // --- Validate Payload ---
    if (!to || !Array.isArray(to) || to.length === 0 || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing "to", "subject", or "html" in request body. "to" must be an array of emails.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // --- Send Email ---
    const { data, error } = await resend.emails.send({
      from: `${fromName || FALLBACK_SENDER_NAME} <${SENDER_EMAIL}>`,
      to: to,
      subject: subject,
      html: html,
    });
    
    // --- Handle Resend API Error ---
    if (error) {
      console.error({ error });
      // Re-throw the error to be caught by the main catch block
      throw error;
    }
    
    // --- Return Success Response ---
    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // --- Generic Error Handler ---
    // This catches errors from parsing, validation, or the Resend API call.
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
