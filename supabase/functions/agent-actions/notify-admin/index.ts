import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface NotifyAdminPayload {
  informeId: string;
  canales?: ('email' | 'push' | 'whatsapp' | 'slack')[];
  prioridad?: 'inmediata' | 'proxima_hora' | 'proximo_dia';
  mensajePersonalizado?: string;
}

export async function notifyAdmin(supabase: ReturnType<typeof createClient>, payload: NotifyAdminPayload) {
  const { informeId, canales = ['email', 'push'], prioridad = 'inmediata', mensajePersonalizado } = payload;

  // Get informe details
  const { data: informe, error: informeError } = await supabase
    .from('alertas_bugs')
    .select('*')
    .eq('id', informeId)
    .single();

  if (informeError || !informe) {
    throw new Error('Informe no encontrado');
  }

  // Get superadmins to notify
  const { data: admins } = await supabase
    .from('platform_admins')
    .select('user_id, email, nombre')
    .eq('activo', true);

  const resultados = {
    email: { enviados: 0, fallidos: 0 },
    push: { enviados: 0, fallidos: 0 },
    whatsapp: { enviados: 0, fallidos: 0 },
    slack: { enviados: 0, fallidos: 0 },
  };

  const titulo = `[${informe.severidad.toUpperCase()}] ${informe.titulo}`;
  const mensaje = mensajePersonalizado || generateMessage(informe);

  for (const admin of admins || []) {
    // Email
    if (canales.includes('email')) {
      try {
        await sendEmail(supabase, admin.email, titulo, mensaje);
        resultados.email.enviados++;
      } catch (e) {
        resultados.email.fallidos++;
        console.error(`Error email to ${admin.email}:`, e);
      }
    }

    // Push notification
    if (canales.includes('push')) {
      try {
        await sendPush(supabase, admin.user_id, titulo, mensaje);
        resultados.push.enviados++;
      } catch (e) {
        resultados.push.fallidos++;
      }
    }

    // WhatsApp (via external provider)
    if (canales.includes('whatsapp')) {
      try {
        await sendWhatsApp(admin.email, mensaje); // Would need phone number mapping
        resultados.whatsapp.enviados++;
      } catch (e) {
        resultados.whatsapp.fallidos++;
      }
    }

    // Slack
    if (canales.includes('slack')) {
      try {
        await sendSlack(titulo, mensaje, informe.severidad);
        resultados.slack.enviados++;
      } catch (e) {
        resultados.slack.fallidos++;
      }
    }
  }

  // Log audit
  await supabase.from('logs_auditoria').insert({
    source: 'agent-actions',
    level: 'info',
    message: `Notificaciones enviadas a admins para informe ${informeId}`,
    metadata: { informeId, canales, prioridad, resultados },
  });

  return {
    resultados,
    message: `Notificaciones enviadas: Email(${resultados.email.enviados}), Push(${resultados.push.enviados})`,
  };
}

function generateMessage(informe: any): string {
  return `
🚨 **Alerta PAIC - ${informe.severidad.toUpperCase()}**

**${informe.titulo}**
${informe.descripcion}

**Detalles:**
- Categoría: ${informe.categoria}
- Conjunto: ${informe.metadata?.conjuntoId || 'N/A'}
- Usuario: ${informe.metadata?.userId || 'N/A'}
- Timestamp: ${new Date(informe.creado_en).toLocaleString('es-CO')}

**Acción sugerida:** ${informe.accionSugerida?.descripcion || 'Revisar manualmente'}

---
PAIC Agent Command Center
  `.trim();
}

async function sendEmail(supabase: any, to: string, subject: string, body: string) {
  // In production: use Resend, SendGrid, or Supabase Edge Function for email
  // For now, log
  console.log(`[Email] To: ${to}, Subject: ${subject}`);
  // await supabase.functions.invoke('send-email', { body: { to, subject, html: body } });
}

async function sendPush(supabase: any, userId: string, title: string, body: string) {
  // In production: use Supabase Realtime + Web Push API
  console.log(`[Push] User: ${userId}, Title: ${title}`);
  // await supabase.functions.invoke('send-push', { body: { userId, title, body } });
}

async function sendWhatsApp(email: string, message: string) {
  // In production: use Twilio, WhatsApp Business API, or similar
  console.log(`[WhatsApp] To: ${email}`);
}

async function sendSlack(title: string, body: string, severity: string) {
  // In production: use Slack Webhook URL
  const color = severity === 'critica' ? 'danger' : severity === 'alta' ? 'warning' : 'good';
  console.log(`[Slack] Title: ${title}, Color: ${color}`);
  // await fetch(Deno.env.get('SLACK_WEBHOOK_URL'), { method: 'POST', body: JSON.stringify({ attachments: [{ title, text: body, color }] }) });
}