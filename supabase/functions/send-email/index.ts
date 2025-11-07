// supabase/functions/send-email/index.ts
// FIX: The Deno global object is not available in standard TypeScript environments,
// causing "Cannot find name 'Deno'" errors. A manual declaration is added
// to provide types for the Deno APIs used in this function.
// The invalid triple-slash directive that was causing a file-not-found error was also removed.
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend@3.2.0';

// Define las cabeceras CORS en una constante para reutilizarlas
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // En producción, deberías restringir esto a tu dominio
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FALLBACK_SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'onboarding@resend.dev';
const FALLBACK_SENDER_NAME = 'Administración PAIC';

serve(async (req) => {
  // Manejo de la solicitud pre-vuelo (preflight) de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('La variable de entorno RESEND_API_KEY no está configurada.');
    }
    
    const resend = new Resend(RESEND_API_KEY);
    // FIX: Destructure fromName and fromEmail from the request body for dynamic sender info.
    const { to, subject, html, fromName, fromEmail } = await req.json();

    // Valida que los campos necesarios estén presentes
    if (!to || !Array.isArray(to) || to.length === 0 || !subject || !html) {
      return new Response(JSON.stringify({
        error: 'Faltan destinatarios (to), asunto (subject) o cuerpo del correo (html) en la solicitud, o el formato es incorrecto.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // FIX: Use the dynamic sender details from the payload, with fallbacks to environment variables.
    const senderName = fromName || FALLBACK_SENDER_NAME;
    const senderEmail = fromEmail || FALLBACK_SENDER_EMAIL;

    // Lógica de envío de correo
    const { data, error } = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: to,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error({ error });
      // Lanza el error para que sea capturado por el bloque catch
      throw error;
    }

    // Respuesta exitosa
    return new Response(JSON.stringify({
      success: true,
      message: 'Correo enviado exitosamente',
      data,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Manejo centralizado de errores
    console.error('Error en la función de envío de correo:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Ocurrió un error inesperado en el servidor.',
    }), {
      status: 500, // Usar 500 para errores del servidor
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});