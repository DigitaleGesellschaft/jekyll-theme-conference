const BASE_URL = "{{ site.baseurl }}";
const VERSION = "{{ site.time | date: '%Y%m%d%H%M%S' }}";
const CACHE_NAME = `jekyll-conference-theme-${VERSION}`;

// Resources will be loaded from site.json at runtime
let APP_STATIC_RESOURCES = [];

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    fetch(BASE_URL + "/assets/js/site.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load site.json: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        // Combine pages and assets from site.json, excluding the service worker itself
        APP_STATIC_RESOURCES = [
          ...(data.pages || []),
          ...(data.assets || []),
        ].filter((url) => !url.includes("/sw.js"));

        return caches.open(CACHE_NAME).then((cache) => {
          return cache.addAll(APP_STATIC_RESOURCES);
        });
      })
      .catch((error) => {
        console.error("Service worker install failed:", error);
        // Still resolve to allow service worker to activate
        return Promise.resolve();
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  // Skip caching the service worker itself
  if (event.request.url.includes("/sw.js")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    }),
  );
});
