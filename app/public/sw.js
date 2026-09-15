/**
 * Restohub POS service worker.
 *
 * A lane must stay usable when the store's uplink hiccups, so the app shell and
 * static assets are cached and served offline. Nothing money-related is cached:
 * navigations go network-first (so a cashier never works from a stale screen)
 * and fall back to the cached shell only when the network is genuinely gone.
 */

const VERSION = "v1";
const SHELL_CACHE = `restohub-pos-shell-${VERSION}`;
const ASSET_CACHE = `restohub-pos-assets-${VERSION}`;
const OFFLINE_URL = "/offline";

const SHELL_URLS = ["/register", "/plu", "/tender", "/manager", "/login", OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // One bad URL shouldn't abort the whole install, so add them individually.
      .then((cache) => Promise.allSettled(SHELL_URLS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin && url.hostname !== "fonts.gstatic.com") return;

  // Navigations: network-first, cached shell as the offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (await caches.match(OFFLINE_URL)) || Response.error();
        }),
    );
    return;
  }

  // Build output and fonts are immutable: cache-first is safe and fast.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.hostname === "fonts.gstatic.com";

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok || response.type === "opaque") {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
