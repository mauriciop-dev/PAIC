/**
 * Service Worker mejorado para PAIC PWA
 * Maneja caché, push notifications y badges
 */

const CACHE_NAME = 'paic-pwa-v2';
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

// Activar
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

// Fetch
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          // No almacenamos respuestas que no sean exitosas ni opcionales
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response for cache
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      }).catch(() => {
        // Fallback básico
        return caches.match(event.request);
      })
  );
});

// Recibir notificaciones push
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
      {
        action: 'view',
        title: 'Ver',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icon-192x192.png'
      }
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

  // Actualizar badge a 0 cuando se abre la notificación
  if ('setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(0);
  }

  // Manejar acciones
  if (action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if (client.url.includes(self.origin) && 'focus' in client) {
          client.focus();
          // Enviar mensaje para navegar a la URL específica
          client.postMessage({
            type: 'NAVIGATE',
            url: data.url || '/'
          });
          return;
        }
      }
      
      // Si no hay ventanas abiertas, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(data.url || '/');
      }
    })
  );
});

// Cerrar notificación
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.data);
});

// Mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'UPDATE_BADGE') {
    if ('setAppBadge' in self.navigator) {
      self.navigator.setAppBadge(event.data.count || 0);
    }
  }

  if (event.data && event.data.type === 'CLEAR_BADGE') {
    if ('setAppBadge' in self.navigator) {
      self.navigator.setAppBadge(0);
    }
  }
});
