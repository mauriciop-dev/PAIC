const CACHE = 'paic-usuarios-v3';
self.addEventListener('install', (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(['/','/manifest.json','/logo-paic.png']))); self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then((response) => {
    if (event.request.mode === 'navigate') {
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request)));
});
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'PAIC Residentes', body: 'Tienes una nueva actualización.' };
  const payload = {
    title: data.title || 'PAIC Residentes',
    body: data.body || '',
    icon: data.icon || '/logo-paic.png',
    badge: data.badge || '/logo-paic.png',
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(payload.title, payload));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === targetUrl && 'focus' in client);
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    })
  );
});
