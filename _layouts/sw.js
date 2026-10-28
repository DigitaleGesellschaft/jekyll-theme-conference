const BASE_URL = "{{ site.baseurl }}";
const VERSION = "{{ site.time | date: '%Y%m%d%H%M%S' }}";
const CACHE_PREFIX = "jekyll-conference-theme-";
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;

// Install event - precache all pages and assets listed in site.json
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const response = await fetch(`${BASE_URL}/assets/js/site.json`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load site.json: ${response.status}`);
        }
        const { pages = [], assets = [] } = await response.json();

        // Cache each resource on its own, so one missing file does not
        // leave the whole cache empty
        const cache = await caches.open(CACHE_NAME);
        const results = await Promise.allSettled([...pages, ...assets].map((url) => cache.add(url)));
        const failed = results.filter((result) => result.status === "rejected");
        if (failed.length) {
          console.warn(`Service worker could not cache ${failed.length} resource(s)`);
        }
      } catch (error) {
        console.error("Service worker install failed:", error);
      }

      // Activate new versions right away (schedule updates)
      await self.skipWaiting();
    })(),
  );
});

// Activate event - remove outdated caches of this theme only
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

// Network first: latest page, data or asset version; when offline, the
// cached copy (ignoring the version query, e.g. main.css?t=1793258390)
const networkFirst = async (request) => {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) {
      return cached;
    }
    throw error;
  }
};

// Cache first: versioned assets do not change once cached
const cacheFirst = async (request) => (await caches.match(request)) || networkFirst(request);

// Fetch event - only handle same-origin GET requests within the site,
// except the service worker itself and documents (e.g. slides, not offline)
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(`${BASE_URL}/`)) {
    return;
  }
  if (url.pathname === `${BASE_URL}/sw.js` || url.pathname.startsWith(`${BASE_URL}/documents/`)) {
    return;
  }

  // Example: /program/ (navigation) and /assets/js/data.json change during the conference
  if (request.mode === "navigate" || url.pathname.endsWith(".json")) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
