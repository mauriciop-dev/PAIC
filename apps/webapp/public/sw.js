/**
 * PAIC PWA Service Worker - Versión limpia y robusta
 */

const CACHE_NAME = 'paic-pwa-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/badge-72x72.png'
];

// Instalar
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activar - limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - cache first, then network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) return response;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      }).catch(() => caches.match(event.request))
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'PAIC',
    body: 'Nueva notificación',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: {}
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    data: {
      url: data.data?.url || '/',
      notificationId: data.data?.notificationId,
      ...data.data
    },
    actions: [
      { action: 'view', title: 'Ver', icon: '/icon-192x192.png' },
      { action: 'close', title: 'Cerrar', icon: '/icon-192x192.png' }
    ],
    requireInteraction: false,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  // Clear badge
  if ('setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(0).catch(() => {});
  }

  if (action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'NAVIGATE', url: data.url || '/' });
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(data.url || '/');
        }
      })
  );
});

// Notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.data);
});

// Messages from client
self.addEventListener('message', (event) => {
  if (!event.data) return;
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'UPDATE_BADGE') {
    if ('setAppBadge' in self.navigator) {
      self.navigator.setAppBadge(event.data.count || 0).catch(() => {});
    }
  }

  if (event.data.type === 'CLEAR_BADGE') {
    if ('setAppBadge' in self.navigator) {
      self.navigator.setAppBadge(0).catch(() => {});
    }
  }
});

console.log('[SW] Service Worker v3 iniciado correctamente');