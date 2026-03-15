/**
 * Downtime Pharmacy Label Generator
 * Service Worker
 */

// Cache name - update version when deploying changes
const CACHE_NAME = 'uk-pharmacy-labels-v2';

// Files to cache
const FILES_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './css/autocomplete.css',
  './js/app.js',
  './js/data-manager.js',
  './js/label-generator.js',
  './js/medication-manager.js',
  './js/shorthand-codes.js',
  './manifest.json',
  './images/nhs_trust_logo.png'
];

// Install event - cache all required resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        // Cache files individually to handle missing files gracefully
        return Promise.all(
          FILES_TO_CACHE.map(url => {
            return cache.add(url).catch(err => {
              console.warn('Failed to cache:', url, err);
              // Continue with other files even if one fails
              return Promise.resolve();
            });
          })
        );
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const currentCaches = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
      })
      .then(cachesToDelete => {
        return Promise.all(cachesToDelete.map(cacheToDelete => {
          return caches.delete(cacheToDelete);
        }));
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network-first strategy
// Always try the network first so code updates are picked up immediately.
// Falls back to cache when offline (the main PWA use case).
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    event.respondWith(new Response('Blocked', {status: 403}));
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Don't cache responses if they're not valid
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone the response since it can only be consumed once
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache (offline fallback)
        return caches.match(event.request);
      })
  );
});
