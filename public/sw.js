const CACHE_NAME = "meri-dukaan-v2";

function getPrecacheUrls(html) {
  const urls = new Set(["/", "/manifest.webmanifest", "/favicon.ico"]);
  const patterns = [
    /<script[^>]+src=["']([^"']+)["']/gi,
    /<link[^>]+href=["']([^"']+)["']/gi,
    /(?:src|href)=["']([^"']+\.(?:js|css|svg|png|woff2?|webmanifest)(?:\?[^"']*)?)["']/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = match[1];
      if (url.startsWith("/") && !url.startsWith("//")) urls.add(url);
    }
  }

  return [...urls];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const response = await fetch("/", { cache: "no-cache" });
      if (!response.ok) throw new Error("Failed to precache app shell");

      const html = await response.clone().text();
      await cache.put("/", response.clone());

      const urls = getPrecacheUrls(html);
      await Promise.all(
        urls.filter((url) => url !== "/").map(async (url) => {
          try {
            const assetResponse = await fetch(url, { cache: "no-cache" });
            if (assetResponse.ok) await cache.put(url, assetResponse);
          } catch {
            // Optional asset unavailable; keep installing.
          }
        }),
      );

      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  event.respondWith(
    (async () => {
      const isNavigation = request.mode === "navigate";
      const isSameOrigin = request.url.startsWith(self.location.origin);

      if (isNavigation) {
        const cache = await caches.open(CACHE_NAME);
        try {
          const response = await fetch(request);
          if (response.ok) await cache.put(request, response.clone());
          return response;
        } catch {
          return (
            (await cache.match(request)) ||
            (await cache.match("/")) ||
            new Response(
              "<!doctype html><html><body><h1>Meri Dukaan</h1><p>Internet band hai. App shell available nahi hai.</p></body></html>",
              { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
            )
          );
        }
      }

      if (isSameOrigin) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response.ok) await cache.put(request, response.clone());
          return response;
        } catch {
          return new Response("", { status: 504 });
        }
      }

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
