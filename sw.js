// Minimal Service Worker (no offline caching)
// Purpose: satisfy PWA installability without changing network behavior

self.addEventListener('install', (event) => {
  // Activate immediately on first install
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of uncontrolled clients ASAP
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch handler (no caching, no offline)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Bypass HTTP cache for GET to avoid aggressive caching
  if (req.method === 'GET') {
    const noStoreReq = new Request(req, { cache: 'no-store' });
    event.respondWith(fetch(noStoreReq));
    return;
  }
  // Non-GET: pass-through untouched
  event.respondWith(fetch(req));
});
