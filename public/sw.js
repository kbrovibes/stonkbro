// stonkbro Service Worker — Push Notifications + Offline (airplane-mode) support
//
// Caching model:
//   - STATIC cache: /_next/static/* and icons — immutable, cache-first.
//   - PAGES cache: HTML documents + RSC payloads — network-first, fall back to
//     cache when offline. Every successful navigation gets cached, so any page
//     you've visited works offline.
//   - Knowledge base: the client posts WARM_KB on every app open; we fetch the
//     learn manifest, cache every /learn page's HTML, and parse each page for
//     its /_next/static chunk URLs so a hard reload works in airplane mode.

const VERSION = "v4";
const STATIC_CACHE = `stonkbro-static-${VERSION}`;
const PAGES_CACHE = `stonkbro-pages-${VERSION}`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(PAGES_CACHE).then((cache) => cache.addAll(["/", "/learn"]).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("stonkbro-") && !n.endsWith(VERSION))
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

// ---- Knowledge-base warm-up ------------------------------------------------

async function cacheChunksFromHtml(html, staticCache) {
  const urls = new Set();
  const re = /\/_next\/static\/[^"'\s\\]+/g;
  let m;
  while ((m = re.exec(html)) !== null) urls.add(m[0]);
  await Promise.all(
    [...urls].map(async (u) => {
      const hit = await staticCache.match(u);
      if (hit) return;
      try {
        const res = await fetch(u);
        if (res.ok) await staticCache.put(u, res);
      } catch {
        // offline mid-warm — fine
      }
    })
  );
}

// Re-warm at most every 6h unless the manifest changed (new lessons deployed).
const WARM_MARKER = "/__kb-warm-marker";
const WARM_TTL_MS = 6 * 3600_000;

async function warmKnowledgeBase() {
  try {
    const res = await fetch("/api/learn/manifest", { credentials: "include" });
    if (!res.ok) return;
    const { paths, version } = await res.json();
    const pages = await caches.open(PAGES_CACHE);
    const statics = await caches.open(STATIC_CACHE);

    const marker = await pages.match(WARM_MARKER);
    if (marker) {
      const meta = await marker.json().catch(() => null);
      if (meta && meta.version === version && Date.now() - meta.at < WARM_TTL_MS) return;
    }

    for (const path of paths) {
      try {
        const pageRes = await fetch(path, { credentials: "include" });
        if (!pageRes.ok) continue;
        const clone = pageRes.clone();
        await pages.put(path, pageRes);
        await cacheChunksFromHtml(await clone.text(), statics);
      } catch {
        // skip page, keep warming the rest
      }
    }
    await pages.put(
      WARM_MARKER,
      new Response(JSON.stringify({ version, at: Date.now() }), {
        headers: { "Content-Type": "application/json" },
      })
    );
  } catch {
    // manifest unreachable (offline) — nothing to do
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "WARM_KB") {
    event.waitUntil(warmKnowledgeBase());
  }
});

// ---- Fetch routing ---------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Immutable build assets: cache-first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Never cache API responses except the learn manifest — live data should be
  // honestly absent offline (pages show their offline state instead).
  if (url.pathname.startsWith("/api/") && url.pathname !== "/api/learn/manifest") return;

  // Documents + RSC payloads: network-first with cache fallback
  const isDocument = req.mode === "navigate" || req.destination === "document";
  const isRsc = req.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
  if (isDocument || isRsc) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES_CACHE);
        try {
          const res = await fetch(req);
          if (res.ok && !res.redirected) cache.put(req, res.clone());
          return res;
        } catch {
          // Offline: exact match, then path match (RSC param variants), then app shell
          const exact = await cache.match(req);
          if (exact) return exact;
          const byPath = await cache.match(url.pathname, { ignoreSearch: true, ignoreVary: true });
          if (byPath) return byPath;
          if (isDocument) {
            const shell = (await cache.match("/learn")) || (await cache.match("/"));
            if (shell) return shell;
          }
          return new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })()
    );
  }
});

// ---- Push notifications (unchanged) ---------------------------------------

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "stonkbro";
  const options = {
    body: data.body || "New update",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "stonkbro-notification",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
