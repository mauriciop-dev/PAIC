// apps/usuarios/public/sw.js - VERSIÓN MEJORADA
const CACHE = 'paic-usuarios-v4'; // Cambiar versión para invalidar cache

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(['/', '/manifest.json', '/logo-paic.png'])
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

// ============================================
// EVENT: PUSH - Recibir notificación
// ============================================
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push recibido:', event);

  // Parsear datos con fallback
  const data = event.data
    ? event.data.json()
    : {
        title: 'PAIC Residentes',
        body: 'Tienes una nueva actualización.',
        type: 'default',
        id: 'default',
        url: '/'
      };

  // Construir payload COMPLETO
  const payload = {
    title: data.title || 'PAIC Residentes',
    body: data.body || '',
    icon: data.icon || '/logo-paic.png',
    badge: data.badge || '/logo-paic.png',
    tag: data.type || 'default', // Agrupa notificaciones por tipo
    requireInteraction: true, // Fuerza interacción del usuario
    data: {
      url: data.url || '/',
      type: data.type || 'default', // comunicado, porteria, documento, reglamento, etc.
      id: data.id || 'default', // ID del recurso
      timestamp: data.timestamp || new Date().toISOString()
    },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  console.log('[ServiceWorker] Mostrando notificación:', payload);

  event.waitUntil(
    self.registration.showNotification(payload.title, payload)
  );
});

// ============================================
// EVENT: NOTIFICATIONCLICK - Clic en notificación
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notificación clickeada:', event);

  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || '/';

  console.log('[ServiceWorker] Navegando a:', targetUrl);

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true
      })
      .then((clients) => {
        // Buscar una ventana existente con esa URL
        const existing = clients.find(
          (client) => client.url.includes(targetUrl) && 'focus' in client
        );

        if (existing) {
          console.log('[ServiceWorker] Enfocando ventana existente');
          return existing.focus();
        }

        // Si no existe ventana, abrir nueva
        console.log('[ServiceWorker] Abriendo ventana nueva');
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ============================================
// EVENT: NOTIFICATIONACTION - Acciones en notificación
// ============================================
self.addEventListener('notificationaction', (event) => {
  console.log('[ServiceWorker] Acción en notificación:', event.action);

  if (event.action === 'close') {
    event.notification.close();
    return;
  }

  if (event.action === 'open') {
    const data = event.notification.data || {};
    const targetUrl = data.url || '/';

    event.waitUntil(
      self.clients
        .matchAll({ type: 'window' })
        .then((clients) => {
          for (let client of clients) {
            if ('focus' in client) {
              return client.focus();
            }
          }
          return self.clients.openWindow(targetUrl);
        })
    );
  }
});

// ============================================
// EVENT: MESSAGE - Comunicación desde app
// ============================================
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
});

console.log('[ServiceWorker] ✅ Service Worker iniciado correctamente');
