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
const base='http://127.0.0.1:'+port,shots=join(tmpdir(),'courthub-briefing-preview');mkdirSync(shots,{recursive:true});
try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<900,hasTouch:width<900,locale:'de-DE',serviceWorkers:'block'});
  await context.route('**/api/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{}'}));
  await context.addInitScript(()=>{window.BT={};let sync;Object.defineProperty(BT,'sync',{configurable:true,get:()=>sync,set(value){sync=value;const original=value.getState;value.getState=()=>({...original(),sessionEpoch:1,user:{id:'briefing-coach',role:'coach',organization:{id:'briefing-test'}}});}});});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  const brief=()=>page.waitForFunction(()=>document.querySelector('.briefing-view')?.dataset.briefingRoute===location.hash);
  const check=async label=>{
   await page.locator('.briefing-view').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished)));
   const sizes=await page.evaluate(()=>[innerWidth,document.documentElement.scrollWidth,document.body.scrollWidth]);assert(Math.max(sizes[1],sizes[2])<=sizes[0]+1,label+': overflow '+sizes);assert.deepEqual(errors,[]);
   for(const height of await page.locator('.briefing-view a:visible,.briefing-view button:visible,.briefing-view summary:visible').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().height)))assert(height>=43,label+': Touchziel '+height);
   await page.screenshot({path:join(shots,label+'-'+width+'.png'),fullPage:true});
  };
  try{
   await page.goto(base+'/#/briefing');await brief();await page.getByRole('heading',{name:'Kein nächster Termin',exact:true}).waitFor();await check('leer');
   const ids=await page.evaluate(async()=>{
    const date=BT.util.todayISO(),p=BT.storage.upsertPlayer({name:'Max',availability:'limited',availabilityNote:'Heute keine Sprünge'});
    const t=BT.storage.upsertTraining({date,startTime:'20:00',location:'Sporthalle',staff:[{role:'coach',name:'Coach',status:'present'}],attendance:[{playerId:p.id,status:'present'}],plan:{summary:'Umschalten und Überzahl erkennen',durationMinutes:20,drills:[{name:'3 gegen 2',minutes:20,coachingPoints:['Blick zum freien Mitspieler'],intensity:'medium'}]}});
    const {emptyDraft}=await import('/js/matchday/model.mjs');
    const g=BT.storage.upsertGame({date,time:'18:00',home:'TSV Lindau',away:'Illertal',team:'u18',matchday:{schemaVersion:1,revisions:[{id:'draft',parents:[],value:{...emptyDraft(),goals:'Ersten Pass sichern',coachingNote:'Früh in der Defense sprechen',warmup:'Passen unter Druck',roster:[{id:p.id,name:p.name,gameStatus:'bench'}],staff:[]}}]}});
    await BT.storage.flush();return{training:t.id,game:g.id};
   });
   await page.reload();await brief();assert.equal(await page.locator('[data-role="briefing-open-event"]').getAttribute('href'),'#/games/'+ids.game);await check('spiel');
   const focus=await page.locator('.briefing-focus').boundingBox();assert(focus.y<700,`${width}: Coaching-Fokus muss früh sichtbar sein.`);
   const stored=await page.evaluate(()=>{const {trainings,games,players}=BT.storage.load();return JSON.stringify({trainings,games,players});});
   await page.locator('[data-role="briefing-open-event"]').click();await page.locator('[data-game-page="overview"]').waitFor();await page.goBack();await brief();assert.equal(new URL(page.url()).hash,'#/briefing');
   assert.equal(await page.evaluate(()=>{const {trainings,games,players}=BT.storage.load();return JSON.stringify({trainings,games,players});}),stored,'Briefing and opening appointment do not modify its data or start a session.');
   await page.locator('[data-briefing-choice][href*="training="]').click();await brief();await page.locator('.briefing-focus').filter({hasText:'Blick zum freien Mitspieler'}).waitFor();await check('training');
   await page.locator('[data-role="briefing-blocks"] summary').click();await page.locator('.briefing-block').filter({hasText:'Blick zum freien Mitspieler'}).waitFor();
   await page.locator('.briefing-view h2').focus();await page.evaluate(id=>{const t=BT.storage.getTraining(id);t.plan.summary='Aktualisierter Trainingsfokus';BT.storage.upsertTraining(t);window.dispatchEvent(new Event('bt-sync-change'));},ids.training);
   await page.locator('.briefing-focus').filter({hasText:'Aktualisierter Trainingsfokus'}).waitFor();assert.equal(await page.locator('[data-role="briefing-blocks"]').getAttribute('open'),'');assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H2');
   await page.evaluate(()=>{window.briefingCopy='';Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.briefingCopy=text;}}});});
   await page.locator('[data-action="share-briefing"]').click();await page.waitForFunction(()=>window.briefingCopy.includes('Aktualisierter Trainingsfokus'));
   await page.locator('[data-role="briefing-open-event"]').click();await page.locator('[data-training-page="overview"]').waitFor();await page.locator('.tp-links a[href*="briefing?training="]').click();await brief();
   await page.locator('[data-page-back]').click();await page.locator('[data-training-page="overview"]').waitFor();
   const direct=await context.newPage();await direct.goto(base+'/#/briefing?game='+ids.game);await direct.locator('[data-role="briefing-open-event"]').waitFor();await direct.locator('[data-page-back]').click();await direct.locator('[data-game-page="overview"]').waitFor();await direct.locator('.gp-task-list a[href*="briefing?game="]').click();await direct.locator('.briefing-focus').waitFor();await direct.close();
   await page.goto(base+'/#/briefing?game='+ids.game);await brief();await page.evaluate(()=>document.documentElement.dataset.theme='dark');await check('spiel-dunkel');
   if(width===390){
    await page.evaluate(id=>{const data=BT.storage.load(),game=data.games.find(g=>g.id===id);game.matchday.revisions.push({id:'conflict',parents:[],value:{...game.matchday.revisions[0].value,goals:'Konfliktinhalt'}});BT.storage.save(data,{fromSync:true});window.dispatchEvent(new Event('bt-sync-change'));},ids.game);
    await page.locator('.briefing-cautions').filter({hasText:'Mehrere Versionen'}).waitFor();assert(!(await page.locator('.briefing-focus').innerText()).includes('Konfliktinhalt'));await check('konflikt');
    await page.goto(base+'/#/briefing?game=missing');await brief();await page.getByRole('heading',{name:'Termin nicht mehr vorhanden'}).waitFor();await check('fehlend');
    await page.evaluate(id=>{const original=BT.sync.getState;BT.sync.getState=()=>({...original(),user:{id:'briefing-viewer',role:'viewer',organization:{id:'briefing-test'}}});location.hash='#/briefing?training='+id;},ids.training);await brief();assert.equal(await page.locator('.briefing-view input,.briefing-view textarea').count(),0);await check('lesezugriff');
   }
   console.log(width+' px: Training/Spiel, Coaching-Fokus, Terminlinks, Kontext, Zurück, Sync, Teilen und Dunkelmodus geprüft.');
  }finally{await context.close();}
 }
 console.log('Screenshots: '+shots);
}finally{await browser.close();server.kill();}
