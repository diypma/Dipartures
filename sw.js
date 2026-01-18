const CACHE_NAME = 'tube-wait-v1';
const ASSETS = [
    '/tube-wait-time/',
    '/tube-wait-time/index.html',
    '/tube-wait-time/manifest.webmanifest',
    '/tube-wait-time/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
