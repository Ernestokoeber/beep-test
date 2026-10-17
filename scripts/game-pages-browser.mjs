import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || (existsSync(chromium.executablePath())?undefined:'msedge')});
const base='http://127.0.0.1:'+port,shots=join(tmpdir(),'courthub-game-preview');mkdirSync(shots,{recursive:true});
try{
 for(const width of process.env.GAMES_WIDTH?[+process.env.GAMES_WIDTH]:[320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<900,hasTouch:width<900,locale:'de-DE',serviceWorkers:'block'});
  await context.route('**/api/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{}'}));
  await context.addInitScript(()=>{window.BT={};let sync;Object.defineProperty(BT,'sync',{configurable:true,get:()=>sync,set(value){sync=value;const original=value.getState;value.getState=()=>({...original(),sessionEpoch:1,user:{id:'game-coach',role:'coach',organization:{id:'game-test'}}});}});});
  const page=await context.newPage();page.setDefaultTimeout(15000);let approve=true;const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>approve?d.accept():d.dismiss());
  const wait=type=>page.waitForFunction(type=>{const root=document.querySelector('[data-game-page]');return root?.dataset.gamePage===type&&root.dataset.gameRoute===location.hash;},type);
  const check=async name=>{await page.locator('[data-game-page]').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));const s=await page.evaluate(()=>[innerWidth,document.documentElement.scrollWidth,document.body.scrollWidth]);await page.screenshot({path:join(shots,name+'-'+width+'.png'),fullPage:true});assert(Math.max(s[1],s[2])<=s[0]+1,name+': Überlauf '+s);assert.deepEqual(errors,[],name);};
  await page.goto(base+'/#/games');await wait('list');
  const ids=await page.evaluate(async()=>{const players=Array.from({length:6},(_,i)=>BT.storage.upsertPlayer({name:'Spieler '+(i+1),jerseyNumber:String(i+4)}));const a=BT.storage.upsertGame({team:'herren',date:BT.util.todayISO(),time:'18:00',home:'TSV Lindau',away:'Mobile Gegner'});const b=BT.storage.upsertGame({team:'herren',date:'2025-01-01',home:'TSV Lindau',away:'Archivgegner',score:'70:60'});await BT.storage.flush();return{game:a.id,archive:b.id,players:players.map(p=>p.id)};});
  await page.reload();await wait('list');await page.locator('[data-role="games-search"]').fill('Mobile');await check('liste');await page.locator('[data-game-id="'+ids.game+'"]').click();await wait('overview');await check('spiel');assert.equal(await page.locator('[data-role="game-list"]').isVisible(),false);
  await page.locator('a[href$="/prepare/roster"]').click();await wait('roster');await check('kader');
  await page.locator('[data-action="show-lineup"]').click();await wait('lineup');await check('starting-five');await page.locator('[data-page-back]').click();await wait('roster');
  await page.locator('[data-page-back]').click();await wait('overview');assert.equal(await page.evaluate(id=>!!BT.storage.getGame(id).liveStats,ids.game),false);
  await page.locator('a[href$="/notes"]').click();await wait('notes');await page.locator('[data-game-field="coachSummary"]').fill('Wir kommunizieren in der Defense.');await page.locator('[data-page-back]').click();await wait('overview');await page.locator('a[href$="/notes"]').click();await wait('notes');assert.equal(await page.locator('[data-game-field="coachSummary"]').inputValue(),'Wir kommunizieren in der Defense.');await check('nachbereitung');
  await page.locator('[data-page-back]').click();await wait('overview');await page.locator('a[href$="/boxscore"]').click();await wait('boxscore');await page.locator('[data-game-player-link]').first().click();await wait('player');await check('spielerwerte');await page.locator('tr:not([hidden]) [data-stat="points"]').fill('12');await page.locator('tr:not([hidden]) [data-stat="points"]').dispatchEvent('change');
  await page.locator('[data-page-back]').click();await wait('boxscore');await page.locator('[data-page-back]').click();await wait('overview');await page.locator('[data-page-back]').click();await wait('list');assert.equal(await page.locator('[data-role="games-search"]').inputValue(),'Mobile');
  await page.goto(base+'/#/games/new');await wait('new');await page.locator('[name="away"]').fill('Neuer Gegner');await page.reload();await wait('new');assert.equal(await page.locator('[name="away"]').inputValue(),'Neuer Gegner');await check('neues-spiel');await page.locator('[data-role="game-form"] button[type="submit"]').click();await wait('overview');
  if(width===390){
    await page.goto(base+'/#/games/'+ids.game+'/prepare/confirm');await wait('roster');for(const id of ids.players)await page.locator('[data-player-roster="'+id+'"][data-status="bench"]').click();
    await page.locator('[data-action="show-lineup"]').click();await wait('lineup');for(const id of ids.players.slice(0,5))await page.locator('[data-player-lineup="'+id+'"][data-status="starter"]').click();
    await page.locator('[data-action="show-gameplan"]').click();await wait('gameplan');await page.locator('[data-field="goals"]').fill('Ball bewegen und gemeinsam verteidigen.');await check('gameplan');
    await page.locator('[data-page-back]').click();await wait('lineup');await page.locator('[data-action="show-gameplan"]').click();await wait('gameplan');assert.equal(await page.locator('[data-field="goals"]').inputValue(),'Ball bewegen und gemeinsam verteidigen.');
    await page.getByRole('button',{name:'Gameplan prüfen',exact:true}).click();await wait('confirm');await check('freigabe');await page.locator('[data-action="start"]').click();await wait('live');await check('live-vor-start');
    assert.equal(await page.evaluate(id=>BT.storage.getGame(id).liveStats.sessions.flatMap(s=>s.events).some(e=>e.kind==='clock-start'),ids.game),false);
    await page.getByRole('button',{name:'Uhr starten',exact:true}).click();await page.getByRole('button',{name:'Spiel verbindlich starten',exact:true}).click();await page.getByRole('button',{name:'Uhr anhalten',exact:true}).waitFor();await check('live');
    await page.goto(base+'/#/games/'+ids.game);await wait('overview');await page.locator('a[href$="/prepare/roster"]').click();await wait('roster');assert(await page.locator('[data-player-roster]').first().isDisabled());
    await page.locator('[data-page-back]').click();await wait('overview');await page.locator('a[href$="/live"]').click();await wait('live');await page.getByRole('button',{name:'Uhr anhalten',exact:true}).waitFor();await page.reload();await wait('live');await page.getByRole('button',{name:'Uhr anhalten',exact:true}).waitFor();
    await page.getByRole('button',{name:'Uhr anhalten',exact:true}).click();await page.getByRole('button',{name:'Uhr starten',exact:true}).waitFor();
    const conflict=await page.evaluate(id=>{const liveStats=structuredClone(BT.storage.getGame(id).liveStats),session=liveStats.sessions[0],a=structuredClone(session),b=structuredClone(session);a.id='capture-a';b.id='capture-b';a.events.forEach(e=>e.sessionId=a.id);b.events.forEach(e=>e.sessionId=b.id);return BT.storage.upsertGame({date:BT.util.todayISO(),home:'TSV Lindau',away:'Zwei Erfassungen',team:'herren',liveStats:{...liveStats,selectedSessionId:null,sessions:[a,b]}}).id;},ids.game);
    await page.goto(base+'/#/games/'+conflict);await wait('overview');await page.locator('a[href$="/live"]').click();await wait('live');try{await page.getByRole('button',{name:/Erfassung 1 ·/}).waitFor();}catch(error){console.log(await page.locator('#app').innerText());console.log(errors);throw error;}
    await page.goto(base+'/#/games/'+ids.archive+'/report');await wait('report');await page.locator('[data-role="video-stats-export-host"] button').first().waitFor();await check('auswertung');
  }
  await page.goto(base+'/#/games/'+ids.archive+'/notes');await wait('notes');assert.equal(await page.locator('[data-game-field="coachSummary"]').getAttribute('readonly'),'');await page.locator('[data-action="unlock-game"]').click();await page.locator('[data-game-field="coachSummary"]').fill('Nachtrag');await page.reload();await wait('notes');assert.equal(await page.locator('[data-game-field="coachSummary"]').getAttribute('readonly'),'');
  if(width===390){
    await page.goto(base+'/#/games/'+ids.archive+'/edit');await wait('edit');assert(await page.locator('[name="score"]').isDisabled());approve=false;await page.locator('[data-action="unlock-game"]').click();assert(await page.locator('[name="score"]').isDisabled());approve=true;await page.locator('[data-action="unlock-game"]').click();assert.equal(await page.locator('[name="score"]').isDisabled(),false);await page.locator('[name="score"]').fill('71:60');await page.locator('[data-role="game-form"] button[type="submit"]').click();await wait('overview');assert.equal(await page.evaluate(id=>BT.storage.getGame(id).score,ids.archive),'71:60');
    await page.locator('a[href$="/prepare/roster"]').click();await wait('roster');assert.equal(await page.locator('.matchday form>fieldset').isDisabled(),false);await page.locator('[data-action="show-lineup"]').click();await wait('lineup');assert.equal(await page.locator('.matchday form>fieldset').isDisabled(),false);
    await page.goto(base+'/#/games');await wait('list');await page.goto(base+'/#/games/'+ids.archive+'/edit');await wait('edit');assert(await page.locator('[name="score"]').isDisabled());
  }
  if(width===390){await page.goto(base+'/#/games/'+ids.archive+'/notes');await wait('notes');await page.evaluate(()=>document.documentElement.dataset.theme='dark');await check('dunkel-nachbereitung');}
  const direct=await context.newPage();await direct.goto(base+'/#/games/'+ids.game+'/prepare/lineup');await direct.locator('[data-game-page="lineup"]').waitFor();await direct.locator('[data-page-back]').click();await direct.locator('[data-game-page="roster"]').waitFor();await direct.locator('[data-page-back]').click();await direct.locator('[data-game-page="overview"]').waitFor();await direct.close();
  if(width===390){
    const fresh=await context.newPage();await fresh.goto(base+'/package.json');await fresh.goto(base+'/#/games/new');await fresh.locator('[name="away"]').fill('Direkt angelegt');await fresh.locator('[data-role="game-form"] button[type="submit"]').click();await fresh.locator('[data-game-page="overview"]').waitFor();await fresh.locator('[data-page-back]').click();await fresh.locator('[data-game-page="list"]').waitFor();await fresh.close();
    await page.evaluate(id=>{const original=BT.sync.getState;BT.sync.getState=()=>({...original(),user:{id:'game-viewer',role:'viewer',organization:{id:'game-test'}}});location.hash='#/games/'+id+'/notes';},ids.game);await wait('notes');assert.equal(await page.locator('[data-game-field="coachSummary"]').getAttribute('readonly'),'');assert.equal(await page.getByRole('button',{name:'Aus Spielanalyse Training erstellen'}).count(),0);
    await page.evaluate(id=>location.hash='#/games/'+id+'/edit',ids.archive);await wait('edit');assert(await page.locator('[name="score"]').isDisabled());assert(await page.locator('[data-action="unlock-game"]').isDisabled());
    await page.evaluate(id=>{BT.sync.getState=()=>({user:null});location.hash='#/games/'+id+'/prepare/roster';},ids.game);await wait('login');assert(await page.getByRole('link',{name:'Anmelden',exact:true}).isVisible());
  }
  await page.goto(base+'/#/games/missing');await wait('missing');assert.deepEqual(errors,[]);console.log(width+' px: Spielseiten, Vorbereitung, Notizen, Werte, Entwürfe und Rückwege geprüft.');await context.close();
 }
 console.log('Screenshots: '+shots);
}finally{await browser.close();server.kill();}
