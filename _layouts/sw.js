{%- include get_edition.html -%}
const BASE_URL = "{{ site.baseurl }}";
const VERSION = "{{ site.time | date: '%Y%m%d%H%M%S' }}";
const CACHE_PREFIX = "jekyll-conference-theme-";
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;

const HTTP_NOT_MODIFIED = 304;

// Copy of the previous build (cache), or nothing on the first install
const previousCache = async () => {
  const names = (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME);
  return names.length ? caches.open(names[names.length - 1]) : null;
};

// Store a resource in the new cache, downloading only what changed since the
// previous build: theme bundles carry their content hash (e.g.
// conference.bundle.css?v=1a2b3c), all other resources are revalidated (304)
const precache = async (cache, previous, url) => {
  const cached = previous && (await previous.match(url));
  if (cached && new URL(url, self.location.href).searchParams.has("v")) {
    return cache.put(url, cached);
  }

  const headers = {};
  if (cached?.headers.has("ETag")) {
    headers["If-None-Match"] = cached.headers.get("ETag");
  }
  if (cached?.headers.has("Last-Modified")) {
    headers["If-Modified-Since"] = cached.headers.get("Last-Modified");
  }

  // Low priority: the visitor's own requests go first
  const response = await fetch(url, { cache: "no-store", headers, priority: "low" });
  if (response.status === HTTP_NOT_MODIFIED && cached) {
    return cache.put(url, cached);
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${url}`);
  }
  return cache.put(url, response);
};

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
        const previous = await previousCache();
        const results = await Promise.allSettled([...pages, ...assets].map((url) => precache(cache, previous, url)));
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
      // Request pages while the service worker boots (see fromNetwork)
      await self.registration.navigationPreload?.enable();

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

// Latest version from the network (stored for later), e.g. the page's
// navigation preload
const fromNetwork = (event) => {
  const { request } = event;
  const preload = event.preloadResponse ?? Promise.resolve();
  const network = preload.then((preloaded) => preloaded || fetch(request)).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  });
  event.waitUntil(network.catch(() => {}));
  return network;
};

// Stale while revalidate: the cached copy right away, also on a crowded
// conference Wi-Fi, updated in the background for the next visit (ignoring
// the query, e.g. /program/?day=2); the network only without a copy
const staleWhileRevalidate = async (event) => {
  const network = fromNetwork(event);
  return (await caches.match(event.request, { ignoreSearch: true })) || network;
};

// Network first: assets not in the cache; when offline, the cached copy
// ignoring the version query (e.g. main.css?t=1793258390)
const networkFirst = async (event) => {
  const network = fromNetwork(event);
  try {
    return await network;
  } catch {
    return (await caches.match(event.request, { ignoreSearch: true })) || network;
  }
};

// Cache first: versioned assets do not change once cached
const cacheFirst = async (event) => (await caches.match(event.request)) || networkFirst(event);

// Folders of documents (e.g. slides, not offline): /documents/, with
// editions /<id>/documents/
{%- assign document_paths = "/documents/" | split: "," -%}
{%- if site.conference.editions.size > 0 -%}
  {%- assign document_paths = "" | split: "" -%}
  {%- for e in site.conference.editions -%}
    {%- assign document_path = "/" | append: e.id | append: "/documents/" -%}
    {%- assign document_paths = document_paths | push: document_path -%}
  {%- endfor -%}
{%- endif %}
const DOCUMENT_PATHS = {{ document_paths | jsonify }};

// Start of the current edition, e.g. /2026/, to which the root forwards
// (without editions: the root itself)
const EDITION_URL = `${BASE_URL}{{ edition_base }}/`;

// Fetch event - only handle same-origin GET requests within the site,
// except the service worker itself and documents
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(`${BASE_URL}/`)) {
    return;
  }
  if (url.pathname === `${BASE_URL}/sw.js` || DOCUMENT_PATHS.some((path) => url.pathname.startsWith(`${BASE_URL}${path}`))) {
    return;
  }

  // Forward the root (e.g. the app's start) right away, also offline, instead
  // of loading its forwarding page (_layouts/editions.html)
  if (request.mode === "navigate" && url.pathname === `${BASE_URL}/` && url.pathname !== EDITION_URL) {
    event.respondWith(Response.redirect(`${EDITION_URL}${url.search}`));
    return;
  }

  // Example: /program/ (navigation) and /assets/js/data.json change during the conference
  if (request.mode === "navigate" || url.pathname.endsWith(".json")) {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  event.respondWith(cacheFirst(event));
});
