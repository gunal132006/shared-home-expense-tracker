import { precacheAndRoute } from 'workbox-precaching';

// Precache everything injected by Vite
precacheAndRoute(self.__WB_MANIFEST);

// Ensure all financial API calls always bypass Service Worker caching completely
self.addEventListener('fetch', function (event) {
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
  }
});

self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
      },
    };
    event.waitUntil(
      Promise.all([
        self.registration.showNotification(data.title, options),
        // Instantly notify any active foreground/background clients to revalidate
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
          clientList.forEach(function (client) {
            client.postMessage({ type: 'REFRESH_EXPENSES' });
          });
        })
      ])
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'REFRESH_EXPENSES' });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
