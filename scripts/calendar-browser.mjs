import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {existsSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j);});
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || (existsSync(chromium.executablePath())?undefined:'msedge')});
const base='http://127.0.0.1:'+port,shots=join(tmpdir(),'courthub-calendar-preview');mkdirSync(shots,{recursive:true});
try{
 for(const width of process.env.CALENDAR_WIDTH ? [+process.env.CALENDAR_WIDTH] : [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<900,hasTouch:width<900,locale:'de-DE',serviceWorkers:'block'});
  await context.route('**/api/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{}'}));
  await context.addInitScript(()=>{window.BT={};let sync;Object.defineProperty(BT,'sync',{configurable:true,get:()=>sync,set(value){sync=value;const original=value.getState;value.getState=()=>({...original(),sessionEpoch:1,user:{id:'calendar-coach',role:window.calendarRole || 'coach',organization:{id:'calendar-test'}}});}});});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-17T12:00:00+02:00')});
  const wait=async()=>{await page.waitForFunction(()=>document.querySelector('[data-calendar-route]')?.dataset.calendarRoute===location.hash);await page.locator('[data-calendar-route]').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));await page.evaluate(()=>new Promise(requestAnimationFrame));};
  const go=async hash=>{await page.goto(base+'/'+hash);await wait();};
  const check=async label=>{
   const s=await page.evaluate(()=>[innerWidth,document.documentElement.scrollWidth,document.body.scrollWidth]);assert(Math.max(s[1],s[2])<=s[0]+1,label+': overflow '+s);assert.deepEqual(errors,[]);
   for(const e of await page.locator('.calendar-page a:visible,.calendar-page button:visible,.calendar-page input:not([type=checkbox]):visible,.calendar-page select:visible').evaluateAll(els=>els.map(e=>({height:e.getBoundingClientRect().height,html:e.outerHTML.slice(0,200)}))))assert(e.height>=43,label+': kleines Touchziel '+JSON.stringify(e));
   await page.screenshot({path:join(shots,label+'-'+width+'.png'),fullPage:true});
  };
  try{
   await go('#/schedule?month=2026-10');await check('leer');
   const ids=await page.evaluate(async()=>{
    const p=BT.storage.upsertPlayer({name:'Kalenderspieler'});const trainings=[];
    for(let i=1;i<=25;i++)trainings.push(BT.storage.upsertTraining({date:'2026-10-'+String(i).padStart(2,'0'),startTime:'18:30',note:'Kalendertraining '+i,attendance:[{playerId:p.id,status:'present'}]}).id);
    const game=BT.storage.upsertGame({date:'2026-10-25',time:'20:00',home:'TSV Lindau',away:'Kalendergegner',location:'Inselhalle',source:'basketball-bund',leagueId:54509});
    BT.storage.upsertTraining({date:'2026-11-01',startTime:'19:00',note:'Novembertraining',attendance:[]});
    await BT.storage.flush();return{trainings,game:game.id};
   });
   await page.reload();await wait();assert.equal(await page.locator('[data-calendar-event]').count(),26);await check('agenda');
   await page.locator('[data-calendar-search]').fill('Kalender');
   const training=page.locator('[data-calendar-event="training:'+ids.trainings.at(-1)+'"]');await training.scrollIntoViewIfNeeded();
   await page.evaluate(()=>document.addEventListener('click',()=>window.calendarOriginScroll=scrollY,{capture:true,once:true}));await training.click();const scroll=await page.evaluate(()=>window.calendarOriginScroll);
   await page.locator('[data-training-page="overview"]').waitFor();await page.locator('[data-page-back]').click();await wait();assert.equal(await page.locator('[data-calendar-search]').inputValue(),'Kalender');await page.waitForFunction(y=>Math.abs(scrollY-y)<5,scroll);
   await page.locator('[data-calendar-kind]').selectOption('game');assert.equal(await page.locator('[data-calendar-event]').count(),1);await page.locator('[data-calendar-event="game:'+ids.game+'"]').click();await page.locator('[data-game-page="overview"]').waitFor();await page.goBack();await wait();assert.equal(await page.locator('[data-calendar-kind]').inputValue(),'game');
   await page.locator('[data-calendar-search]').fill('');await page.locator('[data-month-step="1"]').click();await wait();assert.equal(await page.locator('[data-calendar-month]').inputValue(),'2026-11');assert.equal(await page.locator('[data-calendar-event]').count(),0);await page.locator('[data-calendar-kind]').selectOption('all');assert.equal(await page.locator('[data-calendar-event]').count(),1);await page.reload();await wait();assert.equal(await page.locator('[data-calendar-kind]').inputValue(),'all');
   await page.locator('[data-calendar-search]').fill('November');await page.locator('[data-calendar-search]').focus();await page.evaluate(()=>{BT.storage.upsertTraining({date:'2026-11-02',note:'November Neu',attendance:[]});window.dispatchEvent(new Event('bt-sync-change'));});await page.locator('[data-calendar-count]').filter({hasText:'2 Termine'}).waitFor();assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-calendar-search')),true);
   await page.locator('.calendar-tabs a[href="#/schedule/planning"]').click();await wait();await check('planung');await page.locator('.calendar-tasks a[href="#/schedule/regular"]').click();await wait();await check('trainingszeiten');
   await page.locator('[data-role="time"]').fill('19:00');await page.locator('.wd-btn[data-key="mon"]').click();const monday=await page.locator('.wd-btn[data-key="mon"]').getAttribute('class');await page.locator('[data-page-back]').click();await wait();await page.locator('.calendar-tasks a[href="#/schedule/regular"]').click();await wait();assert.equal(await page.locator('[data-role="time"]').inputValue(),'19:00');assert.equal(await page.locator('.wd-btn[data-key="mon"]').getAttribute('class'),monday);await page.reload();await wait();assert.equal(await page.locator('[data-role="time"]').inputValue(),'19:00');
   await page.locator('[data-action="save-schedule"]').click();assert.equal(await page.evaluate(()=>BT.storage.getSetting('regularTime')),'19:00');await page.locator('[data-page-back]').click();await wait();
   await page.locator('.calendar-tasks a[href="#/schedule/upcoming"]').click();await wait();await check('vorschlaege');assert((await page.locator('[data-role="upcoming"] .name').first().innerText()).includes('19:00'));await page.locator('[data-create]').first().click();await page.locator('[data-training-page="overview"]').waitFor();await page.locator('[data-page-back]').click();await wait();await page.locator('[data-page-back]').click();await wait();
   await page.locator('.calendar-tasks a[href="#/schedule/season"]').click();await wait();await check('saison');await page.locator('[data-role="season-goal"]').fill('Entscheidungen schneller treffen');await page.reload();await wait();assert.equal(await page.locator('[data-role="season-goal"]').inputValue(),'Entscheidungen schneller treffen');await page.locator('[data-action="preview-season"]').click();await page.locator('[data-role="season-plan-state"]').filter({hasText:/berechnet|Termine|Trainings|Vorschau/}).waitFor();await check('saison-vorschau');
   await page.locator('[data-page-back]').click();await wait();await page.locator('.calendar-tasks a[href="#/schedule/team-concept"]').click();await wait();await check('teamkonzept');await page.locator('[data-role="strategy-offense"]').fill('Passfenster aktiv nutzen');await page.locator('[data-action="save-team-strategy"]').click();await page.locator('[data-role="season-ai-status"]').filter({hasText:/gespeichert/}).waitFor();assert((await page.evaluate(()=>BT.teamStrategy.current().offensePrinciples)).includes('Passfenster'));await page.locator('[data-page-back]').click();await wait();await page.locator('.calendar-tasks a[href="#/schedule/import"]').click();await wait();await check('import');
   await go('#/schedule?month=2026-10');await page.evaluate(()=>document.documentElement.dataset.theme='dark');await check('dunkel');
   const direct=await context.newPage();await direct.goto(base+'/#/schedule/regular');await direct.locator('[data-calendar-page="regular"]').waitFor();await direct.locator('[data-page-back]').click();await direct.locator('[data-calendar-page="planning"]').waitFor();await direct.locator('[data-page-back]').click();await direct.locator('[data-calendar-page="agenda"]').waitFor();await direct.close();
   if(width===390){await page.evaluate(()=>{window.calendarRole='viewer';location.hash='#/schedule/regular';});await wait();assert(await page.locator('[data-action="save-schedule"]').isDisabled());await check('lesezugriff');}
   console.log(width+' px: Kalender, beide Terminarten, Filter, Monat, Sync, Scroll/Zurück, Planung, Entwürfe, Speichern, Direktlinks und Dunkelmodus geprüft.');
  }finally{await context.close();}
 }
 console.log('Screenshots: '+shots);
}finally{await browser.close();server.kill();}
