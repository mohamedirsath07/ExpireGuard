// Increment this version number when deploying updates
const CACHE_VERSION = 4;
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
    // Skip waiting to activate immediately
    self.skipWaiting();
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

// Fetch event - network first, then cache (skip API requests)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Don't cache or intercept API requests - let them go directly to the network
    // This prevents CORS issues and allows proper error handling in the app
    if (url.hostname.includes('onrender.com') || 
        url.hostname.includes('render.com') ||
        url.pathname.startsWith('/auth/') ||
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/ocr/') ||
        url.pathname.startsWith('/items/') ||
        url.pathname.startsWith('/user/')) {
        return; // Don't intercept - let browser handle it normally
    }
    
    // Only handle same-origin requests and static assets
    if (url.origin === self.location.origin) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Return the response
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(event.request).then(cachedResponse => {
                        // Return cached response or a fallback
                        return cachedResponse || new Response('Offline', { 
                            status: 503, 
                            statusText: 'Service Unavailable' 
                        });
                    });
                })
        );
    }
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
