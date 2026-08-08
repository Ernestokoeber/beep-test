// Bump this whenever the offline asset manifest changes so installed clients
// cannot keep an older editor or planner bundle.
const CACHE = 'courthub-v128';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './fonts/inter-latin.woff2',
  './fonts/monoton-latin.woff2',
  './js/util.js',
  './js/storage.js',
  './js/api.js',
  './js/checkin.js',
  './js/sync.js',
  './js/levels.js',
  './js/ratings.js',
  './js/heatmap.js',
  './js/audio.js',
  './js/wake.js',
  './js/stats.js',
  './js/players.js',
  './js/test.js',
  './js/training.js',
  './js/games.js',
  './js/tablecrew.js',
  './js/seasonplanner.js',
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
  './js/play-designer/phase-recorder-core.js',
  './js/play-designer/phase-spacing.js',
  './js/play-designer/quick-styles.js',
  './js/play-designer/quick-pointer-fix.js',
  './js/play-designer/quick-editor.js',
  './js/play-designer/editor-shell.js',
  './js/play-designer/editor-toolbar.js',
  './js/play-designer/phase-rail.js',
  './js/play-designer/court-stage.js',
  './js/play-designer/action-timeline.js',
  './js/play-designer/phase-instructions.js',
  './js/play-designer/play-preview.js',
  './js/play-designer/animation-player.js',
  './js/play-designer/export-dialog.js',
  './js/play-designer/play-library.js',
  './js/play-designer/quick-workflow.js',
  './js/play-designer/quick-details.js',
  './js/play-designer/quick-reorder.js',
  './js/play-designer/tactic-trash.js',
  './js/play-designer/gif-encoder.js',
  './js/play-designer/pdf-writer.js',
  './js/play-designer/history.js',
  './js/play-designer/editor.js',
  './js/play-designer/viewer.js',
  './js/play-designer/exports.js',
  './js/video-import/core.js',
  './js/video-import/styles.js',
  './js/video-import/alignment.js',
  './js/video-import/compatibility.js',
  './js/video-import/tracker-v2.js',
  './js/video-import/tracker-install.js',
  './js/video-import/screen-recognition.js',
  './js/video-import/main.js',
  './js/history.js',
  './js/aiimport.js',
  './js/schedule.js',
  './js/dashboard.js',
  './js/reports.js',
  './js/settings.js',
  './js/account.js',
  './js/install.js',
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
