const CACHE_NAME = 'dipartures-v1';

const STATIC_ASSETS = [
    '/Dipartures/',
    '/Dipartures/index.html',
    '/Dipartures/manifest.webmanifest',
    '/Dipartures/icon-512.png',
    '/Dipartures/vite.svg'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Use relative paths if possible, but hardcoded absolute paths are safer for now 
            // given the scope. If the fetch fails (likely 404 on local dev due to /Dipartures/ prefix), 
            // we log it but don't hard-fail the install.
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('Failed to cache core assets on install:', err);
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Skip TFL API calls - let the app handle those directly with its own retry/error logic
    if (event.request.url.includes('api.tfl.gov.uk')) {
        return;
    }

    // Navigation requests (HTML)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    return caches.match(event.request).then(response => {
                        return response || caches.match('/Dipartures/index.html');
                    });
                })
        );
        return;
    }

    // For everything else (assets, images), try cache first, then network
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request)
                .then((response) => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        if (event.request.url.startsWith(self.location.origin)) {
                            cache.put(event.request, responseToCache);
                        }
                    });
                    return response;
                })
                .catch(() => {
                    // Fallback for missing assets when offline - return null or a descriptive error
                    // Returning a simple 404-like response is better than letting the promise reject
                    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
                });
        })
    );
});
