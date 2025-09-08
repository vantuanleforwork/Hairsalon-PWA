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

// Allow page to request immediate activation of a waiting SW
self.addEventListener('message', (event) => {
  try {
    if (event && event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  } catch (_) {}
});

// Pass-through fetch handler (no caching, no offline)
// Only handle navigations/HTML to keep index fresh; allow normal caching for others
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const accept = req.headers.get('accept') || '';
  const isHtmlNavigation = req.mode === 'navigate' || req.destination === 'document' || accept.includes('text/html');

  if (isHtmlNavigation) {
    // Force fresh fetch for HTML documents (e.g., index.html)
    const noStoreReq = new Request(req, { cache: 'no-store' });
    event.respondWith(fetch(noStoreReq));
    return;
  }
  // For non-HTML requests, do not interfere (use browser defaults)
  // Intentionally no event.respondWith here
});
