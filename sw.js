const CACHE_NAME = 'currency-converter-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
];

// Install event: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tell the active service worker to take control of the page immediately.
  self.clients.claim();
});

// Fetch event: Network first, fallback to cache
// We use Network First to get latest updates if online,
// and fallback to cache to allow offline usage.
self.addEventListener('fetch', event => {
  // We only want to handle GET requests for caching strategy
  if (event.request.method !== 'GET') return;

  // Exclude API requests from SW cache (they are handled in app.js via localStorage)
  if (event.request.url.includes('api.frankfurter.app') || event.request.url.includes('open.er-api.com')) {
      return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response and store it in cache for next time
        // Accept basic (same-origin) and cors/opaque (CDN) for Tailwind
        if (response && (response.status === 200 || response.status === 0)) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails (offline mode)
        return caches.match(event.request);
      })
  );
});
