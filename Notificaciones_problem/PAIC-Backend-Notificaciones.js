// Backend - Ejemplos de cómo enviar notificaciones desde la WebApp Admin
// Adapta según tu tech stack (Node.js, Python, etc.)

// ============================================
// OPCIÓN 1: Node.js + Express + web-push
// ============================================

const express = require('express');
const webpush = require('web-push');

const router = express.Router();

// Configurar VAPID
webpush.setVapidDetails(
  'mailto:admin@paicai.com.co',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Función genérica para enviar notificación
 * @param {string} userId - ID del usuario
 * @param {object} notificationData - Datos de la notificación
 */
async function sendPushNotification(userId, notificationData) {
  try {
    // 1. Obtener suscripción del usuario
    const user = await User.findById(userId);
    if (!user || !user.pushSubscription) {
      console.warn(`Usuario ${userId} no tiene suscripción push`);
      return;
    }

    // 2. Construir payload COMPLETO
    const payload = {
      title: notificationData.title,
      body: notificationData.body,
      type: notificationData.type, // comunicado | porteria | documento | reglamento
      id: notificationData.id, // ID del recurso
      url: notificationData.url, // ruta en la PWA
      icon: notificationData.icon || '/logo-paic.png',
      badge: notificationData.badge || '/logo-paic.png',
      tag: notificationData.type,
      timestamp: new Date().toISOString()
    };

    // 3. Enviar
    await webpush.sendNotification(user.pushSubscription, JSON.stringify(payload));

    console.log(`✅ Push enviado a usuario ${userId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error enviando push a ${userId}:`, error);
    throw error;
  }
}

// ============================================
// ENDPOINT 1: Enviar Comunicado
// ============================================
router.post('/notifications/send-comunicado', async (req, res) => {
  try {
    const { userId, comunicadoId, titulo, resumen } = req.body;

    // Validar datos
    if (!userId || !comunicadoId || !titulo) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Construir notificación específica
    const notificationData = {
      title: titulo,
      body: resumen || 'Se ha publicado un nuevo comunicado',
      type: 'comunicado', // ← IMPORTANTE
      id: comunicadoId, // ← ID del comunicado
      url: `/comunicados/${comunicadoId}`, // ← RUTA ESPECÍFICA
      icon: '/icons/comunicado.png'
    };

    await sendPushNotification(userId, notificationData);

    res.json({ success: true, message: 'Notificación enviada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENDPOINT 2: Enviar a Múltiples Usuarios
// ============================================
router.post('/notifications/send-comunicado-masivo', async (req, res) => {
  try {
    const { comunicadoId, titulo, resumen, userIds } = req.body;

    // Si no se especifican usuarios, enviar a todos
    const recipients =
      userIds && userIds.length > 0
        ? userIds
        : (await User.find({ pushSubscription: { $exists: true } })).map(
            (u) => u._id
          );

    console.log(`📢 Enviando comunicado a ${recipients.length} usuarios`);

    // Enviar a todos en paralelo
    const results = await Promise.allSettled(
      recipients.map((userId) =>
        sendPushNotification(userId, {
          title: titulo,
          body: resumen,
          type: 'comunicado',
          id: comunicadoId,
          url: `/comunicados/${comunicadoId}`,
          icon: '/icons/comunicado.png'
        })
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    res.json({
      success: true,
      message: `Enviados: ${successful}, Fallidos: ${failed}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENDPOINT 3: Llamada de Portería
// ============================================
router.post('/notifications/send-porteria', async (req, res) => {
  try {
    const { userId, paqueteId, descripcion, morador } = req.body;

    const notificationData = {
      title: 'Llamada de Portería',
      body: descripcion || `${morador} tiene un paquete para ti`,
      type: 'porteria', // ← IMPORTANTE
      id: paqueteId || 'porteria-' + Date.now(),
      url: '/porteria', // ← RUTA PORTERÍA
      icon: '/icons/porteria.png'
    };

    await sendPushNotification(userId, notificationData);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENDPOINT 4: Nuevo Documento/Reglamento
// ============================================
router.post('/notifications/send-documento', async (req, res) => {
  try {
    const { userId, documentoId, titulo, tipo } = req.body;

    // tipo puede ser: 'documento', 'reglamento', 'acta', etc.
    const notificationType = tipo || 'documento';

    const notificationData = {
      title: 'Nuevo Documento',
      body: titulo || 'Se ha compartido un nuevo documento',
      type: notificationType, // ← IMPORTANTE
      id: documentoId,
      url: `/documentos/${documentoId}`, // ← RUTA DOCUMENTOS
      icon: '/icons/documento.png'
    };

    await sendPushNotification(userId, notificationData);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENDPOINT 5: Evento/Junta
// ============================================
router.post('/notifications/send-evento', async (req, res) => {
  try {
    const { userId, eventoId, titulo, fecha } = req.body;

    const notificationData = {
      title: 'Nuevo Evento',
      body: `${titulo} - ${fecha}`,
      type: 'evento', // ← IMPORTANTE
      id: eventoId,
      url: `/eventos/${eventoId}`, // ← RUTA EVENTOS
      icon: '/icons/evento.png'
    };

    await sendPushNotification(userId, notificationData);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENDPOINT 6: Guardar Suscripción (desde PWA)
// ============================================
router.post('/auth/subscribe-push', async (req, res) => {
  try {
    const { userId } = req.body;
    const subscription = JSON.stringify(req.body.subscription);

    // Guardar en BD
    await User.findByIdAndUpdate(userId, {
      pushSubscription: subscription
    });

    console.log(`✅ Suscripción guardada para usuario ${userId}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// ============================================
// EJEMPLO DE USO DESDE LA WEBAPP ADMIN
// ============================================

/*
// En tu componente React/Vue de la WebApp Admin:

async function publishComunicado(comunicado) {
  try {
    // Primero guardar el comunicado
    const response = await fetch('/api/comunicados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comunicado)
    });

    const saved = await response.json();

    // Luego notificar a los usuarios
    await fetch('/api/notifications/send-comunicado-masivo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comunicadoId: saved.id,
        titulo: comunicado.titulo,
        resumen: comunicado.resumen,
        userIds: [] // Vacío = todos los usuarios
      })
    });

    alert('✅ Comunicado publicado y notificaciones enviadas');
  } catch (error) {
    console.error('❌ Error:', error);
    alert('Error al publicar');
  }
}

// Uso:
publishComunicado({
  titulo: 'Revisión de Presupuesto',
  resumen: 'Se realizará revisión del presupuesto 2026',
  contenido: '...'
});
*/

// ============================================
// MAPEO DE TIPOS Y RUTAS
// ============================================

/*
Usar este mapeo en tu app para routing contextualizado:

TIPO              RUTA                    EJEMPLO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
comunicado        /comunicados/:id         /comunicados/comm-001
porteria          /porteria               /porteria
documento         /documentos/:id         /documentos/doc-001
reglamento        /documentos/:id         /documentos/reg-001
evento            /eventos/:id            /eventos/evt-001
acta              /actas/:id              /actas/act-001
reserva           /reservas/:id           /reservas/rsv-001
mantenimiento     /mantenimiento/:id      /mantenimiento/mnt-001
factura           /facturas/:id           /facturas/fct-001
encuesta          /encuestas/:id          /encuestas/enq-001
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Los 'type' y 'id' que envíes en el payload deben coincidir.
*/
