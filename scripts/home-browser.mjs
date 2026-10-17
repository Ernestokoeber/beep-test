import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {existsSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';

const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));
const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || (existsSync(chromium.executablePath())?undefined:'msedge')});
const base='http://127.0.0.1:'+port,shots=join(tmpdir(),'courthub-home-preview');mkdirSync(shots,{recursive:true});
try {
  for (const width of [320,390,768,1440]) {
    const context=await browser.newContext({viewport:{width,height:780},isMobile:width<900,hasTouch:width<900,locale:'de-DE',serviceWorkers:'block'});
    await context.route('**/api/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{}'}));
    await context.addInitScript(()=>{window.BT={};let sync;Object.defineProperty(BT,'sync',{configurable:true,get:()=>sync,set(value){sync=value;const original=value.getState;value.getState=()=>({...original(),sessionEpoch:1,user:{id:'home-coach',role:'coach',displayName:'Coach',organization:{id:'home-test'}}});}});});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const home=()=>page.waitForFunction(()=>document.querySelector('.mobile-home')?.dataset.homeRoute===(location.hash || '#/dashboard'));
    const check=async label=>{
      await page.locator('.mobile-home').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));
      const size=await page.evaluate(()=>[innerWidth,document.documentElement.scrollWidth,document.body.scrollWidth]);
      assert(Math.max(size[1],size[2])<=size[0]+1,`${width}: ${label} Überlauf ${size}`);
      assert.deepEqual(errors,[],label);
      for(const box of await page.locator('.mobile-home a:visible, .mobile-home summary:visible').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().height)))assert(box>=43,`${label}: kleines Touchziel ${box}`);
      await page.screenshot({path:join(shots,label+'-'+width+'.png'),fullPage:true});
    };
    try {
      await page.goto(base+'/#/dashboard');await home();
      assert(await page.locator('[data-workspace="individual"]').isVisible(),'Workspace switch stays available.');
      await page.locator('.home-empty-day').filter({hasText:'Heute ist kein Training oder Spiel geplant.'}).waitFor();await check('leer');
      const ids=await page.evaluate(async()=>{
        const today=BT.util.todayISO(),d=new Date(today+'T12:00:00');d.setDate(d.getDate()+1);
        const tomorrow=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
        const training=BT.storage.upsertTraining({date:today,startTime:'18:00',location:'Sporthalle Lindau',plan:{summary:'Schnelle Entscheidungen am Ball',drills:[{name:'Passspiel',minutes:10}]}});
        const game=BT.storage.upsertGame({date:today,time:'20:00',team:'u18',home:'TSV Lindau',away:'Illertal'});
        BT.storage.upsertTraining({date:today,startTime:'10:00',status:'cancelled'});
        BT.storage.upsertGame({date:today,time:'09:00',home:'Abgeschlossen',away:'Gast',score:'70:60'});
        for(let n=0;n<5;n++)BT.storage.upsertTraining({date:tomorrow,startTime:'1'+n+':00',plan:{summary:'Training '+n,drills:[]}});
        const later=BT.storage.upsertGame({date:tomorrow,time:'21:00',home:'TSV Lindau',away:'Später Gegner',score:'0:0',status:'played'});
        await BT.storage.flush();return{training:training.id,game:game.id,later:later.id};
      });
      await page.reload();await home();
      assert.equal(await page.locator('[data-role="home-next"]').getAttribute('href'),'#/training/'+ids.training);
      assert.equal(await page.locator('.mobile-home [data-home-key]').count(),6);
      assert.equal(await page.locator('[data-role="home-upcoming-list"] a').count(),2);
      assert.equal(await page.locator('.home-day-history').getAttribute('open'),null);
      assert(await page.locator('[data-role="dashboard-date"]').isVisible());
      assert(await page.locator('a[href="#/games/'+ids.later+'"]').isVisible(),'Next game remains visible beyond a busy training schedule.');
      await check('heute');
      const top=await page.locator('[data-role="home-next"]').boundingBox();assert(top.y<350,`${width}: next appointment is immediately visible.`);
      await page.locator('[data-role="home-next"]').click();await page.locator('[data-training-page="overview"]').waitFor();
      assert.equal(await page.evaluate(id=>!!BT.storage.getTraining(id).liveSession,ids.training),false,'Opening must not start training.');
      await page.locator('[data-page-back]').click();await home();assert.equal(new URL(page.url()).hash,'#/dashboard');
      await page.locator('.mobile-home a[href="#/games/'+ids.game+'"]').click();await page.locator('[data-game-page="overview"]').waitFor();
      assert.equal(await page.evaluate(id=>!!BT.storage.getGame(id).liveStats,ids.game),false,'Opening must not start game.');
      await page.goBack();await home();assert.equal(new URL(page.url()).hash,'#/dashboard');
      await page.locator('[data-workspace="team"]').click();await home();await page.waitForURL('**/#/team');
      await page.locator('.mobile-home a[href="#/games/'+ids.later+'"]').scrollIntoViewIfNeeded();
      const scroll=await page.evaluate(()=>scrollY);
      await page.locator('.mobile-home a[href="#/games/'+ids.later+'"]').click();await page.locator('[data-game-page="overview"]').waitFor();
      await page.locator('[data-page-back]').click();await home();
      await page.waitForFunction(y=>Math.abs(scrollY-y)<5,scroll);
      await page.locator('.mobile-home h2').focus();
      await page.evaluate(id=>{const t=BT.storage.getTraining(id);t.plan.summary='Nach Sync aktuell';BT.storage.upsertTraining(t);window.dispatchEvent(new Event('bt-sync-change'));},ids.training);
      await page.locator('[data-role="home-next"]').filter({hasText:'Nach Sync aktuell'}).waitFor();
      assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H2','Route heading keeps focus after sync.');
      await page.locator('[data-role="home-next"]').focus();
      await page.evaluate(id=>{const t=BT.storage.getTraining(id);t.endedAt=new Date().toISOString();BT.storage.upsertTraining(t);document.dispatchEvent(new Event('visibilitychange'));},ids.training);
      await page.waitForFunction(id=>document.querySelector('[data-role="home-next"]')?.getAttribute('href')==='#/games/'+id,ids.game);
      assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('href')),'#/training/'+ids.training);
      assert.equal(await page.locator('.home-day-history').getAttribute('open'),'');
      await page.locator('.home-day-history > summary').click();
      await page.evaluate(()=>document.documentElement.dataset.theme='dark');await check('dunkel');
      if(width===390){
        await page.evaluate(()=>{BT.storage.save({...BT.storage.load(),trainings:[],games:[]},{fromSync:true});BT.dashboard.refresh();});
        await page.locator('.home-empty-day').filter({hasText:'Heute ist kein Training oder Spiel geplant.'}).waitFor();await check('nach-loeschen');
      }
      console.log(width+' px: Heute, Direktlinks, Rückwege, Scrollposition, Sync, Status und Dunkelmodus geprüft.');
    } finally {await context.close();}
  }
  console.log('Screenshots: '+shots);
} finally {await browser.close();server.kill();}
