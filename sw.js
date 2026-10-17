// Bump this whenever any app file or the offline asset manifest changes.
// Cached files stay fixed for a release; the new worker installs the next release.
const CACHE = 'courthub-v246';
const ASSETS = [
  './js/library-pages.js',
  './js/individual-player-view.js',
  './js/individual-invite.js',
  './data/individual-player-preview.json',
  './library-pages.css',
  './js/scouting-model.js',
  './js/scouting-pages.js',
  './scouting-pages.css',
  './js/calendar.js',
  './js/insight-model.js',
  './js/insights.js',
  './js/coach-briefing.js',
  './js/training-shots.js',
  './',
  './index.html',
  './style.css',
  './app-navigation.css',
  './training-pages.css',
  './tactics-pages.css',
  './game-pages.css',
  './js/game-pages.js',
  './js/play-designer/pages.js',
  './js/play-designer/draft-session.js',
  './js/navigation.js',
  './training-timer.css',
  './training-live.css',
  './station-training.css',
  './live-game.css',
  './matchday.css',
  './individual-training.css',
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
  './js/published-report-delivery.mjs',
  './data/published-game-reports/index.json',
  './data/published-game-reports/2026-10-04-lindau-ottobeuren.json',
  './data/published-game-reports/2026-10-17-wasserburg-lindau.json',
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
  './js/live-game/export.mjs',
  './js/training-timer.js',
  './js/training-live.js',
  './js/training-instructions.js',
  './js/station-training.js',
  './manifest.webmanifest',
  './assets/TSVLogotransparent.png',
  './fonts/inter-latin.woff2',
  './fonts/monoton-latin.woff2',
  './js/util.js',
  './js/development-core.js',
  './js/storage.js',
  './js/coaching-staff.js',
  './js/coaching-staff.mjs',
  './js/api.js',
  './js/individual-training.js',
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
  './js/training-pages.js',
  './js/development-import.js',
  './js/games.js',
  './js/opponents.js',
  './js/tablecrew.js',
  './js/jerseys.js',
  './jerseys.css',
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
      Promise.all(keys.filter((k) => k.startsWith('courthub-') && k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // Leave native video byte ranges to the browser/CDN. Cache API cannot store
  // partial (206) responses or synthesize the ranges required for seeking.
  if (req.headers.has('Range') || url.pathname.startsWith('/assets/pnr/films/')) return;

  // New reports must be discoverable without a new installed app release.
  if (url.pathname === '/data/published-game-reports/index.json') {
    event.respondWith(caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req);
      try {
        const fresh = await fetch(req);
        if (fresh?.ok) { await cache.put(req, fresh.clone()).catch(() => {}); return fresh; }
        return cached || fresh;
      } catch (error) { if (cached) return cached; throw error; }
    }));
    return;
  }

  // App files belong to this release. Download them once; a new worker/cache
  // supplies updates atomically instead of refreshing every file on every visit.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          await cache.put(req, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch (err) {
        if (req.mode === 'navigate') {
          const shell = await cache.match('./index.html');
          if (shell) return shell;
        }
        throw err;
      }
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { payload = {}; }
  event.waitUntil(self.registration.showNotification(payload.title || 'CourtHub', {
    body: payload.body || 'Neue Erinnerung im Individual Training.',
    tag: payload.tag || 'courthub-individual',
    data: { url: payload.url || '/#/individual' },
    icon: './icons/logo-192.png',
    badge: './icons/logo-192.png'
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/#/individual', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const current = clients.find(client => client.url.startsWith(self.location.origin));
    if (current) {
      await current.focus();
      return current.navigate(target);
    }
    return self.clients.openWindow(target);
  }));
});

