// apps/usuarios/public/sw.js - VERSIÓN MEJORADA
const CACHE = 'paic-usuarios-v11';

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

  const payload = {
    title: data.title || 'PAIC Residentes',
    body: data.body || '',
    icon: data.icon || '/logo-paic.png',
    badge: data.badge || '/badge-paic.png',
    tag: data.type || 'default',
    requireInteraction: true,
    data: {
      url: data.url || '/',
      type: data.type || 'default',
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

  // Update badge in localStorage for persistence
  const type = data.type || 'default';
  const badgeKey = 'paic_badge_' + type;
  const currentBadge = parseInt(self.localStorage.getItem(badgeKey) || '0', 10);
  self.localStorage.setItem(badgeKey, String(currentBadge + 1));
  console.log('[ServiceWorker] Badge incremented for', type, ':', currentBadge + 1);

  // Notify app to update badge
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'push',
        payload: { type: data.type || 'default', title: data.title, body: data.body }
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
    self.localStorage.removeItem('paic_badge_' + event.data.badgeType);
    console.log('[ServiceWorker] Badge cleared for:', event.data.badgeType);
  }
});

console.log('[ServiceWorker] ✅ Service Worker iniciado correctamente');