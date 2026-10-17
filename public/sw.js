const CACHE_NAME = "meri-dukaan-v5";
const CACHE_PREFIX = "meri-dukaan-";

const CORE_ASSETS = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/icon.svg",
  "/apple-touch-icon.png",
];

function getPrecacheAssets(html) {
  const assets = new Map();
  const add = (rawUrl, required = false) => {
    if (!rawUrl || /^(?:data:|blob:|javascript:|mailto:|#|\/\/)/i.test(rawUrl)) return;
    try {
      const url = new URL(rawUrl, self.location.origin);
      if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;
      const previous = assets.get(url.href);
      assets.set(url.href, { url: url.href, required: required || Boolean(previous?.required) });
    } catch {
      // Ignore malformed URLs.
    }
  };

  // Only precache resources directly referenced by the shell; keep this small
  // so the worker can install on low-storage Chromebooks.
  const scriptPattern = /<script\b[^>]*\bsrc=["']([^"']+)["']/gi;
  let match;
  while ((match = scriptPattern.exec(html)) !== null) add(match[1], true);

  const linkPattern = /<link\b[^>]*>/gi;
  while ((match = linkPattern.exec(html)) !== null) {
    const tag = match[0];
    const href = /\bhref=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) continue;
    const rel = /\brel=["']([^"']+)["']/i.exec(tag)?.[1] ?? "";
    if (/stylesheet/i.test(rel)) add(href, true);
    else add(href, false);
  }

  const staticAssetPattern = /(?:src|href)=["']([^"']+\.(?:js|mjs|css|svg|png|webp|jpg|jpeg|ico|woff2?|webmanifest)(?:\?[^"']*)?)["']/gi;
  while ((match = staticAssetPattern.exec(html)) !== null) add(match[1], false);

  for (const asset of CORE_ASSETS) add(asset, false);
  return [...assets.values()];
}

async function fetchAndCache(cache, url) {
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) return null;
    await cache.put(url, response.clone());
    return response;
  } catch {
    return null;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const shellUrl = new URL("/", self.location.origin).href;
      const shellResponse = await fetchAndCache(cache, shellUrl);

      if (!shellResponse) {
        // Failed install keeps the previous active worker and its cache intact.
        await caches.delete(CACHE_NAME);
        throw new Error("Could not cache app shell; preserving previous offline version");
      }

      const contentType = shellResponse.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        await caches.delete(CACHE_NAME);
        throw new Error("App shell response was not HTML; preserving previous offline version");
      }

      const assets = getPrecacheAssets(await shellResponse.clone().text());
      const assetResults = await Promise.all(
        assets.map(async ({ url }) => ({ url, response: await fetchAndCache(cache, url) })),
      );

      // Never activate this worker if a required app script or stylesheet
      // could not be cached: the previous worker may be the only working copy.
      for (const asset of assets.filter((item) => item.required)) {
        const present = Boolean(await cache.match(asset.url));
        if (!present) {
          console.warn("[Meri Dukaan] Required offline asset missing:", asset.url);
          await caches.delete(CACHE_NAME);
          throw new Error("Required app asset could not be cached; preserving previous offline version");
        }
      }

      for (const result of assetResults) {
        if (!result.response) {
          console.info("[Meri Dukaan] Optional asset will cache on first visit:", result.url);
        }
      }

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const hasShell =
        Boolean(await cache.match(new URL("/", self.location.origin).href)) ||
        Boolean(await cache.match("/"));

      // Delete old caches only after the new worker has a verified HTML shell.
      if (hasShell) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        );
      }

      await self.clients.claim();
    })(),
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
          const type = response.headers.get("content-type") ?? "";
          if (response.ok && type.includes("text/html")) {
            try {
              await cache.put(request, response.clone());
            } catch (cacheError) {
              console.warn("[Meri Dukaan] Page cache write failed", cacheError);
            }
            return response;
          }
        } catch {
          // Use the cached route or shell below.
        }

        return (
          (await cache.match(request)) ||
          (await cache.match(url.pathname)) ||
          (await cache.match(url.pathname + url.search)) ||
          (await cache.match(new URL("/", self.location.origin).href)) ||
          (await cache.match("/")) ||
          new Response(
            "<!doctype html><html lang='en'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Meri Dukaan Offline</title><body><h1>Meri Dukaan</h1><p>Offline app shell cache mein nahi mili. Internet ON karke app kholein aur update complete hone dein.</p></body></html>",
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
          )
        );
      }

      if (isCacheableAsset(request, url)) {
        const cached =
          (await cache.match(request)) ||
          (await cache.match(url.href)) ||
          (await cache.match(url.pathname));
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response.ok) {
            try {
              await cache.put(request, response.clone());
            } catch (cacheError) {
              console.warn("[Meri Dukaan] Asset cache write failed", cacheError);
            }
          }
          return response;
        } catch {
          return new Response("", { status: 504, statusText: "Offline asset not cached" });
        }
      }

      // AI/server endpoints require internet. Inventory, sales, customer and
      // udhaar records are stored locally by the app's data store.
      try {
        return await fetch(request);
      } catch {
        return new Response("", { status: 504, statusText: "Offline" });
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
