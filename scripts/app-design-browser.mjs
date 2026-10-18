import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {ids,user,overview} from './fixtures/individual-player.mjs';
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j);});
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||(existsSync(chromium.executablePath())?undefined:'msedge')});
const base='http://127.0.0.1:'+port,shots=process.env.COURTHUB_DESIGN_SHOTS||join(tmpdir(),'courthub-design');mkdirSync(shots,{recursive:true});const results=[];
try {
 for(const width of [320,390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',locale:'de-DE',reducedMotion:'reduce'});
  await ctx.addInitScript(()=>localStorage.setItem('beeptest_auth_token','isolated-design-test'));
  await ctx.route('**/api/**',r=>{const url=new URL(r.request().url()),path=url.pathname;const body=path==='/api/individual/manage'?{}:path==='/api/members'?{members:[]}:path==='/api/individual/push'?{enabled:false}:path==='/api/auth/me'?{user:{...user,role:'coach'}}:path==='/api/individual/overview'&&url.searchParams.get('view')==='responses'?{responses:[]}:path==='/api/individual/overview'?{...overview,role:'coach'}:path==='/api/individual/sync'?{results:[]}:path==='/api/individual/responses'?{responses:[]}:null;return r.fulfill({status:body?200:503,contentType:'application/json',body:JSON.stringify(body||{error:'Isolierter Designtest'})});});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/#/players');await page.locator('[data-role=player-search]').waitFor();
  const keys=await page.evaluate(async()=>{const today=BT.util.todayISO();const p=BT.storage.upsertPlayer({name:'Alexander Beispiel-Mustermann',position:'Guard',jerseyNumber:'12'});const t=BT.storage.upsertTraining({date:today,startTime:'18:15',location:'Sporthalle Lindau',plan:{summary:'Sicher abschließen und schnell entscheiden',drills:[{name:'Korbleger links',minutes:10}]}});const g=BT.storage.upsertGame({date:today,time:'20:00',home:'TSV Lindau',away:'Wasserburg/Günzburg'});await BT.storage.flush();return{player:p.id,training:t.id,game:g.id};});
  const routes=['dashboard','training','training/'+keys.training,'players','player/'+keys.player,'tactics','games','games/'+keys.game,'schedule','statistics','briefing','opponents','drills','management','notes','reports','settings','data','history','jerseys','tablecrew','test/setup','account','individual','individual/player/'+ids.profile+'/overview','individual/player/'+ids.profile+'/preview','individual/player/'+ids.profile+'/preview/training','individual/player/'+ids.profile+'/preview/progress'];
  for(const theme of ['light','dark'])for(const route of routes){
   await page.goto(base+'/?design='+encodeURIComponent(route+'-'+theme)+'#/'+route);await page.waitForFunction(()=>document.querySelector('#app')?.textContent.trim().length>20&&!document.querySelector('#app')?.textContent.includes('Individualtraining wird geladen'));
   try{await page.locator('#app h1, #app h2, #app h3').first().waitFor({timeout:5000});}catch(e){console.log(await page.locator('#app').innerText(),errors);throw e;}
   await page.evaluate(theme=>BT.app.setThemePreference(theme),theme);
   await page.locator('#app').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));
   const layout=await page.evaluate(()=>({width:innerWidth,actual:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),title:document.querySelector('#app h1, #app h2, #app h3')?.textContent,overflow:[...document.querySelectorAll('#app *')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.right>innerWidth+1&&getComputedStyle(e).position!=='fixed'}).slice(0,6).map(e=>e.className)}));
   assert(layout.actual<=width+1,`${width}/${theme}/${route}: ${JSON.stringify(layout)}`);
   assert(layout.title,`Fehlende Seitenüberschrift: ${route}`);assert.deepEqual(errors,[]);
   assert.equal(new URL(page.url()).hash.split('?')[0],'#/'+route,'Die angeforderte Seite darf nicht auf eine andere Route zurückfallen.');
   if(route==='drills'){assert.equal(layout.title,'Übungsbibliothek');assert.equal(await page.getByRole('button',{name:'Weitere 0 anzeigen',exact:true}).count(),0,'Leere Bibliothek darf keine Mehr-Schaltfläche zeigen.');}if(route==='management')assert.equal(layout.title,'Verwaltung');
   if(route==='individual'){
    const card=page.locator('.individual-profile-card').first();await card.waitFor();
    assert(await card.locator('[data-coach-attendance]').isVisible());assert(await card.locator('[data-coach-readiness]').isVisible());
    assert.equal(await card.locator('details').getAttribute('open'),null);await card.locator('summary').click();assert(await card.getByText('KI-Auswertung',{exact:true}).isVisible());await card.locator('summary').click();
    await card.locator('h3 a').click();await page.locator('.individual-coach-detail-page').waitFor();await page.locator('.individual-coach-detail-page a[href="#/individual"]').first().click();await page.locator('.individual-profile-card').first().waitFor();
   }
   if(route.endsWith('/preview')&&width<1024){assert.equal(await page.locator('.individual-player-tabs').isVisible(),false);assert(await page.locator('.individual-player-dock').isVisible());assert.equal(await page.locator('#app form :enabled').count(),0);}
   const name=route.replaceAll('/','_').replaceAll(/[a-f0-9]{8}-[a-f0-9-]+/g,'player');
   if(width===390||width===1280&&['dashboard','individual','tactics'].includes(route))await page.screenshot({path:join(shots,`${width}-${theme}-${name}.png`),fullPage:true});
   results.push({width,theme,route,title:layout.title});
  }
  await ctx.close();console.log(`${width}px: ${routes.length} Ansichten in Hell und Dunkel ohne Seitenüberlauf geprüft.`);
 }
 writeFileSync(join(shots,'results.json'),JSON.stringify(results,null,2));console.log('Screenshots: '+shots);
}finally{await browser.close();server.kill();}
