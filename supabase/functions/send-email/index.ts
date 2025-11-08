// supabase/functions/send-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend@3.2.0';

const FALLBACK_SENDER_NAME = 'Administración PAIC';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejar las peticiones CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Carga Robusta de Variables y Cliente ---
    // Cargar los secrets e instanciar el cliente dentro del handler para cada petición.
    // Este es el patrón más fiable para las Edge Functions de Supabase.
    // @ts-ignore
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    // @ts-ignore
    const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL');

    if (!RESEND_API_KEY) {
      throw new Error("Configuración del servidor incompleta: El secreto 'RESEND_API_KEY' no fue encontrado.");
    }
    if (!SENDER_EMAIL) {
      throw new Error("Configuración del servidor incompleta: El secreto 'SENDER_EMAIL' no fue encontrado.");
    }

    const resend = new Resend(RESEND_API_KEY);
    
    // --- Procesamiento del Cuerpo de la Petición ---
    const { to, subject, html, fromName } = await req.json();
    
    // --- Validación de la Entrada ---
    if (!to || !Array.isArray(to) || to.length === 0 || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'La petición es inválida. Faltan los campos "to", "subject", o "html". El campo "to" debe ser un arreglo de correos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // --- Llamada a la API de Resend ---
    const { data, error } = await resend.emails.send({
      from: `${fromName || FALLBACK_SENDER_NAME} <${SENDER_EMAIL}>`,
      to: to,
      subject: subject,
      html: html,
    });
    
    if (error) {
      console.error({ resendError: error });
      // Proporcionar un mensaje de error más específico de Resend si está disponible
      throw new Error(`Error de la API de Resend: ${error.message}`);
    }
    
    // --- Respuesta de Éxito ---
    return new Response(
      JSON.stringify({ success: true, message: 'Correo enviado exitosamente', data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // --- Manejo de Errores ---
    console.error('Error en la ejecución de la función:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
