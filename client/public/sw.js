// Increment this version number when deploying updates
const CACHE_VERSION = 2;
const CACHE_NAME = `expireguard-v${CACHE_VERSION}`;
const urlsToCache = [
    '/',
    '/index.html',
    '/icon-192.png',
    '/icon-512.png'
];

// Install event
self.addEventListener('install', (event) => {
    console.log(`[SW] Installing version ${CACHE_VERSION}`);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
    // Don't skip waiting automatically - let user decide when to update
});

// Listen for skip waiting message from the app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] Skip waiting triggered by user');
        self.skipWaiting();
    }
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log(`[SW] Activating version ${CACHE_VERSION}`);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log(`[SW] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Notify all clients that a new version is active
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
                });
            });
        })
    );
    self.clients.claim();
});

// Fetch event - network first, then cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .catch(() => caches.match(event.request))
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    // Open the app when notification is clicked
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

// Handle push events (for future server-side push)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();

    const options = {
        body: data.body || 'Check your expiring products',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'expireguard-push',
        requireInteraction: true,
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'view', title: 'View Products' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'ExpireGuard', options)
    );
});
