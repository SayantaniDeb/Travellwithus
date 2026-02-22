// Service Worker for Travel With Us PWA
// UPDATE THIS VERSION NUMBER TO FORCE CACHE CLEAR ON DEPLOYMENT
const APP_VERSION = 'v3.0.0';
const CACHE_NAME = `travel-with-us-${APP_VERSION}`;
const STATIC_CACHE = `travel-static-${APP_VERSION}`;
const DYNAMIC_CACHE = `travel-dynamic-${APP_VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/site.webmanifest',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/favicon-16x16.png',
  '/favicon-32x32.png'
];

// Install Service Worker - skip waiting to activate immediately
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing version ${APP_VERSION}`);
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)),
      caches.open(CACHE_NAME)
    ]).then(() => self.skipWaiting())
  );
});

// Activate event - clean up ALL old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating version ${APP_VERSION}`);
  event.waitUntil(
    Promise.all([
      // Delete ALL caches that don't match current version
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheName.includes(APP_VERSION)) {
              console.log(`[SW] Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      // Notify all clients to reload
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'CACHE_UPDATED', version: APP_VERSION }));
      });
    })
  );
});

// Fetch event - implement cache-first for static assets, network-first for dynamic content
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // Handle different types of requests
  if (request.method !== 'GET') return;

  // Cache-first strategy for static assets
  if (STATIC_ASSETS.includes(url.pathname) ||
      url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.includes('.css') ||
      url.pathname.includes('.js') ||
      url.pathname.includes('.png') ||
      url.pathname.includes('.jpg') ||
      url.pathname.includes('.svg') ||
      url.pathname.includes('.gif')) {
    event.respondWith(cacheFirst(request));
  }
  // Network-first strategy for API calls and dynamic content
  else if (url.pathname.startsWith('/api/') ||
           url.pathname.includes('firestore.googleapis.com') ||
           url.pathname.includes('firebase')) {
    event.respondWith(networkFirst(request));
  }
  // Stale-while-revalidate for HTML pages
  else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Cache-first strategy
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline fallback if available
    return caches.match('/offline.html') || new Response('Offline', { status: 503 });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}