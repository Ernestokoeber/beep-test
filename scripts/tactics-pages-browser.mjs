import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || (existsSync(chromium.executablePath())?undefined:'msedge')});
const base='http://127.0.0.1:'+port, shots=join(tmpdir(),'courthub-tactics-preview');mkdirSync(shots,{recursive:true});
try {
 for(const width of (process.env.TACTICS_WIDTH ? [Number(process.env.TACTICS_WIDTH)] : [320,390,768,1440])) {
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<900,hasTouch:width<900,locale:'de-DE',serviceWorkers:'block'});
  await context.route('**/api/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{}'}));
  await context.addInitScript(()=>{
    window.BT={};let sync;
    Object.defineProperty(BT,'sync',{configurable:true,get:()=>sync,set(value){sync=value;const original=value.getState;value.getState=()=>({...original(),user:{id:'test-coach',role:'coach',name:'Testcoach'}});}});
  });
  const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const wait=type=>page.waitForFunction(type=>{const root=document.querySelector('[data-tactics-page]');return root?.dataset.tacticsPage===type && root.dataset.tacticsRoute===location.hash;},type);
  const check=async name=>{await page.locator('.tactics-page').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));const size=await page.evaluate(()=>({w:innerWidth,d:document.documentElement.scrollWidth,b:document.body.scrollWidth}));await page.screenshot({path:join(shots,name+'-'+width+'.png'),fullPage:true});assert(Math.max(size.d,size.b)<=size.w+1,name+': Überlauf '+JSON.stringify(size)+' '+JSON.stringify(await page.locator('.tactics-page *').evaluateAll(els=>els.filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='absolute').map(e=>({class:e.className,width:e.getBoundingClientRect().width})).slice(0,12))));assert.deepEqual(errors,[],name);};
  await page.goto(base+'/#/tactics');await wait('list');
  const ids=await page.evaluate(async()=>{const a=BT.storage.upsertTactic({...BT.tactics.__core.defaultBoard(),title:'Mobile Testtaktik',description:'Freien Spieler finden.'});const b=BT.storage.upsertTactic({...BT.tactics.__core.defaultBoard(),title:'Zweite Testtaktik'});await BT.storage.flush();return [a.id,b.id];});
  await page.reload();await wait('list');await page.locator('[data-tactics-search]').fill('Mobile Test');await check('bibliothek');
  await page.locator('[data-tactic-link]').click();await wait('overview');assert(page.url().endsWith('/'+ids[0]));assert.equal(await page.locator('.subnav').count(),0);await check('spielzug');
  await page.locator('a[href$="/edit"]').click();await wait('edit');await page.locator('[data-role="title"]').fill('Mein Entwurf');await check('bearbeiten');
  await page.locator('[data-tab="instructions"]').click();await page.locator('[data-role="phase-instruction"]').fill('Nach dem Pass konsequent zum Korb schneiden.');
  await page.locator('[data-page-back]').click();await wait('overview');await page.locator('a[href$="/play"]').click();await wait('play');await check('abspielen');
  await page.locator('[data-action="play"]').click();await page.waitForFunction(()=>document.querySelector('[data-role="time"]').textContent!=='0.0 s');
  await page.locator('[data-page-back]').click();await wait('overview');await page.locator('a[href$="/edit"]').click();await wait('edit');assert.equal(await page.locator('[data-role="title"]').inputValue(),'Mein Entwurf');
  await page.reload();await wait('edit');assert.equal(await page.locator('[data-role="title"]').inputValue(),'Mein Entwurf');
  await page.locator('[data-tab="instructions"]').click();assert.equal(await page.locator('[data-role="phase-instruction"]').inputValue(),'Nach dem Pass konsequent zum Korb schneiden.');
  await page.locator('[data-action="save"]').click();assert.equal(await page.evaluate(id=>BT.storage.getTactics().find(x=>x.id===id).title,ids[0]),'Mein Entwurf');
  await page.locator('[data-page-back]').click();await wait('overview');await page.locator('[data-page-back]').click();await wait('list');assert.equal(await page.locator('[data-tactics-search]').inputValue(),'Mobile Test');
  await page.goto(base+'/#/tactics/'+ids[1]+'/edit');await wait('edit');assert.equal(await page.locator('[data-role="title"]').inputValue(),'Zweite Testtaktik');assert.equal(await page.locator('[data-quick-undo]').isDisabled(),true);
  if(width===390){
    const tapPlayer=async id=>{const token=page.locator('.chq-court-wrap [data-element-id="'+id+'"]');await token.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));const box=await token.boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);};
    await page.locator('[data-tool="ball"]').tap();await tapPlayer('o2');
    assert(await page.evaluate(()=>{const b=BT.storage.getSetting('tacticsBoardDraft'),core=BT.tactics.__core,step=b.steps[0];return core.distance(core.elementById(step,'ball'),core.ballPointForPlayer(core.elementById(step,'o2')))<1;}),'Ballführer muss sich per Touch auswählen lassen.');
    await page.locator('[data-tool="pass"]').tap();await tapPlayer('o2');await tapPlayer('o3');
    assert(await page.evaluate(()=>BT.storage.getSetting('tacticsBoardDraft').steps.some(s=>s.transition.passes.length>0)),'Pass muss mit zwei Berührungen entstehen.');
    const fresh=await context.newPage();await fresh.goto(base+'/package.json');await fresh.goto(base+'/#/tactics/new');await fresh.locator('[data-role="title"]').fill('Direkt angelegt');await fresh.locator('[data-action="save"]').click();await fresh.locator('[data-tactics-page="overview"]').waitFor();await fresh.locator('[data-page-back]').click();await fresh.locator('[data-tactics-page="list"]').waitFor();await fresh.close();
    await page.locator('[data-role="title"]').fill('Entwurf in Tab A');
    const other=await context.newPage();await other.goto(base+'/#/tactics/'+ids[0]+'/edit');await other.locator('[data-role="title"]').fill('Entwurf in Tab B');
    await page.locator('.chq-header-more summary').click();await page.locator('[data-more="duplicate"]').click();await page.waitForURL('**/#/tactics/new');await wait('edit');assert.match(await page.locator('[data-role="title"]').inputValue(),/^Entwurf in Tab A.*Kopie/);
    await page.goto(base+'/#/tactics/'+ids[1]+'/edit');await wait('edit');assert.equal(await page.locator('[data-role="title"]').inputValue(),'Entwurf in Tab A');
    await page.locator('[data-action="save"]').click();assert.equal(await page.evaluate(id=>BT.storage.getTactics().find(x=>x.id===id).title,ids[1]),'Entwurf in Tab A');await other.close();
  }
  const direct=await context.newPage();await direct.goto(base+'/#/tactics/'+ids[1]+'/edit');await direct.locator('[data-tactics-page="edit"]').waitFor();await direct.locator('[data-page-back]').click();await direct.locator('[data-tactics-page="overview"]').waitFor();await direct.locator('[data-page-back]').click();await direct.locator('[data-tactics-page="list"]').waitFor();await direct.close();
  await page.goto(base+'/#/tactics/new');await wait('edit');await page.locator('[data-role="title"]').fill('Neue Taktik');await page.reload();await wait('edit');assert.equal(await page.locator('[data-role="title"]').inputValue(),'Neue Taktik');await page.locator('[data-action="save"]').click();await wait('overview');assert.match(page.url(),/#\/tactics\/[^/]+$/);
  if(width===390){await page.evaluate(()=>document.documentElement.dataset.theme='dark');await check('dunkel-spielzug');await page.locator('a[href$="/edit"]').click();await wait('edit');await check('dunkel-editor');}
  await page.goto(base+'/#/tactics/missing');await wait('missing');await page.goto(base+'/#/tactics/%E0%A4%A');await wait('missing');
  if(width===390){
    await page.goto(base+'/#/tactics/import');await wait('import');await page.locator('[data-role="video-import"]').waitFor();await page.locator('[data-page-back]').click();await wait('missing');
    await page.goto(base+'/#/tactics/screens');await page.locator('.screen-academy').waitFor();await page.locator('[data-demo]').first().click();await wait('edit');assert.notEqual(await page.locator('[data-role="title"]').inputValue(),'Neue Taktik');
    await page.locator('[data-action="open-animation"]').click();await wait('play');assert(page.url().endsWith('/new/play'));await page.locator('[data-page-back]').click();await wait('edit');
    await page.locator('.chq-header-more summary').click();await page.locator('[data-action="new"]').click();assert.equal(await page.locator('[data-role="title"]').inputValue(),'Neues Play');
    await page.goto(base+'/#/tactics/'+ids[1]+'/edit');await wait('edit');await page.locator('.chq-header-more summary').click();await page.locator('[data-more="duplicate"]').click();await page.waitForURL('**/#/tactics/new');await wait('edit');assert.match(await page.locator('[data-role="title"]').inputValue(),/Kopie/);
    await page.evaluate(id=>{const board=BT.storage.getTactics().find(b=>b.id===id);board.published=true;BT.storage.upsertTactic(board);const original=BT.sync.getState;BT.sync.getState=()=>({...original(),user:{id:'viewer',role:'viewer'}});},ids[1]);
    await page.evaluate(id=>location.hash='#/tactics/'+id,ids[0]);await wait('missing');await page.evaluate(id=>location.hash='#/tactics/'+id,ids[1]);await wait('overview');assert.equal(await page.locator('a[href$="/edit"]').count(),0);
    await page.evaluate(id=>location.hash='#/tactics/'+id+'/edit',ids[1]);await wait('missing');
    await page.evaluate(()=>{BT.sync.getState=()=>({user:null});location.hash='#/tactics';});await wait('login');
    const slow=await context.newPage();let release,requested;const gate=new Promise(r=>release=r),seen=new Promise(r=>requested=r);
    await slow.route('**/js/video-import/main.js',async r=>{requested();await gate;await r.continue();});
    await slow.goto(base+'/#/tactics');await slow.locator('[data-tactics-page="list"]').waitFor();await slow.evaluate(()=>location.hash='#/tactics/import');await seen;
    await slow.evaluate(()=>location.hash='#/tactics');await slow.locator('[data-tactics-page="list"]').waitFor();await slow.evaluate(()=>location.hash='#/tactics/import');await slow.locator('[data-tactics-page="import"]').waitFor();release();await slow.locator('[data-role="video-import"]').waitFor();assert.equal(await slow.locator('[data-role="video-import"]').count(),1);await slow.close();
  }
  assert.deepEqual(errors,[]);console.log(width+' px: Taktikseiten, Rückwege, getrennte Entwürfe und Wiedergabe geprüft.');await context.close();
 }
 console.log('Screenshots: '+shots);
} finally {await browser.close();server.kill();}
