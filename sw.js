// Bump CACHE whenever a release changes anything in ASSETS. The old worker keeps
// serving the old cache until every tab using it is closed, so a version bump is what
// makes the next launch pick up new files.
const CACHE = 'study-hall-v4';

// Relative paths: the site lives under /study-hall/ on GitHub Pages.
const ASSETS = [
  './',
  './index.html',
  './map-data.js',
  './d3.min.js',
  './topojson-client.min.js',
  './manifest.webmanifest',
  './favicon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
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
