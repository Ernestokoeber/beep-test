import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {existsSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || (existsSync(chromium.executablePath())?undefined:'msedge')});
const base='http://127.0.0.1:'+port,shots=join(tmpdir(),'courthub-consistency-audit');mkdirSync(shots,{recursive:true});
try{
 for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,locale:'de-DE',serviceWorkers:'block'});
  await context.route('**/api/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{}'}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#/training');await page.locator('[data-training-page="list"]').waitFor();
  const ids=await page.evaluate(async()=>{
   window.auditUser={id:'test-reader',role:'viewer',organization:{id:'audit-org'}};
   const original=BT.sync.getState;BT.sync.getState=()=>({...original(),user:window.auditUser});
   const p=BT.storage.upsertPlayer({name:'Testspieler'}),t=BT.storage.upsertTraining({date:BT.util.todayISO(),attendance:[{playerId:p.id,status:'present'}],freethrows:[{playerId:p.id,made:4,attempted:10}],shots:[{category:'Zweier',entries:[{playerId:p.id,made:3,attempted:10}]},{category:'Dreier',entries:[{playerId:p.id,made:2,attempted:10}]}],plan:{summary:'Defensiv zusammenarbeiten',drills:[{name:'Closeout',minutes:10}]}});
   BT.storage.upsertTraining({date:'2026-09-01',status:'completed',attendance:[{playerId:p.id,status:'present'}],freethrows:[{playerId:p.id,made:8,attempted:10}],shots:[{category:'Zweier',entries:[{playerId:p.id,made:7,attempted:10}]}]});
   const g=BT.storage.upsertGame({date:'2099-10-20',home:'TSV Lindau',away:'Testgegner',score:'0:0'});
   await BT.storage.flush();return {training:t.id,game:g.id,before:JSON.stringify(BT.storage.getTraining(t.id))};
  });
  const visit=async pageName=>{await page.goto(base+'/#/training/'+ids.training+'/'+pageName);await page.locator('[data-training-page="'+pageName+'"]').waitFor();};
  const check=async name=>{
   await page.locator('#app').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+': horizontaler Überlauf');
   assert.deepEqual(errors,[]);await page.screenshot({path:join(shots,name+'-'+width+'.png'),fullPage:true});
  };
  await visit('plan');assert(await page.locator('[data-plan-summary]').isDisabled());await check('lesender-plan');
  await page.locator('.tp-drill-link').click();await page.locator('[data-training-page="drill"]').waitFor();assert(await page.locator('[name="name"]').isDisabled());
  await visit('shots');await page.locator('.shot-tab').filter({hasText:'Dreier'}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.shots-list input')].every(e=>e.disabled));await check('lesende-wurfkategorie');
  assert.equal(await page.evaluate(id=>JSON.stringify(BT.storage.getTraining(id)),ids.training),ids.before);
  await visit('analysis');assert.match(await page.locator('.pane[data-pane="analysis"] .delta-badge').first().textContent(),/Prozentpunkte/);await check('quoten-in-prozentpunkten');
  await page.evaluate(()=>window.auditUser.role='coach');await visit('live');
  const beforeLive=await page.evaluate(id=>JSON.stringify(BT.storage.getTraining(id)),ids.training);
  await page.evaluate(()=>{window.auditUser.role='viewer';document.querySelector('[data-live-action="finish"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));window.dispatchEvent(new Event('pagehide'));});
  await page.waitForFunction(()=>document.querySelector('[data-live-action="finish"]').disabled);await check('gesperrte-live-durchfuehrung');
  await page.goto(base+'/#/team');await page.locator('.mobile-home').waitFor();
  assert.equal(await page.evaluate(id=>JSON.stringify(BT.storage.getTraining(id)),ids.training),beforeLive);
  await page.evaluate(id=>BT.storage.upsertTraining({...BT.storage.getTraining(id),status:'completed',endedAt:new Date().toISOString()}),ids.training);
  await page.goto(base+'/#/briefing');await page.getByRole('heading',{name:'Trainerbriefing',exact:true}).waitFor();
  await page.goto(base+'/#/team');await page.locator('.mobile-home').waitFor();
  await page.waitForFunction(id=>document.querySelector('[data-role="home-next"]')?.getAttribute('href')==='#/games/'+id,ids.game);
  await page.locator('[data-role="home-notices"] > summary').click();
  assert.match(await page.locator('[data-role="home-notices-list"]').innerText(),/Spielkader|Starting Five/);
  assert.equal(await page.locator('[data-role="home-next"]').getAttribute('href'),'#/games/'+ids.game);await check('spielbezogene-hinweise');
  await page.locator('[data-role="home-next"]').click();await page.getByRole('button',{name:'Zurück zu Heute',exact:true}).click();await page.locator('.mobile-home').waitFor();
  assert.deepEqual(errors,[]);console.log(width+' px: Lesezugriff, Kategorieanzeige, Live-Rollenwechsel, Spielhinweise und Rückweg geprüft.');await context.close();
 }
 console.log('Screenshots: '+shots);
}finally{await browser.close();server.kill();}
