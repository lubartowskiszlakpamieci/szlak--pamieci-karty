// ============================================================
// Service Worker — Lubartowski Szlak Pamięci
// Zapewnia działanie strony offline PO PIERWSZYM wejściu,
// ale ZAWSZE próbuje najpierw pobrać świeżą wersję z sieci
// (network-first), żeby aktualizacje strony docierały od razu
// do zwracających się użytkowników — bez potrzeby ręcznego
// podbijania CACHE_VERSION przy każdym wdrożeniu.
// ============================================================
const CACHE_VERSION = 'szlak-pamieci-v5';

const APP_SHELL = [
  './',
  './index.html',
  './mapa-lite.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      for (const url of APP_SHELL) {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) {
            await cache.put(url, res);
          } else {
            console.warn('[SW] Pominięto (brak pliku / status):', url, res.status);
          }
        } catch (err) {
          console.warn('[SW] Błąd pobierania do cache:', url, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isOwnOrigin = url.origin === self.location.origin;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok && isOwnOrigin) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

