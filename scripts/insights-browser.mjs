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
const base='http://127.0.0.1:'+port,shots=join(tmpdir(),'courthub-insights-preview');mkdirSync(shots,{recursive:true});
try{
 for(const width of process.env.INSIGHTS_WIDTH ? [+process.env.INSIGHTS_WIDTH] : [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<900,hasTouch:width<900,locale:'de-DE',serviceWorkers:'block'});
  await context.route('**/api/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{}'}));
  await context.addInitScript(()=>{window.BT={};let sync;Object.defineProperty(BT,'sync',{configurable:true,get:()=>sync,set(value){sync=value;const original=value.getState;value.getState=()=>({...original(),sessionEpoch:1,user:{id:'insight-coach',role:'coach',organization:{id:'insight-test'}}});}});});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  const wait=async()=>{await page.waitForFunction(()=>document.querySelector('[data-insight-route]')?.dataset.insightRoute===location.hash);await page.locator('[data-insight-route]').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));await page.evaluate(()=>new Promise(requestAnimationFrame));};
  const go=async hash=>{await page.goto(base+'/'+hash);await wait();};
  const check=async label=>{
   await page.locator('.insight-page').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));
   const s=await page.evaluate(()=>[innerWidth,document.documentElement.scrollWidth,document.body.scrollWidth]);assert(Math.max(s[1],s[2])<=s[0]+1,label+': overflow '+s);assert.deepEqual(errors,[]);
   for(const h of await page.locator('.insight-page a:visible,.insight-page input:visible,.insight-page select:visible').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().height)))assert(h>=43,label+': kleines Touchziel '+h);
   await page.screenshot({path:join(shots,label+'-'+width+'.png'),fullPage:true});
  };
  try{
   await go('#/statistics');await check('leer');assert.equal(await page.locator('.insight-metric > strong').first().innerText(),'–');
   const ids=await page.evaluate(async()=>{
    const p=BT.storage.upsertPlayer({name:'Entwicklungsspieler',position:'Guard',goals:[{title:'Passfenster früher erkennen',status:'active'}]}),archived=BT.storage.upsertPlayer({name:'Archivspieler'}),empty=BT.storage.upsertPlayer({name:'Erstes Training'});BT.storage.setArchived(archived.id,true);
    const trainings=[];for(let i=0;i<6;i++)trainings.push(BT.storage.upsertTraining({date:'2026-08-'+String(i+1).padStart(2,'0'),endedAt:'2026-08-10T00:00:00Z',attendance:[{playerId:p.id,status:i<3?'absent':'present'}],freethrows:[{playerId:p.id,made:i<3?2:8,attempted:10}]}).id);
    BT.storage.upsertTraining({date:'2025-08-01',endedAt:'2025-08-02T00:00:00Z',attendance:[{playerId:p.id,status:'present'}]});
    const game=BT.storage.upsertGame({date:'2026-08-01',home:'TSV Lindau',away:'Auswertungsgegner',score:'80:70',playerStats:[{playerId:p.id,points:12}]});
    BT.storage.upsertGame({date:'2099-08-01',home:'TSV Lindau',away:'Nicht gespielt',score:'0:0',status:'played'});
    BT.storage.setActiveSeason('26/27');await BT.storage.flush();return{player:p.id,archived:archived.id,game:game.id,trainings};
   });
   await page.reload();await wait();await check('team');assert((await page.locator('.insight-metrics').innerText()).includes('+60 Prozentpunkte'));
   await page.locator('.insight-metric[href*="team/ft"]').click();await wait();await page.locator('.insight-comparison').filter({hasText:'+60 Prozentpunkte'}).waitFor();await check('team-freiwuerfe');
   await page.locator('.insight-list a[href$="/analysis"]').first().click();await page.locator('[data-training-page="analysis"]').waitFor();await page.locator('[data-page-back]').click();await wait();
   await page.locator('[data-page-back]').click();await wait();await page.locator('[data-insight-search]').fill('Entwicklung');
   await page.locator('[data-insight-player="'+ids.player+'"]').scrollIntoViewIfNeeded();await page.evaluate(id=>{const capture=e=>{if(e.target.closest('[data-insight-player]')?.dataset.insightPlayer===id){window.insightOriginScroll=scrollY;document.removeEventListener('click',capture,true);}};document.addEventListener('click',capture,true);},ids.player);await page.locator('[data-insight-player="'+ids.player+'"]').click();const scroll=await page.evaluate(()=>window.insightOriginScroll);await wait();await check('spieler');assert((await page.locator('.insight-goals').innerText()).includes('Passfenster'));
   await page.locator('.insight-metric[href*="/ft?"]').click();await wait();await check('spieler-freiwuerfe');await page.goBack();await wait();await page.locator('[data-page-back]').click();await wait();assert.equal(await page.locator('[data-insight-search]').inputValue(),'Entwicklung');assert.equal(typeof scroll,'number');await page.waitForFunction(y=>Math.abs(scrollY-y)<5,scroll);
   await page.locator('[data-insight-search]').focus();await page.evaluate(()=>{BT.storage.upsertPlayer({name:'Entwicklung Neu'});window.dispatchEvent(new Event('bt-sync-change'));});await page.locator('[data-insight-count]').filter({hasText:'2 Spieler'}).waitFor();assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-insight-search')),true);
   await page.locator('[data-insight-season]').selectOption('25/26');await wait();assert.equal(await page.locator('[data-insight-search]').inputValue(),'Entwicklung');assert(!(await page.locator('.insight-metrics').innerText()).includes('+60 Prozentpunkte'));
   await page.reload();await wait();assert.equal(await page.locator('[data-insight-season]').inputValue(),'25/26');
   await go('#/reports?season=26%2F27');await check('auswertung');await page.locator('a[href*="reports/games?"]').click();await wait();await check('spiele');assert.equal(await page.locator('.insight-list a').count(),1);
   await page.locator('.insight-list a').click();await page.locator('[data-game-page="report"]').waitFor();await page.locator('[data-page-back]').click();await wait();await page.locator('[data-page-back]').click();await wait();
   await page.locator('a[href*="reports/trainings?"]').click();await wait();assert.equal(await page.locator('.insight-list a').count(),6);await check('trainings');
   await go('#/reports/full?season=26%2F27&player='+ids.player);await page.locator('[data-role="report-player-rows"] tr').waitFor();assert.equal(await page.locator('[data-role="report-player-rows"] tr').count(),1);assert.equal(await page.locator('[data-role="report-season"]').inputValue(),'26/27');
   if(width===390){let downloadName='';
    const download=page.waitForEvent('download');await page.locator('[data-action="report-csv"]').click();downloadName=(await download).suggestedFilename();assert(downloadName.endsWith('.csv'));
    await page.locator('[data-role="report-player"]').selectOption('all');await page.reload();await page.locator('[data-role="report-player"]').waitFor();assert.equal(await page.locator('[data-role="report-player"]').inputValue(),'all');
   }
   await go('#/statistics/player/'+ids.player+'/ft?season=26%2F27');await page.evaluate(()=>document.documentElement.dataset.theme='dark');await check('dunkel');
   const direct=await context.newPage();await direct.goto(base+'/#/statistics/player/'+ids.player+'/ft?season=26%2F27');await direct.locator('.insight-comparison').waitFor();await direct.locator('[data-page-back]').click();await direct.locator('.insight-goals').waitFor();await direct.locator('[data-page-back]').click();await direct.locator('[data-insight-search]').waitFor();await direct.close();
   if(width===390){await go('#/statistics/player/missing');await page.getByRole('heading',{name:'Spieler nicht gefunden'}).waitFor();await check('fehlend');await go('#/statistics');await page.locator('[data-insight-roster]').selectOption('all');assert(await page.locator('[data-insight-player="'+ids.archived+'"]').isVisible());}
   console.log(width+' px: Trends, Team-/Spielerdetails, Quellen, Zurück, Suche, Saison, Sync, Auswertung, CSV und Dunkelmodus geprüft.');
  }finally{await context.close();}
 }
 console.log('Screenshots: '+shots);
}finally{await browser.close();server.kill();}
