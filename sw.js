const CACHE = 'courthub-v101';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=101',
  './manifest.webmanifest',
  './fonts/inter-latin.woff2',
  './fonts/monoton-latin.woff2',
  './js/util.js',
  './js/storage.js?v=101',
  './js/api.js',
  './js/checkin.js',
  './js/sync.js?v=101',
  './js/levels.js',
  './js/ratings.js',
  './js/heatmap.js',
  './js/audio.js',
  './js/wake.js',
  './js/stats.js?v=100',
  './js/players.js',
  './js/test.js',
  './js/training.js?v=100',
  './js/games.js',
  './js/tablecrew.js?v=101',
  './js/notes.js',
  './js/drills.js',
  './js/tactics.js',
  './js/history.js',
  './js/aiimport.js',
  './js/schedule.js',
  './js/dashboard.js?v=100',
  './js/reports.js?v=98',
  './js/settings.js',
  './js/account.js?v=100',
  './js/install.js',
  './js/app.js?v=101'
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
  if (new URL(req.url).pathname.startsWith('/api/')) return;

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
