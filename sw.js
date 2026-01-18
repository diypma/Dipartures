const CACHE_NAME = 'tube-wait-v2';

// Only cache core distinct files that don't change names often
const STATIC_ASSETS = [
    '/tube-wait-time/',
    '/tube-wait-time/index.html',
    '/tube-wait-time/manifest.webmanifest',
    '/tube-wait-time/icon-512.png',
    '/tube-wait-time/vite.svg'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force new SW to activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    // Clean up old caches
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of all clients immediately
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return cached response if found
            if (cachedResponse) {
                return cachedResponse;
            }

            // Otherwise fetch from network
            return fetch(event.request).then((response) => {
                // Check if valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Cache the new resource (dynamic caching for hashed assets)
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    // Don't cache API calls or other external stuff if possible, 
                    // but for simplicity we cache everything from same origin
                    if (event.request.url.startsWith(self.location.origin)) {
                        cache.put(event.request, responseToCache);
                    }
                });

                return response;
            });
        }).catch(() => {
            // Offline fallback? We can just return nothing or a fallback page.
            // For now, let it fail if offline and not in cache.
        })
    );
});
