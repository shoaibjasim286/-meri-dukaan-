const CACHE_NAME = "meri-dukaan-v3";

// Cache the complete app navigation surface during the first online visit so
// a fresh install can open every main section without an internet connection.
const APP_ROUTES = [
  "/",
  "/samaan",
  "/bikri",
  "/kharid",
  "/wapsi",
  "/kharcha",
  "/hisaab",
  "/reports",
  "/ai-sawaal",
  "/udhaar",
  "/customers",
  "/suppliers",
  "/staff",
  "/daily-closing",
  "/settings",
  "/notifications",
  "/audit-log",
  "/receipts",
  "/held-carts",
  "/guide",
  "/debug",
];

const CORE_ASSETS = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/icon.svg",
  "/apple-touch-icon.png",
];

function getPrecacheUrls(html) {
  const urls = new Set();
  const patterns = [
    /<script[^>]+src=["']([^"']+)["']/gi,
    /<link[^>]+href=["']([^"']+)["']/gi,
    /(?:src|href)=["']([^"']+\.(?:js|css|svg|png|webp|jpg|jpeg|woff2?|webmanifest)(?:\?[^"']*)?)["']/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      try {
        const url = new URL(match[1], self.location.origin);
        if (
          url.origin === self.location.origin &&
          url.pathname !== "/sw.js"
        ) {
          urls.add(url.href);
        }
      } catch {
        // Ignore malformed and cross-origin URLs.
      }
    }
  }

  return [...urls];
}

async function fetchAndCache(cache, url) {
  try {
    const response = await fetch(url, { cache: "reload" });
    if (!response.ok) return null;
    await cache.put(url, response.clone());
    return response;
  } catch {
    // A single optional route or asset should not stop the whole install.
    return null;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const rootResponse = await fetch("/", { cache: "reload" });
      if (!rootResponse.ok) throw new Error("Failed to precache app shell");

      await cache.put("/", rootResponse.clone());
      const rootHtml = await rootResponse.clone().text();
      const discoveredAssets = new Set(getPrecacheUrls(rootHtml));

      // Precache the main navigation routes as HTML. If a route is unavailable
      // during install, it can still fall back to the app shell when offline.
      const routeResponses = await Promise.all(
        APP_ROUTES.filter((route) => route !== "/").map(async (route) => {
          const response = await fetchAndCache(cache, route);
          if (!response) return [];
          const contentType = response.headers.get("content-type") ?? "";
          if (!contentType.includes("text/html")) return [];
          return getPrecacheUrls(await response.clone().text());
        }),
      );

      for (const asset of routeResponses.flat()) discoveredAssets.add(asset);
      for (const asset of CORE_ASSETS) {
        discoveredAssets.add(new URL(asset, self.location.origin).href);
      }

      await Promise.all(
        [...discoveredAssets].map((asset) =>
          fetchAndCache(cache, asset),
        ),
      );

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("meri-dukaan-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheableAsset(request, url) {
  return (
    request.destination !== "" ||
    url.pathname.startsWith("/_build/") ||
    url.pathname.startsWith("/assets/") ||
    /\.(?:js|mjs|css|svg|png|webp|jpg|jpeg|ico|woff2?|webmanifest)$/i.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      if (request.mode === "navigate") {
        try {
          const response = await fetch(request);

          // Only replace a cached route with a successful page response.
          // A server error page should not prevent access to the cached app.
          if (response.ok) {
            try {
              await cache.put(request, response.clone());
            } catch (cacheError) {
              // Quota or cache errors must not break a healthy online navigation.
              console.warn("[Meri Dukaan] Navigation cache write failed", cacheError);
            }
            return response;
          }
        } catch {
          // Network is unavailable; continue to the cached app shell below.
        }

        return (
          (await cache.match(request)) ||
          (await cache.match(url.pathname)) ||
          (await cache.match("/")) ||
          new Response(
            "<!doctype html><html lang='en'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Meri Dukaan Offline</title><body><h1>Meri Dukaan</h1><p>Offline app shell abhi cache mein nahi hai. Internet on karke app ek martaba kholein, phir offline use karein.</p></body></html>",
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
          )
        );
      }

      if (isCacheableAsset(request, url)) {
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      }

      // Do not pretend online-only endpoints worked offline. The app's normal
      // sales, stock, customers and udhaar screens use local storage instead.
      try {
        return await fetch(request);
      } catch {
        return new Response("", { status: 504 });
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
