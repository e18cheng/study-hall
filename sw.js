// Bump CACHE whenever a release changes anything in ASSETS. The old worker keeps
// serving the old cache until every tab using it is closed, so a version bump is what
// makes the next launch pick up new files.
const CACHE = 'study-hall-v25';

// Relative paths: the site lives under /study-hall/ on GitHub Pages.
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './core.js',
  './map.js',
  './list.js',
  './presidents.js',
  './shakespeare.js',
  './app.js',
  './elements.js',
  './wars.js',
  './map-data.js',
  './countries-data.js',
  './presidents-data.js',
  './shakespeare-data.js',
  './elements-data.js',
  './wars-data.js',
  './d3.min.js',
  './topojson-client.min.js',
  './manifest.webmanifest',
  './favicon.svg',
  './favicon.ico',
  './favicon-32.png',
  './favicon-16.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
];

// GitHub Pages serves assets with a short max-age, so a plain addAll can pick up
// the previous release from the browser's HTTP cache. Tag each install URL with
// the cache version and ask for a fresh copy; the fetch handler ignores search
// strings, so the plain paths still resolve from this cache.
self.addEventListener('install', (event) => {
  const version = CACHE.replace('study-hall-v', '');
  const requests = ASSETS.map((path) => new Request(`${path}?v=${version}`, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(requests)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Cache new same-origin GETs (future deck files, for example) as they appear.
        if (response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
        // A navigation that missed the cache still gets the app shell when offline.
        if (request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});

// The update banner asks the waiting worker to take over, then the page reloads.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
