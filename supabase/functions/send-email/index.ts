// supabase/functions/send-email/index.ts
// FIX: Add a triple-slash directive to provide TypeScript with Deno's type definitions.
// This resolves the "Cannot find name 'Deno'" error.
/// <reference types="https://deno.land/x/deno/cli/types.d.ts" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend@3.2.0';

// Define las cabeceras CORS en una constante para reutilizarlas
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // En producción, deberías restringir esto a tu dominio
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'onboarding@resend.dev';

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
    const { bcc, subject, html } = await req.json();

    // Valida que los campos necesarios estén presentes
    if (!bcc || !Array.isArray(bcc) || bcc.length === 0 || !subject || !html) {
      return new Response(JSON.stringify({
        error: 'Faltan destinatarios (bcc), asunto (subject) o cuerpo del correo (html) en la solicitud, o el formato es incorrecto.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lógica de envío de correo
    const { data, error } = await resend.emails.send({
      from: `Administración PAIC <${SENDER_EMAIL}>`,
      to: bcc, // FIX: Los destinatarios ahora se envían en el campo 'to' para una entrega correcta.
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
