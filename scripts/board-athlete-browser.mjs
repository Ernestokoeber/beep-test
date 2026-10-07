import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, ...(process.env.E2E_BROWSER_CHANNEL ? { channel: process.env.E2E_BROWSER_CHANNEL } : {}) });
const errors = [];
try {
 for (const mobile of [false, true]) {
  const context = await browser.newContext(mobile ? { ...devices['iPhone 15'], serviceWorkers: 'block' } : { viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto(base); await page.waitForFunction(() => window.BT?.tactics?.__core);
  const result = await page.evaluate(async () => {
   await import('/js/play-designer/timing-fix.js');
   const core = window.BT.tactics.__core;
   const quick = await import('/js/play-designer/quick-core.js');
   let board = core.defaultBoard(); board.id = 'custom-athlete-test'; board.builtIn = false; board.title = 'Eigener Lauf, Screen und Pass';
   const first = board.steps[0], guard = core.elementById(first, 'o1'), big = core.elementById(first, 'o5');
   Object.assign(core.elementById(first, 'ball'), { x: guard.x + 16, y: guard.y });
   board = quick.addQuickMove(board, { stepIndex: 0, relation: 'after', actorId: 'o1', path: [{ x: guard.x, y: guard.y }, { x: 325, y: 315 }, { x: 390, y: 250 }] }, core);
   board = quick.addQuickScreen(board, { stepIndex: 0, relation: 'same', actorId: 'o5', point: { x: big.x, y: big.y }, angle: 30 }, core);
   board = quick.addQuickPass(board, { stepIndex: 0, relation: 'after', fromId: 'o1', toId: 'o3' }, core);
   window.customBoard = JSON.parse(JSON.stringify(board));
   const { createCourt3D, worldPoint } = await import('/js/play-designer/court-3d.js');
   const host = document.createElement('div'); host.style.cssText = 'width:600px;height:450px'; document.body.append(host);
   const view = await createCourt3D(host, () => {}, { board: window.customBoard });
   const total = window.BT.tactics.boardDuration(board); let maximumRootError = 0, bones = 0;
   const poseAt = time => { const snapshot = window.BT.tactics.snapshotAt(board, time); view.draw(snapshot, time); return snapshot; };
   for (const t of [0, .2, .6, 1, total * .4, total * .7, total]) {
    const snapshot = poseAt(t);
    for (const element of snapshot.elements.filter(e => ['offense', 'defense'].includes(e.type))) {
     const player = view.actors.get(element.id);
     maximumRootError = Math.max(maximumRootError, player.group.position.distanceTo(worldPoint(element)));
     bones = Object.keys(player.bones).length;
    }
   }
   const feet = () => ['l', 'r'].flatMap(side => view.actors.get('o5').bones['foot_' + side].getWorldPosition(worldPoint({ x: 250, y: 235 })).toArray());
   poseAt(.2); const planted = feet(); poseAt(.6); const later = feet();
   const screenDrift = Math.max(...later.map((x, i) => Math.abs(x - planted[i])));
   poseAt(total * .4); const before = [...view.actors.values()].flatMap(p => Object.values(p.bones).flatMap(b => b.matrixWorld.elements));
   poseAt(total); poseAt(total * .4); const after = [...view.actors.values()].flatMap(p => Object.values(p.bones).flatMap(b => b.matrixWorld.elements));
   const seekDifference = Math.max(...after.map((x, i) => Math.abs(x - before[i])));
   view.destroy(); host.remove();
   const { createBoardAthleteMotion } = await import('/js/play-designer/board-athlete-motion.js');
   let pick = core.defaultBoard();
   pick = quick.addQuickPickAndRoll(pick, { stepIndex: 0, relation: 'after', handlerId: 'o1', screenerId: 'o5', screenPoint: { x: 286, y: 286 }, handlerPath: [{ x: 286, y: 330 }, { x: 330, y: 205 }], rollPath: [{ x: 286, y: 286 }, { x: 250, y: 108 }] }, core);
   const screen = pick.steps[0].transition.screens[0], gait = createBoardAthleteMotion(pick, window.BT.tactics.snapshotAt, window.BT.tactics.boardDuration(pick));
   const stanceA = gait.state('o5', screen.start + screen.duration * .25), stanceB = gait.state('o5', screen.start + screen.duration * .75);
   const groupedScreenDrift = Math.max(...['l', 'r'].flatMap(side => ['x', 'z'].map(key => Math.abs(stanceA.feet[side][key] - stanceB.feet[side][key]))));
   const groupedStanding = stanceA.screen && stanceB.screen;
   const previousCanEdit = core.canEdit; core.canEdit = () => true;
   window.BT.storage.setSetting('tacticsBoardDraft', window.customBoard);
   const { mountQuickEditor } = await import('/js/play-designer/quick-editor.js');
   const stage = document.createElement('div'); stage.style.cssText = 'position:fixed;inset:0;overflow:auto;background:white;z-index:1000'; document.body.append(stage);
   window.editorStage = stage; mountQuickEditor(stage); core.canEdit = previousCanEdit;
   return { maximumRootError, bones, screenDrift, groupedScreenDrift, groupedStanding, seekDifference, total };
  });
  assert.ok(result.maximumRootError < 1e-8, JSON.stringify(result));
  assert.equal(result.bones, 52); assert.ok(result.screenDrift < .002, JSON.stringify(result));
  assert.ok(result.seekDifference < 1e-8, JSON.stringify(result));
  assert.ok(result.groupedStanding && result.groupedScreenDrift < .002, JSON.stringify(result));
  await page.locator('[data-action="open-3d"]').click();
  await page.waitForSelector('.chcv[data-view="3d"] canvas');
  await page.waitForFunction(() => document.querySelector('.chcv-status').textContent === '');
  assert.equal(await page.locator('[data-view="film"]').count(), 0);
  assert.ok(await page.locator('.cha-controls').isVisible());
  await page.locator('[data-action="animation-toggle"]').click();
  await page.waitForFunction(() => Number(document.querySelector('[data-role="animation-progress"]').value) > 250);
  await page.locator('[data-action="animation-toggle"]').click();
  await page.locator('[data-role="animation-progress"]').fill('600');
  await page.locator('[data-role="animation-progress"]').dispatchEvent('input');
  await page.locator('[data-view="2d"]').click();
  assert.equal(await page.locator('[data-role="animation-progress"]').inputValue(), '600');
  await page.locator('[data-view="3d"]').click();
  await page.locator('[data-camera="top"]').click(); await page.locator('[data-camera="reset"]').click();
  await page.locator('[data-camera="close"]').click();
  if (mobile) await page.setViewportSize({ width: 320, height: 720 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  if (process.env.E2E_SCREENSHOTS) { mkdirSync(process.env.E2E_SCREENSHOTS, { recursive: true }); await page.screenshot({ path: `${process.env.E2E_SCREENSHOTS}/${mobile ? 'mobile' : 'desktop'}-custom-3d.png` }); }
  await page.locator('[data-action="animation-close"]').click();
  assert.equal(await page.locator('.cha-overlay').count(), 0);
  console.log(`${mobile ? 'Mobile' : 'Desktop'} custom board: 52-joint athletes, exact board positions, planted screen, deterministic seeking, editor 3D button and playback passed`);
  await context.close();
 }
 const context = await browser.newContext({ serviceWorkers: 'block' }), page = await context.newPage();
 page.on('pageerror', e => errors.push(e.message));
 await page.route('**/athlete.glb', route => route.abort()); await page.goto(base);
 await page.waitForFunction(() => window.BT?.tactics?.__core);
 await page.evaluate(async () => { await import('/js/play-designer/timing-fix.js'); const { openAnimationPlayer } = await import('/js/play-designer/animation-player.js'); const board = window.BT.tactics.__core.defaultBoard(); board.builtIn = false; window.player = openAnimationPlayer(board, { initialView: '3d' }); });
 await page.waitForFunction(() => document.querySelector('.chcv-status').textContent.includes('nicht verfügbar'));
 assert.ok(await page.locator('.chcv-2d').isVisible()); assert.ok(await page.locator('.cha-controls').isVisible());
 console.log('Missing athlete asset: usable 2D fallback passed'); await context.close();
 const slowContext = await browser.newContext({ serviceWorkers: 'block' }), slowPage = await slowContext.newPage();
 slowPage.on('pageerror', e => errors.push(e.message));
 await slowPage.route('**/athlete.glb', async route => { await new Promise(resolve => setTimeout(resolve, 400)); await route.continue(); });
 await slowPage.goto(base); await slowPage.waitForFunction(() => window.BT?.tactics?.__core);
 const athleteRequest = slowPage.waitForRequest('**/athlete.glb');
 await slowPage.evaluate(async () => {
  await import('/js/play-designer/timing-fix.js'); const { openAnimationPlayer } = await import('/js/play-designer/animation-player.js');
  const board = window.BT.tactics.__core.defaultBoard(); board.builtIn = false;
  window.slowPlayer = openAnimationPlayer(board, { initialView: '3d' });
 });
 await athleteRequest; await slowPage.locator('[data-action="animation-close"]').click();
 await slowPage.waitForTimeout(1000); assert.equal(await slowPage.locator('.chcv').count(), 0);
 console.log('Closing while the model loads: no late player or page errors'); await slowContext.close();
 assert.deepEqual(errors, []);
} finally { await browser.close(); }
