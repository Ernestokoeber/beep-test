import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, ...(process.env.E2E_BROWSER_CHANNEL ? { channel: process.env.E2E_BROWSER_CHANNEL } : {}) });
try {
 const context = await browser.newContext({ ...devices['iPhone 15'], serviceWorkers: 'allow' });
 const page = await context.newPage(), errors = [];
 page.on('pageerror', error => errors.push(error.message));
 let navigations = 0;
 const installed = new Promise(resolve => page.on('framenavigated', frame => { if (frame === page.mainFrame() && ++navigations === 2) resolve(); }));
 await page.goto(base);
 // The app reloads controlled clients once when its first SW activates.
 await Promise.race([installed, page.waitForTimeout(15000).then(() => { throw new Error('PWA installation did not complete'); })]);
 await page.waitForLoadState('load');
 await page.waitForFunction(() => navigator.serviceWorker.controller && window.BT?.tactics?.__core);
 const large = await page.evaluate(async () => {
  await import('/js/play-designer/timing-fix.js');
  const core = window.BT.tactics.__core, board = core.defaultBoard();
  board.steps = Array.from({ length: 80 }, (_, index) => {
   const step = core.cloneStep(board.steps[0]); step.duration = 2;
   const guard = core.elementById(step, 'o1'); guard.x = index % 2 ? 290 : 210;
   const ball = core.elementById(step, 'ball'); ball.x = guard.x + 16; ball.y = guard.y;
   step.transition.motions = [{ id: 'release-' + index, elementId: 'o1', type: 'move', kind: 'dribble', start: 0, duration: 1, path: [{ x: guard.x, y: guard.y }, { x: index % 2 ? 210 : 290, y: guard.y }] }];
   return step;
  });
  const read = core.createSnapshotReader(board), total = window.BT.tactics.boardDuration(board);
  const start = performance.now(); let maxDifference = 0;
  for (let index = 0; index < 200; index++) read(index * total / 200);
  const playbackMs = performance.now() - start;
  for (const time of [0, 1.2, 2, 55.5, 120.2, total]) {
   const actual = read(time), expected = window.BT.tactics.snapshotAt(board, time);
   for (const element of actual.elements) {
    const reference = expected.elements.find(e => e.id === element.id);
    maxDifference = Math.max(maxDifference, Math.hypot(element.x - reference.x, element.y - reference.y));
   }
  }
  const own = core.defaultBoard(); own.id = 'release-offline'; own.title = 'Offline-Test'; own.builtIn = false;
  window.BT.storage.setSetting('tacticsBoardDraft', own);
  window.openReleasePlayer = async () => { const { openAnimationPlayer } = await import('/js/play-designer/animation-player.js'); window.releasePlayer = openAnimationPlayer(window.BT.storage.getSetting('tacticsBoardDraft'), { initialView: '3d' }); };
  return { playbackMs, maxDifference };
 });
 assert.ok(large.playbackMs < 1000, JSON.stringify(large)); assert.ok(large.maxDifference < 1e-8);
 console.log(`80-phase board: 200 prepared snapshots in ${large.playbackMs.toFixed(1)} ms, matching uncached positions`);
 await context.setOffline(true); await page.evaluate(() => window.openReleasePlayer());
 await page.waitForFunction(() => document.querySelector('.chcv-status').textContent.includes('nicht verfügbar'));
 assert.ok(await page.locator('.chcv-2d').isVisible());
 await context.setOffline(false); await page.locator('[data-view="3d"]').click();
 await page.waitForFunction(() => document.querySelector('.chcv').dataset.view === '3d' && document.querySelector('.chcv-status').textContent === '', null, { timeout: 60000 });
 await page.waitForFunction(async () => !!(await caches.match(new URL('/assets/pnr/players/athlete.glb', location.origin).href)));
 await page.locator('[data-action="animation-close"]').click();
 await context.setOffline(true); await page.reload();
 await page.waitForFunction(() => window.BT?.tactics?.__core);
 await page.evaluate(async () => { await import('/js/play-designer/timing-fix.js'); const { openAnimationPlayer } = await import('/js/play-designer/animation-player.js'); window.releasePlayer = openAnimationPlayer(window.BT.storage.getSetting('tacticsBoardDraft'), { initialView: '3d' }); });
 await page.waitForFunction(() => document.querySelector('.chcv').dataset.view === '3d' && document.querySelector('.chcv-status').textContent === '', null, { timeout: 60000 });
 assert.equal(await page.locator('.chcv-scene canvas').count(), 1);
 await page.locator('[data-action="animation-toggle"]').click();
 await page.waitForFunction(() => Number(document.querySelector('[data-role="animation-progress"]').value) > 250);
 assert.deepEqual(errors, []);
 console.log('PWA: cold offline 2D fallback, online recovery, cached 3D model and offline reload/playback passed');
 await context.close();
} finally { await browser.close(); }
