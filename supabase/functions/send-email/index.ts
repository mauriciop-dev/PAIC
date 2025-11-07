// supabase/functions/send-email/index.ts

// FIX: Add type definitions for `Deno.env` to resolve TypeScript errors.
// The Deno runtime provides the 'Deno' global, but in some environments (like a standard TS project without Deno config),
// the types for its properties like 'env' are missing.
declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };
}

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend@3.2.0'

// This is a critical security best practice.
// The API key should never be exposed client-side.
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
// The sender email must be a verified domain in your Resend account.
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL')
const FALLBACK_SENDER_NAME = 'Administración PAIC'

// Initialize the Resend client once when the function starts.
// This is more efficient than creating it on every request.
const resend = new Resend(RESEND_API_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // For development. In production, lock this down to your app's URL.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Explicitly allow POST and OPTIONS
}

serve(async (req) => {
  // This is a preflight request. It's a security check browsers do before
  // making a real request to a different origin. We must handle it correctly.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate that essential environment variables are set on the server.
    if (!RESEND_API_KEY) {
      throw new Error('Server configuration error: RESEND_API_KEY is not set.')
    }
    if (!SENDER_EMAIL) {
      throw new Error('Server configuration error: SENDER_EMAIL is not set.')
    }

    const body = await req.json()
    // This log is crucial for debugging. Check your Supabase function logs to see if the request is arriving.
    console.log('Function received payload:', JSON.stringify(body, null, 2))

    // Validate the incoming payload from the client.
    const { to, subject, html, fromName } = body
    if (!to || !Array.isArray(to) || to.length === 0 || !subject || !html) {
      throw new Error('Invalid payload: Missing required fields "to", "subject", or "html".')
    }

    // Send the email using the validated and server-configured details.
    const { data, error } = await resend.emails.send({
      from: `${fromName || FALLBACK_SENDER_NAME} <${SENDER_EMAIL}>`,
      to: to,
      subject: subject,
      html: html,
    })

    // Handle potential errors from the Resend API.
    if (error) {
      console.error('Resend API Error:', JSON.stringify(error, null, 2))
      // Forward the Resend error for better client-side debugging.
      throw new Error(`Resend API failed: ${error.message}`)
    }

    // Return a success response to the client.
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    // Catch any error from the try block, log it, and return a formatted error response.
    console.error('Edge Function Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        // Use 400 for client-side/payload errors, but could be 500 for server issues.
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
