import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(new Error('Preview stopped: '+c)));});
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || (existsSync(chromium.executablePath()) ? undefined : 'msedge')});
const base='http://127.0.0.1:'+port, shots=join(tmpdir(),'courthub-training-preview');mkdirSync(shots,{recursive:true});
try {
 for(const width of [320,390,768,1440]) {
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<900,hasTouch:width<900,locale:'de-DE',serviceWorkers:'block'});
  await context.route('**/api/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{}'}));
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const wait=p=>page.locator('[data-training-page="'+p+'"]').waitFor();
  const check=async name=>{await page.locator('.training-page').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));const size=await page.evaluate(()=>({w:innerWidth,d:document.documentElement.scrollWidth,b:document.body.scrollWidth}));assert(Math.max(size.d,size.b)<=size.w+1,name+': Überlauf '+JSON.stringify(size));assert.deepEqual(errors,[],name+': Browserfehler');await page.screenshot({path:join(shots,name+'-'+width+'.png'),fullPage:true});};
  await page.goto(base+'/#/training');await wait('list');
  const ids=await page.evaluate(async()=>{
    const p=BT.storage.upsertPlayer({name:'Lena Berger',position:'Guard'});
    const t=BT.storage.upsertTraining({date:BT.util.todayISO(),startTime:'18:00',note:'Defense & Entscheidungen',attendance:[{playerId:p.id,status:'present'}],planning:{source:'ai-season'},plan:{summary:'Helfen, rotieren, gemeinsam abschließen.',durationMinutes:90,shots:[{category:'Dreier',attempted:10}],drills:[{name:'Ballhandling & Fußarbeit',minutes:10,description:'In Bewegung dribbeln. Kopf oben halten.'},{name:'Closeout & Entscheidung',minutes:15,description:'Kontrolliert schließen. Angreifer lesen.',shotTargets:[{kind:'field',category:'Dreier',attempted:10}]},{name:'4 gegen 4 mit Vorteil',minutes:20,description:'Ball bewegen. Freien Spieler finden.'}]}});
    BT.storage.upsertTraining({date:'2026-01-01',note:'Archivtraining',status:'completed',endedAt:'2026-01-01T20:00:00Z'});
    for(let i=0;i<12;i++)BT.storage.upsertTraining({date:BT.util.todayISO(),note:'Training '+i});
    await BT.storage.flush();return {player:p.id,training:t.id};
  });
  await page.reload();await wait('list');await page.locator('[data-training-search]').fill('Defense');await check('liste');
  await page.locator('[data-training-link]').click();await wait('overview');assert.equal(await page.locator('.subnav').count(),0);await check('training');
  assert.equal(await page.evaluate(id=>BT.storage.getTraining(id).liveSession,ids.training),undefined);
  await page.locator('a[href$="/plan"]').first().click();await wait('plan');
  await page.locator('[data-plan-summary]').fill('Neue Schwerpunkte fürs Team');
  const drillHref=await page.locator('.tp-drill-link').first().getAttribute('href');
  await page.locator('[data-move="down"]').first().click();assert.equal(await page.locator('.tp-drill-link').nth(1).getAttribute('href'),drillHref);await check('plan');
  await page.locator('.tp-drill-link').nth(1).click();await wait('drill');await page.locator('textarea[name="description"]').fill('Entwurf bleibt beim Zurückgehen erhalten.');
  await page.locator('[data-page-back]').click();await wait('plan');await page.locator('.tp-drill-link').nth(1).click();await wait('drill');
  assert.equal(await page.locator('textarea[name="description"]').inputValue(),'Entwurf bleibt beim Zurückgehen erhalten.');
  await page.reload();await wait('drill');assert.equal(await page.locator('textarea[name="description"]').inputValue(),'Entwurf bleibt beim Zurückgehen erhalten.');
  await page.locator('button[type="submit"]').click();await wait('plan');
  assert.equal(await page.evaluate(id=>BT.storage.getTraining(id).planning.status,ids.training),'coach-edited');
  await page.locator('a[href$="/live"]').click();await wait('live');await check('live');
  assert.equal(await page.locator('html').evaluate(e=>e.classList.contains('training-live-open')),false);
  await page.locator('[data-live-action="toggle"]').click();await page.locator('[data-live="note"]').fill('Gute Kommunikation');await page.locator('[data-live-rating="worked"]').click();
  await page.locator('[data-live-action="shots"]').click();await wait('shots');await check('wuerfe');
  await page.locator('[data-role="shots"] [data-act="m+"]').first().click();
  await page.locator('[data-page-back]').click();await wait('live');
  assert.equal(await page.locator('[data-live="note"]').inputValue(),'Gute Kommunikation');assert.match(await page.locator('[data-live-action="toggle"]').innerText(),/Pause/);
  await page.reload();await wait('live');assert.match(await page.locator('[data-live-action="toggle"]').innerText(),/Pause/);
  await page.locator('[data-page-back]').click();await wait('plan');await page.locator('[data-page-back]').click();await wait('overview');
  await page.locator('a[href$="/attendance"]').click();await wait('attendance');await check('anwesenheit');
  await page.locator('.attendance-list a[href^="#/player/"]').first().click();await page.locator('[data-player-page="overview"]').waitFor();
  await page.locator('[data-page-back]').click();await wait('attendance');
  await page.locator('[data-page-back]').click();await wait('overview');await page.locator('[data-page-back]').click();await wait('list');assert.equal(await page.locator('[data-training-search]').inputValue(),'Defense');
  for(const section of ['event','records','analysis','plan-options','clock']){await page.goto(base+'/#/training/'+ids.training+'/'+section);await wait(section);await check(section);}
  await page.locator('[data-tt="toggle"]').click();await page.locator('[data-tt="score-0-2"]').click();await page.reload();await wait('clock');assert.equal(await page.locator('[data-tt="points-0"]').innerText(),'2');assert.match(await page.locator('[data-tt="toggle"]').innerText(),/Pause/);
  await page.goto(base+'/#/training/'+ids.training+'/plan/library');await wait('library');await check('bibliothek');await page.locator('a[href$="/drill/new"]').click();await wait('drill');await page.locator('[name="name"]').fill('Eigene Abschlussübung');await page.locator('button[type="submit"]').click();await wait('library');
  const direct=await context.newPage();await direct.goto(base+'/#/training/'+ids.training+'/drill/missing');await direct.locator('[data-training-page="missing"]').waitFor();await direct.locator('[data-page-back]').click();await direct.locator('[data-training-page="plan"]').waitFor();await direct.locator('[data-page-back]').click();await direct.locator('[data-training-page="overview"]').waitFor();await direct.locator('[data-page-back]').click();await direct.locator('[data-training-page="list"]').waitFor();await direct.close();
  await page.goto(base+'/#/training/new');await wait('new');await check('neu');await page.locator('[name="note"]').fill('Neues Testtraining');await page.reload();await wait('new');assert.equal(await page.locator('[name="note"]').inputValue(),'Neues Testtraining');await page.locator('button[type="submit"]').click();await wait('overview');
  if(width===390){
    await page.evaluate(()=>document.documentElement.dataset.theme='dark');
    await check('dunkel-training');
    const contrast=await page.evaluate(()=>{
      const luminance=c=>{const rgb=c.match(/[\d.]+/g).slice(0,3).map(n=>{const v=Number(n)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
      const a=luminance(getComputedStyle(document.querySelector('.tp-header h2')).color),b=luminance(getComputedStyle(document.body).backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    });assert(contrast>=4.5,'Trainingsüberschrift braucht ausreichenden Dunkelmodus-Kontrast.');
    await page.goto(base+'/#/training/'+ids.training+'/plan');await wait('plan');await check('dunkel-plan');
  }
  assert.deepEqual(errors,[]);console.log(width+' px: Trainingsseiten, Übungen, Entwürfe, echte Rückwege, Live-Uhr, Wurferfassung und Timer geprüft.');await context.close();
 }
 console.log('Screenshots: '+shots);
} finally {await browser.close();server.kill();}
