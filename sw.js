const CACHE_NAME = 'currency-converter-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './sortable.min.js',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  './icon-maskable-512x512.png'
];

// Install event: pre-cache all core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event: clean up outdated caches
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
  self.clients.claim();
});

// Fetch event:
// Strategy: Cache-First with Stale-While-Revalidate for app assets.
// This guarantees INSTANT (0ms) launch, even with poor or flaky Internet ("Lie-Fi").
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Never cache or intercept live exchange rate API calls via SW (handled in app.js with localStorage & timeout)
  if (event.request.url.includes('open.er-api.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. If in cache, return immediately (zero wait time for user)
      if (cachedResponse) {
        // Fetch new version in background to update cache for next launch (non-blocking)
        fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Ignore network errors in background update
          });

        return cachedResponse;
      }

      // 2. If not in cache (very first visit without install), fetch from network
      return fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback if network totally fails
          return caches.match('./index.html');
        });
    })
  );
});
