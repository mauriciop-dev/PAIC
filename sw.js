// PAIC — Service Worker básico para PWA push
// Copiar en public/sw.js

const CACHE_NAME = 'paic-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install: cachear recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate: limpiar caches viejos
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

// Fetch: servir desde cache o red
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) return response;
        return fetch(event.request);
      })
  );
});

// Push: recibir notificaciones del servidor
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { titulo: 'PAIC', cuerpo: 'Nueva notificación' };

  event.waitUntil(
    self.registration.showNotification(data.titulo, {
      body: data.cuerpo,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
    })
  );
});

// Click: abrir URL específica
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    }).then((clientList) => {
      // Si ya está abierto, enfocarlo
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abrir nueva ventana
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});