const CACHE_NAME = "meri-dukaan-pwa-v1";
const STATIC_CACHE = "meri-dukaan-static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
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
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
          return response;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(request);
          if (cached) return cached;

          const root = await cache.match("/");
          if (root) return root;

          return new Response(
            "<!doctype html><html><body><h1>Meri Dukaan</h1><p>Internet band hai. Pehle app ko online open karein.</p></body></html>",
            {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            },
          );
        }
      }

      if (isSameOrigin) {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          return new Response("", { status: 504 });
        }
      }

      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        return cached ?? new Response("", { status: 504 });
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
