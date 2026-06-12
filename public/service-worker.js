// Service Worker for Sports Club App
const CACHE_NAME = 'smashers-club-v2';
const RUNTIME_CACHE = 'smashers-runtime-v2';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .catch((error) => {
        console.error('Cache install failed:', error);
      })
  );

  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
  );

  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip API calls and auth - always go to network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return;
  }

  const isDynamicAppRoute =
    request.mode === 'navigate' &&
    (url.pathname.startsWith('/dashboard') ||
      url.pathname.startsWith('/slots') ||
      url.pathname.startsWith('/bookings') ||
      url.pathname.startsWith('/matches') ||
      url.pathname.startsWith('/leaderboard') ||
      url.pathname.startsWith('/achievements') ||
      url.pathname.startsWith('/settings') ||
      url.pathname.startsWith('/subscription') ||
      url.pathname.startsWith('/admin'));

  // Dynamic app pages should be network-first to avoid stale ELO/booking/match data.
  if (isDynamicAppRoute) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseToCache));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          return new Response(
            '<h1>Offline</h1><p>Please check your internet connection.</p>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached response and update in background
          event.waitUntil(updateCache(request));
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone response and cache it
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Network failed, show offline page
            if (request.mode === 'navigate') {
              return caches.match('/offline.html') || new Response(
                '<h1>Offline</h1><p>Please check your internet connection.</p>',
                {
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            }
          });
      })
  );
});

// Helper to update cache in background
async function updateCache(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response);
    }
  } catch (error) {
    // Network failed, keep using cache
    console.log('Background update failed:', error);
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push notification received');

  let notificationData = {};

  try {
    notificationData = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('Error parsing push data:', error);
  }

  const title = notificationData.title || 'Smashers Club';
  const options = {
    body: notificationData.body || 'You have a new notification',
    icon: notificationData.icon || '/icons/icon.svg',
    badge: notificationData.badge || '/icons/icon.svg',
    tag: notificationData.tag || 'default',
    data: notificationData.data || {},
    actions: notificationData.actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // No window open, open new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync event (for offline actions)
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncBookings());
  }
});

async function syncBookings() {
  // Sync any pending booking actions when back online
  console.log('Syncing bookings...');
  // Implementation depends on your offline storage strategy
}

// Periodic sync (for regular updates)
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync triggered:', event.tag);

  if (event.tag === 'check-new-slots') {
    event.waitUntil(checkNewSlots());
  }
});

async function checkNewSlots() {
  // Check for new slots and notify user
  console.log('Checking for new slots...');
  // Implementation: fetch new slots and show notification if any
}
