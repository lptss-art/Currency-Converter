const CACHE_NAME = 'currency-converter-v7';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'sortable.min.js',
  'manifest.json',
  'icon-192x192.png',
  'icon-512x512.png',
  'icon-maskable-512x512.png'
];

// Install event: cache all assets safely with Promise.allSettled
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.allSettled(
        ASSETS_TO_CACHE.map(async url => {
          try {
            await cache.add(url);
          } catch (e) {
            console.warn('Cache add warning for:', url, e);
          }
        })
      );
    })
  );
  self.skipWaiting();
});

// Activate event: clean up all old cache versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch event:
// Bulletproof offline-first engine that never returns undefined to event.respondWith
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Never intercept or cache the live exchange rate API
  if (event.request.url.includes('open.er-api.com')) {
    return;
  }

  event.respondWith(
    (async () => {
      // 1. Try matching the exact request in cache
      const cached = await caches.match(event.request, { ignoreSearch: true });
      if (cached) {
        // Fetch new version in background (non-blocking)
        fetch(event.request).then(resp => {
          if (resp && resp.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, resp));
          }
        }).catch(() => {});
        return cached;
      }

      // 2. If it is a navigation request (app launch or page visit), serve cached index.html immediately
      if (event.request.mode === 'navigate') {
        const cachedHtml = await caches.match('index.html', { ignoreSearch: true })
                        || await caches.match('./index.html', { ignoreSearch: true })
                        || await caches.match('./', { ignoreSearch: true });
        if (cachedHtml) return cachedHtml;
      }

      // 3. Try network request
      try {
        const netResp = await fetch(event.request);
        if (netResp && netResp.status === 200) {
          const clone = netResp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return netResp;
      } catch (err) {
        // 4. If network fails and it's a navigation request, guaranteed fallback to cached index.html
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('index.html', { ignoreSearch: true })
                         || await caches.match('./index.html', { ignoreSearch: true })
                         || await caches.match('./', { ignoreSearch: true });
          if (fallback) return fallback;
        }

        // Return a valid Response instead of undefined to prevent Chrome 'ERR_FAILED'
        return new Response('Mode hors-ligne', { 
          status: 200, 
          headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
        });
      }
    })()
  );
});
