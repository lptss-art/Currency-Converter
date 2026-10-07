const CACHE_NAME = 'currency-converter-v8';
// NB : on ne met PAS 'index.html' ici. Cloudflare Pages redirige /index.html -> / (308).
// Une réponse "redirigée" servie à une navigation fait échouer le lancement de l'app installée
// ("Ce site est inaccessible"). On met donc en cache uniquement './'.
const ASSETS_TO_CACHE = [
  './',
  'style.css',
  'app.js',
  'sortable.min.js',
  'manifest.json',
  'icon-192x192.png',
  'icon-512x512.png',
  'icon-maskable-512x512.png'
];

// Recrée une réponse "propre" (sans le flag redirected) pour qu'elle soit acceptée par une navigation
async function cleanResponse(resp) {
  if (!resp || !resp.redirected) return resp;
  const body = await resp.blob();
  return new Response(body, { status: resp.status, statusText: resp.statusText, headers: resp.headers });
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(ASSETS_TO_CACHE.map(async url => {
        const resp = await fetch(url, { cache: 'reload' });
        if (resp.ok) await cache.put(url, await cleanResponse(resp));
      }))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.url.includes('open.er-api.com')) return;

  // Navigations (lancement de l'app, rechargement) : toujours servir la page d'accueil './'
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match('./');
      const network = fetch('./', { cache: 'no-store' }).then(async resp => {
        if (resp.ok) await cache.put('./', await cleanResponse(resp.clone()));
        return cleanResponse(resp);
      });
      if (cached) {
        network.catch(() => {});
        return cached;
      }
      try {
        return await network;
      } catch (e) {
        return new Response('Mode hors-ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  // Autres ressources : cache d'abord, mise à jour en arrière-plan
  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    const network = fetch(req).then(async resp => {
      if (resp && resp.ok && new URL(req.url).origin === self.location.origin) {
        const c = await caches.open(CACHE_NAME);
        await c.put(req, await cleanResponse(resp.clone()));
      }
      return resp;
    });
    if (cached) {
      network.catch(() => {});
      return cached;
    }
    try {
      return await network;
    } catch (e) {
      return new Response('', { status: 504 });
    }
  })());
});
