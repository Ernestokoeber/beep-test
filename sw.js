const CACHE = 'courthub-v119';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=104',
  './manifest.webmanifest',
  './fonts/inter-latin.woff2',
  './fonts/monoton-latin.woff2',
  './js/util.js',
  './js/storage.js?v=101',
  './js/api.js?v=102',
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
  './js/training.js?v=103',
  './js/games.js?v=102',
  './js/tablecrew.js?v=101',
  './js/seasonplanner.js?v=102',
  './js/notes.js',
  './js/drills.js',
  './js/tactics.js',
  './js/play-designer/main.js',
  './js/play-designer/styles.js',
  './js/play-designer/rendering.js',
  './js/play-designer/court-enhancements.js',
  './js/play-designer/layout-fix.js',
  './js/play-designer/timing-core.js',
  './js/play-designer/timing-fix.js',
  './js/play-designer/editor-stability.js',
  './js/play-designer/complete-delete.js',
  './js/play-designer/quick-core.js',
  './js/play-designer/quick-styles.js',
  './js/play-designer/quick-pointer-fix.js',
  './js/play-designer/quick-editor.js',
  './js/play-designer/gif-encoder.js',
  './js/play-designer/history.js',
  './js/play-designer/editor.js',
  './js/play-designer/viewer.js',
  './js/play-designer/exports.js',
  './js/video-import/core.js',
  './js/video-import/styles.js',
  './js/video-import/alignment.js',
  './js/video-import/main.js',
  './js/history.js',
  './js/aiimport.js',
  './js/schedule.js?v=102',
  './js/dashboard.js?v=100',
  './js/reports.js?v=98',
  './js/settings.js',
  './js/account.js?v=100',
  './js/install.js',
  './js/app.js?v=103'
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
