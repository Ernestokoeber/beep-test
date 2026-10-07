// Bump this whenever the offline asset manifest changes so installed clients
// cannot keep an older editor or planner bundle.
const CACHE = 'courthub-v193';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './training-timer.css',
  './training-live.css',
  './station-training.css',
  './live-game.css',
  './matchday.css',
  './vendor/jspdf.umd.min.js',
  './vendor/three/three.module.min.js',
  './vendor/three/three.core.min.js',
  './vendor/three/OrbitControls.js',
  './js/basketball-positions.mjs',
  './js/matchday/model.mjs',
  './js/matchday/flow.mjs',
  './js/matchday/journal.mjs',
  './js/matchday/bridge.mjs',
  './js/matchday/controller.mjs',
  './js/matchday/view.mjs',
  './js/published-game-report.mjs',
  './data/published-game-reports/2026-10-04-lindau-ottobeuren.json',
  './js/matchday/roster-pdf.mjs',
  './js/matchday/live-shell.mjs',
  './js/matchday/opponent-plan.mjs',
  './js/live-game/bootstrap.js',
  './js/live-game/core.mjs',
  './js/live-game/boxscore.mjs',
  './js/live-game/clock.mjs',
  './js/live-game/journal.mjs',
  './js/live-game/merge.mjs',
  './js/live-game/bridge.mjs',
  './js/live-game/controller.mjs',
  './js/live-game/view.mjs',
  './js/live-game/report.mjs',
  './js/training-timer.js',
  './js/training-live.js',
  './js/station-training.js',
  './manifest.webmanifest',
  './fonts/inter-latin.woff2',
  './fonts/monoton-latin.woff2',
  './js/util.js',
  './js/storage.js',
  './js/coaching-staff.js',
  './js/coaching-staff.mjs',
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
  './js/opponents.js',
  './js/tablecrew.js',
  './js/season-ai-draft.js',
  './js/seasonplanner.js',
  './js/notes.js',
  './js/drills.js',
  './js/phase3-playbook.js',
  './js/tactics.js',
  './js/team-strategy.js',
  './js/screen-academy.js',
  './js/play-designer/main.js',
  './js/play-designer/styles.js',
  './js/play-designer/rendering.js',
  './js/play-designer/court-enhancements.js',
  './js/play-designer/layout-fix.js',
  './js/play-designer/timing-core.js',
  './js/play-designer/defensive-reactions.js',
  './js/play-designer/timing-fix.js',
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
  './js/play-designer/court-view.js',
  './js/play-designer/court-3d.js',
  './js/play-designer/athlete-rig.js',
  './js/play-designer/board-athlete-motion.js',
  './vendor/three/GLTFLoader.js',
  './vendor/three/SkeletonUtils.js',
  './vendor/three/BufferGeometryUtils.js',
  './js/play-designer/export-dialog.js',
  './js/play-designer/play-library.js',
  './js/play-designer/ai-explanation.js',
  './js/play-designer/quick-workflow.js',
  './js/play-designer/quick-reorder.js',
  './js/play-designer/tactic-trash.js',
  './js/play-designer/gif-encoder.js',
  './js/play-designer/pdf-writer.js',
  './js/play-designer/history.js',
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
  './js/ai-core.js',
  './js/aiimport.js',
  './js/schedule.js',
  './js/dashboard.js',
  './js/reports.js',
  './js/settings.js',
  './js/account.js',
  './js/install.js',
  './js/app.js',
  './assets/playbooks/phase3/five-out.pdf',
  './assets/playbooks/phase3/horns-1.pdf',
  './assets/playbooks/phase3/horns-2.pdf',
  './assets/playbooks/phase3/no-middle-defense.pdf',
  './assets/playbooks/phase3/zone-3-2-defense.pdf',
  './assets/playbooks/phase3/pnr-defense.pdf',
  './assets/playbooks/phase3/zone-2-3-defense.pdf',
  './assets/playbooks/phase3/zone-2-1-2-defense.pdf'
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
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => Promise.all(clients.map((client) => {
        if (typeof client.navigate !== 'function') return null;
        return client.navigate(client.url).catch(() => null);
      })))
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).pathname.startsWith('/api/')) return;
  // Leave native video byte ranges to the browser/CDN. Cache API cannot store
  // partial (206) responses or synthesize the ranges required for seeking.
  if (req.headers.has('Range') || new URL(req.url).pathname.startsWith('/assets/pnr/films/')) return;

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
