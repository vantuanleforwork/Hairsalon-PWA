// Hair Salon Order Management - Service Worker
// Version: 1.0.0
// Capabilities: Caching, Offline sync, Background sync

const CACHE_VERSION = '1.0.0';
const CACHE_PREFIX = 'salon-orders';
const STATIC_CACHE = `${CACHE_PREFIX}-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `${CACHE_PREFIX}-dynamic-v${CACHE_VERSION}`;
const API_CACHE = `${CACHE_PREFIX}-api-v${CACHE_VERSION}`;
const IMAGES_CACHE = `${CACHE_PREFIX}-images-v${CACHE_VERSION}`;

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/css/tailwind.css',
  '/js/main.js',
  '/js/config.js',
  
  // Core modules
  '/js/core/utils.js',
  '/js/core/validation.js',
  '/js/core/eventBus.js',
  '/js/core/stateManager.js',
  
  // Services
  '/js/services/api.service.js',
  '/js/services/order.service.js',
  '/js/services/stats.service.js',
  '/js/services/notification.service.js',
  '/js/services/auth.service.js',
  '/js/services/storage.service.js',
  
  // Fonts
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
  
  // Icons
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png',
  
  // Offline fallback
  '/offline.html'
];

// API endpoints patterns
const API_PATTERNS = [
  /^https:\/\/api\.example\.com\/orders/,
  /^https:\/\/api\.example\.com\/stats/,
  /^https:\/\/api\.example\.com\/auth/,
  /^https:\/\/accounts\.google\.com\/oauth/
];

// Image patterns
const IMAGE_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
  /^https:\/\/.*\.googleapis\.com.*\.(?:png|jpg|jpeg|svg|gif|webp|avif)/
];

// === SERVICE WORKER LIFECYCLE ===

// Install Event - Cache static resources
self.addEventListener('install', event => {
  console.log('Service Worker: Installing v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(DYNAMIC_CACHE),
      caches.open(API_CACHE),
      caches.open(IMAGES_CACHE)
    ]).then(() => {
      console.log('Service Worker: Install completed');
      return self.skipWaiting();
    }).catch(error => {
      console.error('Service Worker: Install failed:', error);
    })
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating v' + CACHE_VERSION);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith(CACHE_PREFIX) && 
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== API_CACHE &&
              cacheName !== IMAGES_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation completed');
      return self.clients.claim();
    })
  );
});

// === FETCH HANDLING ===

self.addEventListener('fetch', event => {
  const { request } = event;
  const { url, method } = request;
  
  // Skip non-GET requests for caching
  if (method !== 'GET') {
    // Handle POST/PUT/DELETE for offline sync
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      return handleOfflineSync(event);
    }
    return;
  }
  
  // Determine cache strategy based on request type
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isApiRequest(url)) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
  } else if (isImageRequest(url)) {
    event.respondWith(cacheFirst(request, IMAGES_CACHE));
  } else {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  }
});

// === CACHING STRATEGIES ===

// Cache First - Good for static assets
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache First failed:', error);
    
    // Return offline fallback for navigation requests
    if (request.destination === 'document') {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match('/offline.html');
    }
    
    throw error;
  }
}

// Network First with Cache Fallback - Good for API calls
async function networkFirstWithCache(request, cacheName, timeout = 5000) {
  try {
    const cache = await caches.open(cacheName);
    
    // Try network with timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      )
    ]);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    console.warn('Network failed, trying cache:', error);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return empty response for failed API calls
    if (isApiRequest(request.url)) {
      return new Response(JSON.stringify({
        error: 'Offline - Data unavailable',
        offline: true,
        timestamp: Date.now()
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    }
    
    throw error;
  }
}

// Stale While Revalidate - Good for dynamic content
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch in background to update cache
  const networkResponsePromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(error => {
    console.warn('Background fetch failed:', error);
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network if no cache
  return networkResponsePromise;
}

// === OFFLINE SYNC HANDLING ===

function handleOfflineSync(event) {
  const { request } = event;
  
  event.respondWith(
    fetch(request.clone()).catch(async () => {
      // Store failed request for later sync
      await storeFailedRequest(request);
      
      return new Response(JSON.stringify({
        success: false,
        offline: true,
        message: 'Request queued for sync',
        timestamp: Date.now()
      }), {
        status: 202,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    })
  );
  
  // Register for background sync if available
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    event.waitUntil(
      self.registration.sync.register('background-sync')
    );
  }
}

async function storeFailedRequest(request) {
  try {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now()
    };
    
    // Store in IndexedDB via message to main thread
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'STORE_OFFLINE_REQUEST',
          data: requestData
        });
      });
    });
    
  } catch (error) {
    console.error('Failed to store offline request:', error);
  }
}

// === BACKGROUND SYNC ===

self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineRequests());
  }
});

async function syncOfflineRequests() {
  try {
    // Request offline data from main thread
    const clients = await self.clients.matchAll();
    
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_OFFLINE_REQUESTS'
      });
    });
    
    console.log('Service Worker: Offline sync completed');
    
  } catch (error) {
    console.error('Service Worker: Offline sync failed:', error);
  }
}

// === PUSH NOTIFICATIONS ===

self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'Đơn hàng mới đã được tạo!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'salon-order',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'Xem đơn',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Bỏ qua',
        icon: '/icons/action-dismiss.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.message || options.body;
    options.data = data;
  }
  
  event.waitUntil(
    self.registration.showNotification('Salon Orders', options)
  );
});

self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/?notification=order')
    );
  }
});

// === MESSAGE HANDLING ===

self.addEventListener('message', event => {
  const { data } = event;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({
        version: CACHE_VERSION
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'CACHE_URLS':
      cacheUrls(data.urls).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
  }
});

// === HELPER FUNCTIONS ===

function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.includes(asset)) ||
         url.includes('/css/') ||
         url.includes('/js/') ||
         url.includes('/fonts/') ||
         url.includes('fonts.googleapis.com') ||
         url.includes('fonts.gstatic.com');
}

function isApiRequest(url) {
  return API_PATTERNS.some(pattern => pattern.test(url));
}

function isImageRequest(url) {
  return IMAGE_PATTERNS.some(pattern => pattern.test(url));
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => {
      if (cacheName.startsWith(CACHE_PREFIX)) {
        return caches.delete(cacheName);
      }
    })
  );
}

async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  return Promise.all(
    urls.map(url => {
      return fetch(url).then(response => {
        if (response.ok) {
          return cache.put(url, response);
        }
      }).catch(error => {
        console.warn('Failed to cache URL:', url, error);
      });
    })
  );
}

// === ERROR HANDLING ===

self.addEventListener('error', event => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('Service Worker unhandled rejection:', event.reason);
});

console.log('Service Worker: Initialized v' + CACHE_VERSION);
