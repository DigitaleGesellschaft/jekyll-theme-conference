{%- include get_edition.html -%}
const BASE_URL = "{{ site.baseurl }}";
const VERSION = "{{ site.time | date: '%Y%m%d%H%M%S' }}";
const CACHE_PREFIX = "jekyll-conference-theme-";
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;

const HTTP_NOT_MODIFIED = 304;
const HTTP_NOT_FOUND = 404;

// Message to the pages once a build changed the site (_js/modules/pwa.js)
const SITE_UPDATED = "site-updated";

// Pages of each build link the site's files with its build time (e.g.
// main.css?t=1793258390): ignored, so a rebuild alone is no update
const BUILD_TIME = /\?t=\d+/g;

// Whether this build changed the site: noted in its cache on install (the
// browser may stop the worker before activation, losing variables), told the
// pages on activation
const SITE_UPDATED_KEY = `${BASE_URL}/__site-updated__`;

// Whether the latest version differs from the stored one, ignoring the build time
const isChanged = async (stored, latest) => {
  const [before, after] = await Promise.all([stored.text(), latest.text()]);
  return before.replace(BUILD_TIME, "") !== after.replace(BUILD_TIME, "");
};

// Copy of the previous build (cache), or nothing on the first install
const previousCache = async () => {
  const names = (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME);
  return names.length ? caches.open(names[names.length - 1]) : null;
};

// Store a resource in the new cache, downloading only what changed since the
// previous build: theme bundles carry their content hash (e.g.
// conference.bundle.css?v=1a2b3c), all other resources are revalidated (304).
// Resolves whether it changed.
const precache = async (cache, previous, url) => {
  const cached = previous && (await previous.match(url));
  if (cached && new URL(url, self.location.href).searchParams.has("v")) {
    await cache.put(url, cached);
    return false;
  }

  const headers = {};
  if (cached?.headers.has("ETag")) {
    headers["If-None-Match"] = cached.headers.get("ETag");
  }
  if (cached?.headers.has("Last-Modified")) {
    headers["If-Modified-Since"] = cached.headers.get("Last-Modified");
  }

  // Low priority: the visitor's own requests go first. On failure (e.g. a
  // flaky network) the previous copy stays, as the old cache is deleted.
  let response;
  try {
    response = await fetch(url, { cache: "no-store", headers, priority: "low" });
    if (response.status === HTTP_NOT_MODIFIED && cached) {
      await cache.put(url, cached);
      return false;
    }
    if (!response.ok) {
      throw new Error(`${response.status} ${url}`);
    }
    await cache.put(url, response.clone());
  } catch (error) {
    if (cached) {
      await cache.put(url, cached);
    }
    throw error;
  }

  // Example: main.css?t=1793258390 of the previous build. New resources
  // change the pages linking them.
  const stored = previous && (await previous.match(url, { ignoreSearch: true }));
  return stored ? isChanged(stored, response) : false;
};

// Install event - precache all pages and assets listed in site.json
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Without the list (e.g. offline during the update) the install fails:
      // the previous worker and its cache stay, the browser retries later
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
      if (results.some((result) => result.value === true)) {
        await cache.put(SITE_UPDATED_KEY, new Response(""));
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

      // Once for all pages of the build, e.g. not again on the next page
      const cache = await caches.open(CACHE_NAME);
      if (await cache.delete(SITE_UPDATED_KEY)) {
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((client) => client.postMessage({ type: SITE_UPDATED }));
      }
    })(),
  );
});

// Latest version from the network, e.g. the page's navigation preload
const fetchLatest = (event) =>
  (event.preloadResponse ?? Promise.resolve()).then((preloaded) => preloaded || fetch(event.request));

// Pages and data are looked up ignoring the query (staleWhileRevalidate):
// stored without it, so variants (e.g. /live/?room=A) do not pile up
const storeKey = (request) => {
  const url = new URL(request.url);
  if (request.mode !== "navigate" && !url.pathname.endsWith(".json")) {
    return request;
  }
  url.search = "";
  return url.href;
};

// Store a complete response for later (not e.g. partial content, 206, which
// the cache refuses), copied before the page reads it; resolves once stored
const store = (request, response) => {
  if (response.status !== 200 || response.headers.get("Vary") === "*") {
    return Promise.resolve();
  }
  const copy = response.clone();
  return caches
    .open(CACHE_NAME)
    .then((cache) => cache.put(storeKey(request), copy))
    .catch(() => {});
};

// Latest version from the network, stored for later without delaying it
const fromNetwork = (event) => {
  const network = fetchLatest(event);
  event.waitUntil(network.then((response) => store(event.request, response)).catch(() => {}));
  return network;
};

// Store the latest version of a page shown from the cache, unless it
// changed: the next build's service worker stores all its pages at once and
// tells the pages once (see install), instead of each page on its own
const revalidatePage = async (event, cached) => {
  const response = await fetchLatest(event);
  if (!response.ok) {
    return;
  }

  if (await isChanged(cached, response.clone())) {
    await self.registration.update();
    return;
  }
  await store(event.request, response);
};

// Page for missing addresses (layout: not-found, e.g. /404.html), if any
{%- assign not_found_page = site.pages | where: "layout", "not-found" | where_exp: "p", "p.edition == nil" | first -%}
{%- assign not_found_url = nil -%}
{%- if not_found_page -%}
  {%- assign not_found_url = not_found_page.url | prepend: site.baseurl -%}
{%- endif %}
const NOT_FOUND_URL = {{ not_found_url | jsonify }};

// The site's page not found in place of the server's (e.g. plain text), and
// offline for pages not stored
const notFound = async (response) => {
  const page = NOT_FOUND_URL && (await caches.match(NOT_FOUND_URL));
  if (!page) {
    return response ?? Response.error();
  }
  return new Response(page.body, { status: HTTP_NOT_FOUND, headers: page.headers });
};

// Page not stored (e.g. a missing one): the network, else the page not found
const pageFromNetwork = async (event) => {
  let response;
  try {
    response = await fromNetwork(event);
  } catch {
    return notFound();
  }
  return response.status === HTTP_NOT_FOUND ? notFound(response) : response;
};

// Stale while revalidate: the cached copy right away, also on a crowded
// conference Wi-Fi, updated in the background (ignoring the query, e.g.
// /program/?day=2); the network only without a copy
const staleWhileRevalidate = async (event) => {
  const cached = await caches.match(event.request, { ignoreSearch: true });
  const isPage = event.request.mode === "navigate";
  if (!cached) {
    return isPage ? pageFromNetwork(event) : fromNetwork(event);
  }

  if (isPage) {
    event.waitUntil(revalidatePage(event, cached.clone()).catch(() => {}));
  } else {
    fromNetwork(event);
  }
  return cached;
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
  // Parts of a file (e.g. seeking in audio or video) stay the browser's: the
  // cache holds whole files only
  if (request.headers.has("Range")) {
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
