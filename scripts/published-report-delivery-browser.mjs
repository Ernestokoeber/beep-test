import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
const packet=JSON.parse(readFileSync(new URL('../data/published-game-reports/2026-10-17-wasserburg-lindau.json',import.meta.url)));
let server,base=process.env.REPORT_BASE_URL;
if(!base){
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});base='http://127.0.0.1:'+port;
}
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||(existsSync(chromium.executablePath())?undefined:'msedge')});
const shots=join(tmpdir(),'courthub-auto-report');mkdirSync(shots,{recursive:true});
try{
 for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,locale:'de-DE',serviceWorkers:'block'});
  let downloads=0,uploads=0,interrupt=width===320;
  await context.route('**/api/**',r=>{if(r.request().method()==='PUT')uploads++;return r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Das Datenbank-Kontingent ist erschöpft. Lokale Daten bleiben erhalten.',code:'DATABASE_QUOTA_EXCEEDED',retryable:true})});});
  await context.route('**/data/published-game-reports/2026-10-17-wasserburg-lindau.json',async r=>{
   downloads++;assert.equal(r.request().headers().authorization,undefined);
   if(interrupt){await r.abort('internetdisconnected');}else await r.continue();
  });
  await context.addInitScript(({packet,width})=>{
   if(localStorage.getItem('beepTest_v1'))return;
   localStorage.setItem('beeptest_auth_token','local-test-token');
   localStorage.setItem('beepTest_v1',JSON.stringify({schemaVersion:5,meta:{updatedAt:'2026-10-01T12:00:00Z'},players:packet.players.map((p,i)=>({id:'device-'+width+'-'+i,name:p.name,jerseyNumber:String(i+30)})),games:[{id:'phone-game',...packet.target,team:'herren',status:'played',coachSummary:'Vorhandene Coaching-Notiz',playerStats:[{playerId:'device-'+width+'-0',rebounds:7,points:2}]}]}));
  },{packet,width});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#/games/phone-game/report');
  if(width===320){
   await page.locator('[data-game-page="report"]').waitFor();assert.equal(await page.locator('[data-role="published-report"]').count(),0);
   await page.locator('[data-page-back]').click();await page.locator('[data-game-page="overview"]').waitFor();
   await page.locator('a[href$="/boxscore"]').click();await page.locator('[data-game-page="boxscore"]').waitFor();
   await page.locator('[data-game-player-link]').filter({hasText:'Dennis Ayvat'}).click();await page.locator('[data-game-page="player"]').waitFor();
   interrupt=false;await page.evaluate(()=>window.dispatchEvent(new Event('online')));
   assert.equal(await page.evaluate(()=>!!BT.storage.getGame('phone-game').publishedReport),false,'Offenen Boxscore erst nach Verlassen ergänzen.');
   // The archived editor is deliberately unlocked before a manual video update.
   page.on('dialog',d=>d.accept());await page.locator('[data-action="unlock-game"]').click();
   const rebounds=page.locator('tr:not([hidden]) [data-stat="rebounds"]');await rebounds.fill('8');await rebounds.dispatchEvent('change');
   await page.locator('[data-page-back]').click();await page.locator('[data-game-page="boxscore"]').waitFor();await page.locator('[data-page-back]').click();await page.locator('[data-game-page="overview"]').waitFor();
   await page.locator('a[href$="/report"]').click();
  }
  await page.locator('[data-role="live-game-host"] [data-role="published-report"]').waitFor({timeout:10000});
  assert.equal(await page.locator('.live-report-player').count(),6);assert.equal(await page.locator('[data-role="published-import"]').count(),0);
  const data=await page.evaluate(()=>BT.storage.load()),game=data.games[0];assert.equal(game.score,'64:55');assert.equal(game.playerStats.reduce((s,p)=>s+p.points,0),55);assert.equal(game.playerStats.reduce((s,p)=>s+p.freeThrowsAttempted,0),15);
  assert.equal(game.playerStats[0].rebounds,width===320?8:7);assert.equal(game.publishedReportBackup.playerStats[0].points,2);assert.equal(game.coachSummary,'Vorhandene Coaching-Notiz');assert.equal(game.publishedReport.staff[0].playerId,'device-'+width+'-5');
  assert.equal(game.publishedReport.players[0].fieldGoalsAttempted,null);assert.equal(data.players[0].jerseyNumber,'30');assert.equal(uploads,0);
  const beforeReload=downloads;await page.reload();await page.locator('[data-role="published-report"]').waitFor();assert.equal(downloads,beforeReload,'Persistierte Berichte nicht erneut laden.');
  await page.locator('[data-game-page]').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:join(shots,'automatisch-'+width+'.png'),fullPage:false});
  await page.locator('[data-page-back]').click();await page.locator('[data-game-page="overview"]').waitFor();
  await page.goto(base+'/#/games/phone-game/boxscore');await page.locator('[data-game-player-link]').filter({hasText:'Georgios Pavlou'}).click();await page.locator('[data-game-page="player"]').waitFor();assert.equal(await page.locator('tr:not([hidden]) [data-stat="points"]').inputValue(),'20');
  await page.goto(base+'/#/account');await page.getByText(/Das Datenbank-Kontingent ist erschöpft/).first().waitFor();assert.deepEqual(errors,[]);assert.equal(uploads,0);
  console.log(width+' px: ohne Klick importiert, sechs Spieler, individuelle Profile, Persistenz, Rückweg und getrennte Cloud-Sperre geprüft.');await context.close();
 }
 console.log('Screenshots: '+shots);
}finally{await browser.close();server?.kill();}
