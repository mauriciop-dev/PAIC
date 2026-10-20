// apps/usuarios/public/sw.js - VERSIÓN CORREGIDA (sin localStorage)
const CACHE = 'paic-usuarios-v12';

// No usamos localStorage en service workers - usamos comunicación con la app
// Mantendremos el mapeo para referencia, pero no para almacenamiento persistente
const TYPE_TO_STORAGE_KEY = {
  // Notification types (from backend)
  comunicado: 'paic_badge_comunicado',
  reserva: 'paic_badge_reserva',
  paquete: 'paic_badge_paquete',
  visita: 'paic_badge_visita',
  porteria: 'paic_badge_paquete',
  pqr: 'paic_badge_pqr',
  documento: 'paic_badge_documento',
  directorio: 'paic_badge_directorio',
  contacto: 'paic_badge_directorio',
  solicitud: 'paic_badge_solicitud',
  default: 'paic_badge_default',
  test: 'paic_badge_test',
  // App tab IDs (from clearBadge messages)
  comunicados: 'paic_badge_comunicado',
  reservas: 'paic_badge_reserva',
  paquetes: 'paic_badge_paquete',
  visitantes: 'paic_badge_visita',
  pqrs: 'paic_badge_pqr',
  documentos: 'paic_badge_documento',
  directorio: 'paic_badge_directorio',
  perfil: 'paic_badge_solicitud',
  inicio: 'paic_badge_test',
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(['/', '/manifest.json', '/logo-paic.png', '/badge-paic.png'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (event.request.mode === 'navigate') {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push recibido:', event);

  const data = event.data
    ? event.data.json()
    : {
        title: 'PAIC Residentes',
        body: 'Tienes una nueva actualización.',
        type: 'default',
        id: 'default',
        url: '/'
      };

  console.log('[ServiceWorker] Push data URL:', data.url);

  // Use mapping for badge storage key (solo para referencia)
  const pushType = data.type || 'default';
  const badgeKey = TYPE_TO_STORAGE_KEY[pushType] || TYPE_TO_STORAGE_KEY.default;

  const payload = {
    title: data.title || 'PAIC Residentes',
    body: data.body || '',
    // Use transparent logo for notification icon, fallback to logo-paic.png
    icon: data.icon || '/logo-paic.png',
    // Use bell icon for notification badge (monochrome)
    badge: data.badge || '/badge-paic.png',
    tag: pushType,
    requireInteraction: true,
    data: {
      url: data.url || '/',
      type: pushType,
      id: data.id || 'default',
      timestamp: data.timestamp || new Date().toISOString()
    },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  console.log('[ServiceWorker] Mostrando notificación:', JSON.stringify(payload));

  event.waitUntil(
    self.registration.showNotification(payload.title, payload)
  );

  // Notify app to update badge - enviamos un mensaje para que la app actualice su estado
  // La aplicación será responsable de mantener el estado correcto de los badges
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'PUSH_RECEIVED',
        payload: { 
          type: pushType, 
          title: data.title, 
          body: data.body,
          badgeKey: badgeKey // Para que la app sepa qué tipo de badge actualizar
        }
      });
    });
  });
});

self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notificación clickeada:', event);
  console.log('[ServiceWorker] event.action:', event.action);
  console.log('[ServiceWorker] event.notification.data:', event.notification.data);

  event.notification.close();

  // Handle action button clicks (open/close)
  if (event.action) {
    console.log('[ServiceWorker] Action button clicked:', event.action);
    if (event.action === 'close') {
      return;
    }
    // For 'open' action, fall through to navigation
  }

  // NOTIFICACIÓN: En lugar de siempre abrir la principal, intentamos navegar a la URL específica
  const targetUrl = data.data?.url || self.location.origin + '/';
  console.log('[ServiceWorker] Abriendo URL:', targetUrl);

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true
      })
      .then((clients) => {
        const existing = clients.find(
          (client) => client.url.startsWith(self.location.origin) && 'focus' in client
        );

        if (existing) {
          console.log('[ServiceWorker] Enfocando ventana existente');
          existing.focus();
          // Enviar mensaje para navegar a la URL específica
          existing.postMessage({
            type: 'NAVIGATE_TO',
            url: targetUrl
          });
          return existing;
        }

        console.log('[ServiceWorker] Abriendo nueva ventana');
        return self.clients.openWindow(targetUrl);
      })
  );
});

self.addEventListener('notificationaction', (event) => {
  console.log('[ServiceWorker] Acción en notificación:', event.action);

  if (event.action === 'close') {
    event.notification.close();
    return;
  }

  if (event.action === 'open') {
    // NOTIFICACIÓN: Navegar a la URL específica en lugar de siempre al principal
    const targetUrl = data.data?.url || self.location.origin + '/';
    console.log('[ServiceWorker] Action open -> URL específica:', targetUrl);

    event.waitUntil(
      self.clients
        .matchAll({ type: 'window' })
        .then((clients) => {
          for (let client of clients) {
            if ('focus' in client && client.url.startsWith(self.location.origin)) {
              return client.focus();
            }
          }
          return self.clients.openWindow(targetUrl);
        })
    );
  }
});

self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Mensaje recibido:', event.data);

  if (event.data && event.data.type === 'navigate') {
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({
          type: 'navigate',
          url: event.data.url
        });
      });
    });
  }

  // NOTIFICACIÓN: Ya no procesamos clearBadge aquí porque no usamos localStorage
  // El manejo de badges ahora lo hace la aplicación mediante comunicación con Supabase
  // El service worker solo actúa como mensajero entre push notifications y la app
});

console.log('[ServiceWorker] ✅ Service Worker iniciado correctamente (sin localStorage)');