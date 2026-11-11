import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdirSync} from 'node:fs';
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j);});
let browser;
try {
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined});
 mkdirSync('/tmp/courthub-catalog-screenshots',{recursive:true});
 for(const width of [320,390,1280]) {
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600,serviceWorkers:'allow',reducedMotion:'reduce'});
  await context.route('**/api/**',route=>route.fulfill({status:401,contentType:'application/json',body:'{}'}));
  await context.addInitScript(()=>{window.BT={};let sync;Object.defineProperty(BT,'sync',{configurable:true,get:()=>sync,set(value){sync=value;const get=value.getState;value.getState=()=>({...get(),sessionEpoch:1,user:{id:'catalog-coach',role:'coach',organization:{id:'catalog-team'}}});}});});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  const base='http://127.0.0.1:'+port;
  const check=async label=>{assert(await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)<=innerWidth+1),label+': horizontal overflow');assert.deepEqual(errors,[]);await page.screenshot({path:'/tmp/courthub-catalog-screenshots/'+label+'-'+width+'.png',fullPage:true});};
  await page.goto(base+'/#/drills');await page.locator('[data-library-item]').first().waitFor();
  assert.equal(await page.evaluate(()=>BT.exerciseCatalog.all().length),400);assert.equal(await page.evaluate(()=>BT.storage.getDrills().length),0);
  assert.equal(await page.locator('[data-library-item]').count(),40);await check('catalog');
  await page.getByText('Weitere Filter',{exact:true}).click();
  await page.locator('[name=players]').selectOption('2');await page.locator('[name=level]').selectOption('Grundlagen');await page.locator('[name=minutes]').selectOption('10');
  await page.locator('[name=search]').fill('Führhand');await page.locator('[data-library-item]').first().waitFor();await check('filters');
  const name=await page.locator('[data-library-item] strong').first().innerText();await page.locator('[data-favorite]').first().click();await page.waitForFunction(()=>BT.storage.getSetting('exerciseFavorites',[]).length===1);
  await page.locator('[data-library-item] a').first().click();await page.locator('[data-catalog-copy]').waitFor();assert.equal(await page.locator('a[href^="#/drills/catalog-"]').count(),3);await check('detail');
  await page.locator('[data-catalog-copy]').click();await page.locator('.library-editor').waitFor();await page.locator('[name=name]').fill('Meine eigene Katalogübung');await page.getByRole('button',{name:'Übung speichern',exact:true}).click();await page.locator('[data-library-page=detail]').waitFor();
  assert.equal(await page.evaluate(()=>BT.storage.getDrills().length),1);assert.equal(await page.evaluate(()=>BT.exerciseCatalogSeed.length),400);
  await page.goto(base+'/#/drills');await page.locator('[data-clear-filters]').waitFor();await page.locator('[data-clear-filters]').click();await page.locator('[name=source]').selectOption('favorites');assert.equal(await page.locator('[data-library-item]').count(),1);
  const training=await page.evaluate(async()=>{const t=BT.storage.upsertTraining({date:'2026-12-01',plan:{drills:[]}});await BT.storage.flush();return t.id;});
  await page.goto(base+'/#/training/'+training+'/plan/library');await page.locator('[data-catalog-pick]').first().waitFor();await page.locator('[name=search]').fill(name);await page.locator('[data-catalog-pick]').first().click();await page.waitForFunction(id=>BT.storage.getTraining(id).plan.drills.length===1,training);await check('team-picker');
  // Mount the real individual editor with an isolated plan fixture; no real account or session is changed.
  await page.goto(base+'/#/drills');await page.locator('[data-library-count]').waitFor();
  await page.evaluate(()=>{const host=document.querySelector('#app');host.replaceChildren();BT.api.individualAction=async(action,body)=>{window.savedCatalogPlan={action,body};};BT.individualPlanEditor.mount(host,{profile:{id:'fixture-player'},session:{id:'fixture-session',status:'planned'},plan:{id:'fixture-plan',title:'Katalogtest',objective:'Wurfkontrolle',version:1},exercises:[],measurements:[],refresh:async()=>{}});});
  await page.locator('[data-open-exercise-catalog]').click();await page.locator('[name=search]').fill(name);await page.locator('[name=search]').press('Enter');assert.equal(await page.evaluate(()=>!!window.savedCatalogPlan),false);
  await page.locator('[data-catalog-pick]').first().click();await page.locator('[data-review-exercises] fieldset').waitFor();await page.locator('[data-close-exercise-catalog]').click();
  await page.locator('[data-review-exercises] [name=minutes]').fill('11');await page.locator('[name=observation]').fill('Privates Ergebnis aus Test');
  await page.locator('[data-save-review-library]').click();await page.waitForFunction(()=>BT.storage.getDrills().length===2);assert(!(await page.evaluate(()=>JSON.stringify(BT.storage.getDrills()))).includes('Privates Ergebnis'));
  await check('individual-editor');await page.locator('.individual-plan-editor form > button[type=submit]').click();await page.waitForFunction(()=>!!window.savedCatalogPlan);assert.equal(await page.evaluate(()=>window.savedCatalogPlan.body.exercises[0].durationMinutes),'11');
  if(width===390) {
   await page.goto(base+'/#/drills');await page.locator('[data-library-count]').waitFor();await page.locator('[data-clear-filters]').click();
   await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));await BT.storage.flush();});
   await context.setOffline(true);await page.reload();await page.locator('[data-library-count]').waitFor();assert.equal(await page.evaluate(()=>BT.exerciseCatalogSeed.length),400);
   await page.locator('[name=search]').fill('Short Roll');assert.equal(await page.locator('[data-library-item]').count(),4);await page.locator('[data-library-item] a').first().click();await page.locator('[data-catalog-copy]').waitFor();await check('offline-detail');
   await page.evaluate(()=>document.documentElement.dataset.theme='dark');await check('dark-detail');await context.setOffline(false);
  }
  console.log(width+'px: catalog, filters, favorites, own copy, team/individual selection and private-note exclusion passed');await context.close();
 }
}finally{await browser?.close();server.kill();}
