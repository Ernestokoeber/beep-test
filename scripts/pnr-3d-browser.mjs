import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({headless:true,...(process.env.E2E_BROWSER_CHANNEL ? {channel:process.env.E2E_BROWSER_CHANNEL} : {})});
const errors=[];
for (const mobile of [false,true]) {
 const context=await browser.newContext(mobile?{...devices['iPhone 15'],serviceWorkers:'block'}:{viewport:{width:1280,height:900},serviceWorkers:'block'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push({mobile,stack:e.stack}));
 await page.goto(baseUrl);
 await page.waitForFunction(()=>window.BT?.tactics?.__core);
 for (const id of ['pick-and-roll','pick-and-pop','pick-and-roll-reject']) {
  await page.evaluate(async id=>{
   window.testPlayer?.close();
   await import('/js/play-designer/timing-fix.js');
   const {openAnimationPlayer}=await import('/js/play-designer/animation-player.js');
   window.testPlayer=openAnimationPlayer(window.BT.tactics.templates().find(t=>t.id===id).board);
  },id);
  await page.waitForSelector('.chcv[data-view="film"] video');
  await page.waitForFunction(()=>document.querySelector('.chcv-film video').readyState>=2);
  const duration=await page.locator('.chcv-film video').evaluate(v=>v.duration);
  assert.ok(Math.abs(duration-14)<.1);
  assert.ok(await page.locator('.cha-controls').isHidden());
  await page.locator('[data-film-speed="0.5"]').click();
  assert.equal(await page.locator('.chcv-film video').evaluate(v=>v.playbackRate),.5);
  await page.locator('[data-film-speed="1"]').click();
  await page.locator('.chcv-film video').evaluate(async v=>{v.muted=true;await v.play();});
  await page.waitForFunction(()=>document.querySelector('.chcv-film video').currentTime>.25);
  await page.locator('.chcv-film video').evaluate(v=>{v.pause();v.currentTime=8;});
  await page.waitForFunction(()=>Math.abs(document.querySelector('.chcv-film video').currentTime-8)<.1);
  await page.locator('[data-view="2d"]').click();
  assert.ok(await page.locator('.cha-controls').isVisible());
  assert.ok(await page.locator('.chcv-film video').evaluate(v=>v.paused));
  await page.locator('[data-view="3d"]').click();
  await page.waitForSelector('.chcv[data-view="3d"] canvas');
  await page.waitForFunction(()=>document.querySelector('.chcv-status').textContent==='');
  assert.equal(await page.locator('.chcv-scene canvas').count(),1);
  await page.locator('[data-action="animation-toggle"]').click();
  await page.waitForFunction(()=>Number(document.querySelector('[data-role="animation-progress"]').value)>300);
  await page.locator('[data-action="animation-toggle"]').click();
  const time=await page.locator('[data-role="animation-progress"]').inputValue();
  await page.locator('[data-view="2d"]').click();
  assert.equal(await page.locator('[data-role="animation-progress"]').inputValue(),time);
  assert.ok(await page.locator('.chcv-2d').isVisible());
  await page.locator('[data-view="3d"]').click();
  await page.locator('[data-camera="top"]').click();
  await page.locator('[data-camera="reset"]').click();
  const size=await page.locator('.chcv-scene canvas').boundingBox();assert.ok(size.width>200&&size.height>250);
  if (process.env.E2E_SCREENSHOTS && id==='pick-and-roll') await page.screenshot({path:process.env.E2E_SCREENSHOTS + `/${mobile?'mobile':'desktop'}-pnr-3d.png`,fullPage:true});
  if(mobile){await page.setViewportSize({width:320,height:720});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.locator('[data-action="animation-reset"]').click();
  assert.equal(await page.locator('[data-role="animation-progress"]').inputValue(),'0');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log(`${mobile?'Mobile':'Desktop'} ${id}: 3D film playback, seeking, view switching and tactical controls passed`);
 }
 await page.evaluate(()=>window.testPlayer.close());assert.equal(await page.locator('.cha-overlay').count(),0);
 await page.evaluate(async()=>{
  const core=window.BT.tactics.__core,previousUser=core.currentUser,previousToken=window.BT.api.getToken;
  core.currentUser=()=>({role:'player'});window.BT.api.getToken=()=> 'local-test';
  try {const {mountPlayer}=await import('/js/play-designer/viewer.js');window.teamStage=document.createElement('div');window.teamStage.style.cssText='position:fixed;inset:0;z-index:1500;background:white;overflow:auto';document.body.append(window.teamStage);mountPlayer(window.teamStage);}
  finally {core.currentUser=previousUser;window.BT.api.getToken=previousToken;}
 });
 await page.locator('.chpd-player-list button[data-id="pick-and-roll"]').click();
 await page.waitForSelector('.chcv[data-view="film"] video');
 assert.ok(await page.locator('.chpd-transport').isHidden());
 await page.locator('[data-view="2d"]').click();assert.ok(await page.locator('.chpd-transport').isVisible());
 await page.evaluate(()=>window.teamStage.remove());
 console.log(`${mobile?'Mobile':'Desktop'} published Team-Plays: film and tactical transport passed`);
 await context.close();
}
const context=await browser.newContext({serviceWorkers:'block'});const page=await context.newPage();
await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2')return null;return original.call(this,type,...args);};});
await page.goto(baseUrl);await page.waitForFunction(()=>window.BT?.tactics?.__core);
await page.evaluate(async()=>{await import('/js/play-designer/timing-fix.js');const {openAnimationPlayer}=await import('/js/play-designer/animation-player.js');const board=window.BT.tactics.templates().find(t=>t.id==='pick-and-roll').board;board.builtIn=false;openAnimationPlayer(board);});
await page.waitForFunction(()=>document.querySelector('.chcv-status').textContent.includes('nicht verfügbar'));
assert.ok(await page.locator('.chcv-2d').isVisible());console.log('WebGL unavailable: working 2D fallback passed');
assert.deepEqual(errors,[]);
await context.close();
const failedContext=await browser.newContext({serviceWorkers:'block'});const failedPage=await failedContext.newPage();
await failedPage.route('**/assets/pnr/films/*.mp4',route=>route.abort());
await failedPage.goto(baseUrl);await failedPage.waitForFunction(()=>window.BT?.tactics?.__core);
await failedPage.evaluate(async()=>{await import('/js/play-designer/timing-fix.js');const {openAnimationPlayer}=await import('/js/play-designer/animation-player.js');openAnimationPlayer(window.BT.tactics.templates().find(t=>t.id==='pick-and-roll').board);});
await failedPage.waitForFunction(()=>document.querySelector('.chcv-status').textContent.includes('nicht geladen'));
assert.ok(await failedPage.locator('.chcv-2d').isVisible());assert.ok(await failedPage.locator('.cha-controls').isVisible());
await failedContext.close();console.log('Failed film download: working 2D fallback passed');
console.log('PnR 3D browser checks passed without page errors.');
await browser.close();


