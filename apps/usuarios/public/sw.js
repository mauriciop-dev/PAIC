const CACHE = 'paic-usuarios-v1';
self.addEventListener('install', (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(['/','/manifest.json','/logo-paic.png']))); self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (event) => { if (event.request.method === 'GET') event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request))); });
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'PAIC Residentes', body: 'Tienes una nueva actualización.' };
  event.waitUntil(self.registration.showNotification(data.title || 'PAIC Residentes', { body: data.body || '', icon: data.icon || '/logo-paic.png', badge: data.badge || '/logo-paic.png', data: { url: data.url || '/' } }));
});
self.addEventListener('notificationclick', (event) => { event.notification.close(); event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => { const target = event.notification.data?.url || '/'; const existing = clients.find((client) => 'focus' in client); return existing ? existing.focus() : self.clients.openWindow(target); })); });
