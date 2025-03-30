self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('v1').then((cache) => {
            return cache.addAll([
                './', // Use relative paths
                './index.html',
                './script.js',
                './image/push-pin_9071932.png',
                './crime_data.json',
                './manifest.json',
                'https://unpkg.com/leaflet/dist/leaflet.css', // Leaflet CSS
                'https://unpkg.com/leaflet/dist/leaflet.js', // Leaflet JS
                './leaflet.css', // Local fallback for Leaflet CSS
                './leaflet.js', // Local fallback for Leaflet JS
                'https://unpkg.com/leaflet/dist/leaflet.css', // Leaflet CSS
                'https://unpkg.com/leaflet/dist/leaflet.js', // Leaflet JS

            ]).catch((error) => {
                console.error('Failed to cache:', error);
            });
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            // Fallback for Leaflet resources
            if (event.request.url.includes('leaflet.css')) {
                return caches.match('./leaflet.css') || fetch(event.request);
            }
            if (event.request.url.includes('leaflet.js')) {
                return caches.match('./leaflet.js') || fetch(event.request);
            }
            return fetch(event.request).catch((error) => {
                console.error('Network fetch failed for:', event.request.url, error);
                return new Response('Offline content unavailable', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
});
