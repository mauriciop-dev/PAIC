// apps/usuarios/public/sw.js - VERSIÓN MEJORADA
const CACHE = 'paic-usuarios-v12';

// Mapping: backend notification type -> localStorage key
// Also includes app tab IDs for clearBadge messages
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

  // Use mapping for badge storage key
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

  // Update badge in localStorage for persistence using correct mapping
  const currentBadge = parseInt(self.localStorage.getItem(badgeKey) || '0', 10);
  self.localStorage.setItem(badgeKey, String(currentBadge + 1));
  console.log('[ServiceWorker] Badge incremented for', pushType, '->', badgeKey, ':', currentBadge + 1);

  // Notify app to update badge
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'push',
        payload: { type: pushType, title: data.title, body: data.body }
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

  // SIMPLE: Always open main app URL - avoids deep link issues
  const targetUrl = self.location.origin + '/';
  console.log('[ServiceWorker] Abriendo app principal:', targetUrl);

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
          return existing.focus();
        }

        console.log('[ServiceWorker] Abriendo app principal');
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
    // SIMPLE: Always open main app URL
    const targetUrl = self.location.origin + '/';
    console.log('[ServiceWorker] Action open -> app principal:', targetUrl);

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

  // Clear badge for a type when user views that tab
  if (event.data && event.data.type === 'clearBadge' && event.data.badgeType) {
    const badgeKey = TYPE_TO_STORAGE_KEY[event.data.badgeType] || 'paic_badge_' + event.data.badgeType;
    self.localStorage.removeItem(badgeKey);
    console.log('[ServiceWorker] Badge cleared for:', event.data.badgeType, '->', badgeKey);
  }
});

console.log('[ServiceWorker] ✅ Service Worker iniciado correctamente');