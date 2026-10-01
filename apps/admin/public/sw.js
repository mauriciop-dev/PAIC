// PAIC Admin - Service Worker for Push Notifications
// Version: 1.0.0

const CACHE_NAME = 'paic-admin-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Supabase/auth requests
  if (event.request.url.includes('supabase.co') || event.request.url.includes('auth')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // Network first
      return fetch(event.request).then((networkResponse) => {
        // Cache successful responses
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW] Push received but no data');
    return;
  }

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: 'PAIC Admin',
      body: event.data.text(),
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
    };
  }

  const options = {
    body: notificationData.body || 'Nueva notificación de PAIC Admin',
    icon: notificationData.icon || '/icons/icon-192.png',
    badge: notificationData.badge || '/icons/badge-72.png',
    vibrate: notificationData.vibrate || [200, 100, 200],
    data: notificationData.data || {},
    actions: notificationData.actions || [
      { action: 'view', title: 'Ver' },
      { action: 'dismiss', title: 'Descartar' },
    ],
    requireInteraction: notificationData.requireInteraction || true,
    tag: notificationData.tag || 'paic-admin-notification',
    renotify: true,
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title || 'PAIC Admin', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  if (action === 'dismiss') {
    return;
  }

  // Default action: open the app
  const urlToOpen = notificationData.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Navigate existing window
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: notificationData,
            url: urlToOpen,
          });
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(urlToOpen);
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Message event - communicate with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SUBSCRIBE_PUSH') {
    // Handle subscription from main thread
    subscribeToPush(event.data.subscription).then((success) => {
      event.ports[0].postMessage({ success });
    });
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function subscribeToPush(subscription) {
  try {
    // Send subscription to server
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
    return response.ok;
  } catch (e) {
    console.error('[SW] Failed to subscribe:', e);
    return false;
  }
}

async function syncNotifications() {
  // Sync any pending notifications when back online
  console.log('[SW] Syncing notifications...');
}