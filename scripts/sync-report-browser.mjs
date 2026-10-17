import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
const packet=JSON.parse(readFileSync(new URL('../data/published-game-reports/2026-10-17-wasserburg-lindau.json',import.meta.url)));
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||(existsSync(chromium.executablePath())?undefined:'msedge')});
const base='http://127.0.0.1:'+port,shots=join(tmpdir(),'courthub-sync-report');mkdirSync(shots,{recursive:true});
try{
 for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,locale:'de-DE',serviceWorkers:'block'});
  await context.route('**/api/**',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Das Datenbank-Kontingent ist erschöpft. Deine lokal gespeicherten Daten bleiben erhalten.',code:'DATABASE_QUOTA_EXCEEDED',retryable:true})}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(base+'/#/games');await page.locator('[data-game-page="list"]').waitFor();
  const seeded=await page.evaluate(async packet=>{
   const players=packet.players.map((p,i)=>({id:'mobile-'+i,name:p.name,jerseyNumber:String(i+30)}));
   await BT.storage.save({...BT.storage.load(),players},{fromSync:true});
   const game=BT.storage.upsertGame({team:'herren',...packet.target,status:'played',coachSummary:'Bestehende Notiz',officialMatchId:'existing-match'});
   await BT.storage.flush();localStorage.setItem('beeptest_auth_token','local-test-token');
   return {id:game.id,roster:JSON.stringify(players)};
  },packet);
  await page.goto(base+'/#/games/'+seeded.id);await page.locator('[data-game-page="overview"]').waitFor();
  await page.locator('a[href$="/report"]').click();await page.reload();await page.locator('[data-game-page="report"]').waitFor();
  assert(await page.locator('[data-action="import-published-report"]').isDisabled());
  await page.locator('[data-action="unlock-game"]').click();await page.locator('[data-action="import-published-report"]').click();
  try{await page.getByText('Geprüft: 64:55 · 6 Spieler · fünf Starter.',{exact:true}).waitFor({timeout:10000});}
  catch(error){console.log(await page.locator('[data-role="published-import"]').textContent());console.log(errors);throw error;}
  const preview=page.locator('[data-role="published-preview"]');assert.equal(await preview.locator('.live-report-player').count(),6);
  await page.locator('[data-action="save-published-report"]').click();
  await page.locator('[data-role="live-game-host"] [data-role="published-report"]').waitFor();
  await page.reload();await page.locator('[data-role="live-game-host"] [data-role="published-report"]').waitFor();
  const result=await page.evaluate(id=>({game:BT.storage.getGame(id),roster:JSON.stringify(BT.storage.getPlayers()),sync:BT.sync.getState()}),seeded.id);
  assert.equal(result.game.score,'64:55');assert.equal(result.game.coachSummary,'Bestehende Notiz');assert.equal(result.game.officialMatchId,'existing-match');
  assert.equal(result.game.publishedReport.staff[0].playerId,'mobile-5');assert.equal(result.roster,seeded.roster);
  assert.equal(result.game.playerStats.reduce((sum,p)=>sum+p.points,0),55);assert.equal(result.game.playerStats.reduce((sum,p)=>sum+p.freeThrowsAttempted,0),15);
  assert.equal(result.sync.status,'error');assert.match(result.sync.lastError,/Kontingent/,'Kein falscher Cloud-Erfolg nach lokalem Import.');
  assert(await page.locator('[data-action="import-published-report"]').isDisabled(),'Nach Neuladen muss das Archiv wieder gesperrt sein.');
  await page.locator('#app').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontaler Überlauf');
  await page.screenshot({path:join(shots,'bericht-'+width+'.png'),fullPage:true});
  await page.locator('[data-page-back]').click();await page.locator('[data-game-page="overview"]').waitFor();
  await page.goto(base+'/#/account');await page.getByText(/Das Datenbank-Kontingent ist erschöpft/).first().waitFor();
  assert.deepEqual(errors,[]);console.log(width+' px: Import ohne Cloud, sechs Spieler, Persistenz, Archivschutz und Zurück-Navigation geprüft.');await context.close();
 }
 console.log('Screenshots: '+shots);
}finally{await browser.close();server.kill();}
