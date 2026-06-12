/* Pitstop service worker — hand-rolled (PRD Appendix B: least painful option).
 *
 * Strategy:
 *  - App shell + static assets (/_next/static, fonts, icons): cache-first.
 *  - Navigations: network-first, falling back to the cached shell.
 *  - GET /api/collection*: network-first with cache fallback → offline browse.
 *  - Supabase Storage photos: cache-first (content-addressed paths).
 *  - Hugging Face / ONNX model files: cache-first (immutable, ~30 MB once).
 *  - Mutations (non-GET) are never intercepted; the UI shows a clear offline
 *    message instead (queue + replay is on the roadmap).
 */

const VERSION = 'pitstop-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const DATA_CACHE = `${VERSION}-data`;
const MODEL_CACHE = `${VERSION}-models`;

const PRECACHE_URLS = ['/', '/collection', '/add', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // never intercept mutations

  const url = new URL(request.url);

  // ML model weights (Hugging Face CDN) — immutable, cache hard.
  if (/huggingface\.co$|hf\.co$|cdn\.jsdelivr\.net$/.test(url.hostname)) {
    event.respondWith(cacheFirst(request, MODEL_CACHE));
    return;
  }

  // Supabase Storage photos — paths are unique per upload, safe to cache hard.
  if (/\.supabase\.co$/.test(url.hostname) && url.pathname.includes('/storage/')) {
    event.respondWith(cacheFirst(request, DATA_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Hashed build assets + icons: cache-first.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Collection data: network-first so offline browsing works.
  if (url.pathname.startsWith('/api/collection')) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // Other API + auth routes: network only.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // Page navigations: network-first with shell fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, SHELL_CACHE).catch(
        async () =>
          (await caches.match('/collection')) ??
          (await caches.match('/')) ??
          Response.error(),
      ),
    );
  }
});
