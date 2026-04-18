const CACHE = 'beeptest-v73';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './icon.svg',
  './icons/logo-64.png',
  './icons/logo-128.png',
  './icons/logo-192.png',
  './icons/logo-512.png',
  './icons/apple-touch-icon.png',
  './fonts/inter-latin.woff2',
  './fonts/monoton-latin.woff2',
  './js/util.js',
  './js/storage.js',
  './js/levels.js',
  './js/ratings.js',
  './js/heatmap.js',
  './js/audio.js',
  './js/stats.js',
  './js/players.js',
  './js/test.js',
  './js/training.js',
  './js/notes.js',
  './js/drills.js',
  './js/tactics.js',
  './js/history.js',
  './js/aiimport.js',
  './js/schedule.js',
  './js/dashboard.js',
  './js/settings.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        fetch(req).then((fresh) => {
          if (fresh && fresh.ok) {
            caches.open(CACHE).then((cache) => cache.put(req, fresh.clone()));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then((fresh) => {
        if (fresh && fresh.ok && new URL(req.url).origin === location.origin) {
          const copy = fresh.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return fresh;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
