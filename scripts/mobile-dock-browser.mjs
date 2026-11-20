// Isolated shell regression: real CSS/layout, synthetic viewport changes only.
import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
const probe=createServer(); await new Promise(r=>probe.listen(0,'127.0.0.1',r));
const port=probe.address().port; await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
try {
 for (const engine of [chromium,webkit]) {
  const browser=await engine.launch({headless:true});
  try {
   for (const width of [320,390,430]) {
    const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
    await context.route('**/api/**',route=>route.fulfill({status:401,contentType:'application/json',body:'{}'}));
    await context.addInitScript(()=>{
     const viewport=new EventTarget(); Object.assign(viewport,{height:844,offsetTop:0,scale:1});
     Object.defineProperty(window,'visualViewport',{value:viewport});
    });
    const page=await context.newPage();
    for (const route of ['team','friday-individual']) {
     await page.goto(`http://127.0.0.1:${port}/#/${route}`);
     await page.locator('.mobile-dock').waitFor();
     // A long empty fixture tests the shell independently of any private data.
     await page.locator('#app').evaluate(el=>{el.style.minHeight='3000px';});
     const assertBottom=async expected=>{
      await page.waitForFunction(expected=>Math.abs(document.querySelector('.mobile-dock').getBoundingClientRect().bottom-expected)<1,expected);
      const box=await page.locator('.mobile-dock').boundingBox();
      assert.equal(Math.round(box.width),width);
      assert(box.height>44 && box.height<160,'Dock retains usable height');
      assert(await page.locator('.mobile-dock a:visible').first().isVisible());
     };
     await assertBottom(844);
     for (const y of [600,1700,0]) {
      await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);
      await assertBottom(844);
     }
     // Keyboard shrinks/pans the visual viewport while layout height stays stale.
     await page.evaluate(()=>{Object.assign(visualViewport,{height:510,offsetTop:42});visualViewport.dispatchEvent(new Event('resize'));});
     await assertBottom(552);
     await page.evaluate(()=>scrollTo({top:1200,behavior:'instant'}));
     await assertBottom(552);
     // Dismissal without resize: focusout/pageshow still recalculate the dock.
     await page.evaluate(()=>{Object.assign(visualViewport,{height:844,offsetTop:0});document.dispatchEvent(new Event('focusout'));});
     await assertBottom(844);
     // Late keyboard-animation metrics are recovered by the settle pass.
     await page.evaluate(()=>{document.dispatchEvent(new Event('focusout'));setTimeout(()=>{visualViewport.height=800;},100);});
     await assertBottom(800);
     await page.evaluate(()=>{visualViewport.height=844;dispatchEvent(new Event('pageshow'));});
     await assertBottom(844);
     await page.evaluate(()=>{Object.assign(visualViewport,{height:422,scale:2});visualViewport.dispatchEvent(new Event('resize'));});
     await page.waitForFunction(()=>document.documentElement.dataset.viewportZoomed==='true');
     assert.equal(await page.locator('.mobile-dock').evaluate(el=>getComputedStyle(el).bottom),'0px');
     await page.evaluate(()=>{Object.assign(visualViewport,{height:844,scale:1});visualViewport.dispatchEvent(new Event('resize'));});
     await assertBottom(844);
     // Real viewport resize (rotation/browser chrome), not only mocked metrics.
     await page.setViewportSize({width,height:640});
     await page.evaluate(()=>{visualViewport.height=640;dispatchEvent(new Event('resize'));});
     await assertBottom(640);
     await page.setViewportSize({width,height:844});
     await page.evaluate(()=>{visualViewport.height=844;dispatchEvent(new Event('resize'));});
     await assertBottom(844);
     console.log(`${engine.name()} ${width}px ${route}: scroll, keyboard, resume, zoom and resize passed`);
    }
    await context.close();
   }
  } finally {await browser.close();}
 }
} finally {server.kill();}
