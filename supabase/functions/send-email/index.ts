// supabase/functions/send-email/index.ts
// FIX: Removed invalid Deno types reference and added a minimal declaration
// for the Deno global. This resolves TypeScript errors in environments that
// don't have Deno types available by default, without affecting the
// function's behavior in the Supabase Edge Function runtime. The original
// /// <reference ... /> pointed to a non-existent file.
declare const Deno: {
    env: {
        get(key: string): string | undefined;
    };
};

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend@3.2.0';

// Define las cabeceras CORS en una constante para reutilizarlas
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // En producción, deberías restringir esto a tu dominio
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL');
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
    if (!SENDER_EMAIL) {
        throw new Error('La variable de entorno SENDER_EMAIL (email de envío verificado) no está configurada.');
    }
    
    const resend = new Resend(RESEND_API_KEY);
    const { to, subject, html, fromName } = await req.json();

    // Valida que los campos necesarios estén presentes
    if (!to || !Array.isArray(to) || to.length === 0 || !subject || !html) {
      return new Response(JSON.stringify({
        error: 'Faltan destinatarios (to), asunto (subject) o cuerpo del correo (html) en la solicitud, o el formato es incorrecto.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const senderName = fromName || FALLBACK_SENDER_NAME;
    const senderEmail = SENDER_EMAIL;

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
