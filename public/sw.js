const CACHE_NAME = "meri-dukaan-v4";
const CACHE_PREFIX = "meri-dukaan-";

// Keep the navigation shell and its JavaScript/CSS dependency graph available
// for offline startup after deployments that change hashed asset filenames.
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
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/icon.svg",
  "/apple-touch-icon.png",
];

const ASSET_EXTENSION = /\.(?:js|mjs|css|svg|png|webp|jpg|jpeg|ico|woff2?|webmanifest)(?:[?#].*)?$/i;

function resolveSameOriginAsset(rawUrl, baseUrl) {
  if (!rawUrl || /^(?:data:|blob:|javascript:|mailto:|#)/i.test(rawUrl)) return null;

  try {
    const resolved = new URL(rawUrl, baseUrl);
    if (
      resolved.origin !== self.location.origin ||
      resolved.pathname === "/sw.js" ||
      !ASSET_EXTENSION.test(resolved.pathname)
    ) {
      return null;
    }
    return resolved.href;
  } catch {
    return null;
  }
}

function getHtmlAssets(html, baseUrl) {
  const urls = new Set();
  const patterns = [
    /<script\b[^>]*\bsrc=["']([^"']+)["']/gi,
    /<link\b[^>]*\bhref=["']([^"']+)["']/gi,
    /<(?:img|source)\b[^>]*\bsrc=["']([^"']+)["']/gi,
    /(?:src|href)=["']([^"']+\.(?:js|mjs|css|svg|png|webp|jpg|jpeg|ico|woff2?|webmanifest)(?:\?[^"']*)?)["']/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = resolveSameOriginAsset(match[1], baseUrl);
      if (url) urls.add(url);
    }
  }

  return [...urls];
}

function getCodeDependencies(source, baseUrl, isCss) {
  const urls = new Set();
  const patterns = isCss
    ? [
        /@import\s+(?:url\()?\s*["']([^"']+)["']/gi,
        /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
      ]
    : [
        /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gi,
        /\b(?:import|export)\s+(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/gi,
        /new URL\(\s*["']([^"']+\.(?:wasm|worker\.js))["']\s*,\s*import\.meta\.url\s*\)/gi,
      ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const url = resolveSameOriginAsset(match[1].trim(), baseUrl);
      if (url) urls.add(url);
    }
  }

  return [...urls];
}

async function fetchAndCache(cache, url) {
  try {
    const response = await fetch(url, { cache: "reload" });
    if (!response.ok) return null;

    try {
      await cache.put(url, response.clone());
    } catch (cacheError) {
      console.warn("[Meri Dukaan] Could not cache", url, cacheError);
      return null;
    }

    return response;
  } catch {
    // A route or optional asset failing must not break the remaining install.
    return null;
  }
}

async function copyPreviousCache(nextCache) {
  const oldKeys = (await caches.keys()).filter(
    (key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME,
  );

  for (const oldKey of oldKeys) {
    try {
      const previous = await caches.open(oldKey);
      const requests = await previous.keys();

      for (const request of requests) {
        try {
          if (await nextCache.match(request)) continue;
          const response = await previous.match(request);
          if (response) await nextCache.put(request, response);
        } catch {
          // Copy what is usable; never destroy an older working cache here.
        }
      }
    } catch {
      // Try any other previous app cache.
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const rootUrl = new URL("/", self.location.origin).href;
      let rootResponse = await fetchAndCache(cache, rootUrl);

      if (!rootResponse) {
        // Network may be temporarily unavailable during an update. Carry the
        // previous shell forward so the new worker cannot erase offline access.
        await copyPreviousCache(cache);
      } else {
        const contentType = rootResponse.headers.get("content-type") ?? "";
        if (!contentType.includes("text/html")) {
          await copyPreviousCache(cache);
        } else {
          const discoveredAssets = new Set(
            getHtmlAssets(await rootResponse.clone().text(), rootUrl),
          );

          // Routes can expose code-split assets that are not in the home page.
          const routeResponses = await Promise.all(
            APP_ROUTES.filter((route) => route !== "/").map(async (route) => {
              const url = new URL(route, self.location.origin).href;
              const response = await fetchAndCache(cache, url);
              if (!response) return [];

              const type = response.headers.get("content-type") ?? "";
              if (!type.includes("text/html")) return [];
              return getHtmlAssets(await response.clone().text(), url);
            }),
          );

          for (const url of routeResponses.flat()) discoveredAssets.add(url);
          for (const asset of CORE_ASSETS) {
            discoveredAssets.add(new URL(asset, self.location.origin).href);
          }

          // Walk the static JS/CSS import graph so offline navigation does not
          // depend on chunks that were only imported by another cached script.
          const queue = [...discoveredAssets];
          const inspected = new Set();
          const maxAssets = 500;

          while (queue.length > 0 && inspected.size < maxAssets) {
            const url = queue.shift();
            if (!url || inspected.has(url)) continue;
            inspected.add(url);

            const response = await fetchAndCache(cache, url);
            if (!response) continue;

            const type = response.headers.get("content-type") ?? "";
            const isJs = /javascript|ecmascript/i.test(type) || /\.(?:js|mjs)(?:[?#].*)?$/i.test(url);
            const isCss = /text\/css/i.test(type) || /\.css(?:[?#].*)?$/i.test(url);
            if (!isJs && !isCss) continue;

            try {
              const source = await response.clone().text();
              for (const dependency of getCodeDependencies(source, url, isCss)) {
                if (!inspected.has(dependency)) queue.push(dependency);
              }
            } catch {
              // The containing app route remains usable if an optional chunk
              // cannot be inspected during installation.
            }
          }
        }
      }

      // If no shell could be obtained or copied, keep the previous worker active.
      // In particular, do not activate a cache that cannot open the app at all.
      if (!(await cache.match(rootUrl)) && !(await cache.match("/"))) {
        await caches.delete(CACHE_NAME);
        throw new Error("No cached app shell available; preserving previous worker");
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

      // A previous cache is more valuable than a clean cache with no app shell.
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
    ASSET_EXTENSION.test(url.pathname)
  );
}

async function findCachedNavigation(cache, request, url) {
  return (
    (await cache.match(request)) ||
    (await cache.match(url.href)) ||
    (await cache.match(url.pathname)) ||
    (await cache.match(new URL(url.pathname, self.location.origin).href)) ||
    (await cache.match(new URL("/", self.location.origin).href)) ||
    (await cache.match("/")) ||
    null
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
          const contentType = response.headers.get("content-type") ?? "";

          if (response.ok && contentType.includes("text/html")) {
            try {
              await cache.put(request, response.clone());
            } catch (cacheError) {
              console.warn("[Meri Dukaan] Navigation cache write failed", cacheError);
            }
            return response;
          }
        } catch {
          // Fall through to the already cached route or app shell.
        }

        return (
          (await findCachedNavigation(cache, request, url)) ||
          new Response(
            "<!doctype html><html lang='en'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Meri Dukaan Offline</title><body><h1>Meri Dukaan</h1><p>Offline app shell cache mein nahi mili. Internet on karke app kholein aur install/update complete hone dein.</p></body></html>",
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
          )
        );
      }

      if (isCacheableAsset(request, url)) {
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response.ok) {
            try {
              await cache.put(request, response.clone());
            } catch {
              // The online request should still succeed if the cache is full.
            }
          }
          return response;
        } catch {
          // A missing chunk should fail as a resource, not reject the entire worker.
          return new Response("", {
            status: 504,
            statusText: "Offline asset not cached",
          });
        }
      }

      // Server-side AI and other endpoints remain online-only; local records do
      // not use these endpoints and continue to work from the cached app shell.
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
