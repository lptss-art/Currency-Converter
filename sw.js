const CACHE_NAME = 'currency-converter-v6';
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

// Activate event: clean up outdated caches immediately
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
// Bulletproof PWA Strategy for standalone apps (iOS/Android WebAPK/Chrome)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Never intercept or cache the live exchange rate API
  if (event.request.url.includes('open.er-api.com')) {
    return;
  }

  // 1. Navigation requests (launching PWA from home screen or browser navigation)
  // Always serve index.html instantly from cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html')
        .then(cachedIndex => {
          if (cachedIndex) return cachedIndex;
          return caches.match('./')
            .then(cachedRoot => cachedRoot || fetch(event.request));
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 2. Static assets: match with ignoreSearch (handles query params like ?v=...)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
      if (cachedResponse) {
        // Background revalidation
        fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {});

        return cachedResponse;
      }

      // If not in cache, fetch from network and cache
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for html
        return caches.match('./index.html');
      });
    })
  );
});
