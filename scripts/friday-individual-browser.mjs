import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdirSync} from 'node:fs';
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
let browser;
try {
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
  mkdirSync('/tmp/courthub-friday-screenshots',{recursive:true});
  for(const width of [320,390,1280]) {
    const context=await browser.newContext({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600,serviceWorkers:'allow',reducedMotion:'reduce'});
    await context.route('**/api/**',route=>route.fulfill({status:401,contentType:'application/json',body:'{}'}));
    await context.addInitScript(()=>{window.BT={};let sync;Object.defineProperty(BT,'sync',{configurable:true,get:()=>sync,set(value){sync=value;const get=value.getState;value.getState=()=>({...get(),sessionEpoch:1,user:{id:'friday-coach',role:'coach',organization:{id:'friday-fixture'}}});}});});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
    const base='http://127.0.0.1:'+port;
    const check=async name=>{assert(await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)<=innerWidth+1),name+' overflows at '+width);assert.deepEqual(errors,[]);await page.screenshot({path:'/tmp/courthub-friday-screenshots/'+name+'-'+width+'.png',fullPage:true});};
    try {
      await page.goto(base+'/#/dashboard');await page.locator('[data-workspace="friday-individual"]').click();
      await page.locator('[data-friday-item]').first().waitFor();assert.equal(await page.evaluate(()=>BT.fridayPositionExercises.length),500);
      assert.equal(await page.locator('[data-friday-item]').count(),20);await check('overview');
      for(const position of ['pg','sg','sf','pf','c']) {
        await page.locator('.friday-position[href="#/friday-individual?position='+position+'"]').click();
        await page.waitForFunction(p=>location.hash==='#/friday-individual?position='+p && document.querySelector('[data-friday-count]')?.textContent.includes('100 Übungen'),position);
        await page.locator('[name=task]').selectOption('Konter finden');assert.equal(await page.locator('[data-friday-item]').count(),20);
      }
      await check('center-filter');await page.locator('[name=search]').fill('Drop-Step');assert.equal(await page.locator('[data-friday-item]').count(),3);
      await page.locator('[data-friday-item] a').first().click();await page.locator('[data-friday-page=detail]').waitFor();
      assert.equal(await page.locator('.friday-task-links a').count(),4);await check('detail');
      await page.goBack();await page.locator('[data-friday-page=list]').waitFor();assert.equal(await page.locator('[name=search]').inputValue(),'Drop-Step');
      await page.locator('[data-friday-reset]').click();await page.locator('[data-friday-more]').click();assert.equal(await page.locator('[data-friday-item]').count(),40);
      await page.locator('[name=players]').selectOption('1');assert.equal(await page.locator('[data-friday-item]').count(),2);
      const untouched=await page.evaluate(()=>({trainings:BT.storage.getTrainings().length,drills:BT.storage.getDrills().length}));assert.deepEqual(untouched,{trainings:0,drills:0});
      if(width===390) {
        await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
        await context.setOffline(true);await page.reload();await page.locator('[data-friday-page=list]').waitFor();
        assert.equal(await page.evaluate(()=>BT.fridayPositionExercises.length),500);
        await page.locator('[data-friday-reset]').click();await page.locator('[data-friday-item] a').first().click();await page.locator('[data-friday-page=detail]').waitFor();await check('offline-detail');
        await page.evaluate(()=>document.documentElement.dataset.theme='dark');await check('dark-detail');await context.setOffline(false);
      }
      console.log(width+'px: separate workspace, five 100-card positions, task/search/resource filters, details, back state and no plan writes passed.');
    } catch(error) {await page.screenshot({path:'/tmp/courthub-friday-screenshots/failure-'+width+'.png',fullPage:true}).catch(()=>{});throw error;}
    finally {await context.close();}
  }
} finally {await browser?.close();server.kill();}
