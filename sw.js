/* My Shop — Service Worker
   Caches the app shell so the app opens and works fully offline.
   All business data lives in localStorage (and optionally syncs to
   Firebase Firestore when a connection is available), so the app
   itself only needs its shell (HTML/CSS/JS/icons) to be cached. */

const CACHE_NAME = 'myshop-cache-v2';

// Only same-origin files here. cache.addAll() is all-or-nothing — if any
// single request in the list fails, the WHOLE install fails and the
// service worker never activates (this was the bug: cross-origin CDN
// scripts were in this list before, and one flaky fetch was silently
// breaking offline support entirely).
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// Cross-origin libraries: cached opportunistically (see fetch handler below),
// never allowed to block install.
const CDN_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Precache the app shell. If even this same-origin set has an
      // occasional failure, don't let it block installation either —
      // try each individually so one bad file can't take down the rest.
      await Promise.all(APP_SHELL.map((url) =>
        cache.add(url).catch((err) => console.warn('[sw] precache failed for', url, err))
      ));
      // Best-effort warm the CDN libs too, but never fail install because of them.
      await Promise.all(CDN_URLS.map((url) =>
        fetch(url, { mode: 'cors' })
          .then((res) => { if (res && res.ok) return cache.put(url, res); })
          .catch((err) => console.warn('[sw] CDN precache skipped for', url, err))
      ));
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never intercept POST/PUT etc (e.g. Firestore calls)

  // Network-first for navigation requests so users always get the latest app when online,
  // falling back to cache when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html').then((cached) => cached || caches.match('./')))
    );
    return;
  }

  // Cache-first for everything else in the app shell (fast + works offline).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
