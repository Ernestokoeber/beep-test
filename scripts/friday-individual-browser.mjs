import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdirSync} from 'node:fs';
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
let browser;
try {
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
  mkdirSync('/tmp/courthub-friday-screenshots',{recursive:true});
  for(const width of [320,390,1280]) {
    const context=await browser.newContext({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600,serviceWorkers:'allow',reducedMotion:'reduce'});
    await context.route('**/api/**',route=>route.fulfill({status:401,contentType:'application/json',body:'{}'}));
    await context.addInitScript(()=>{window.BT={};let util;Object.defineProperty(BT,'util',{configurable:true,get:()=>util,set(value){util=value;util.todayISO=()=>'2026-11-20';}});let sync;Object.defineProperty(BT,'sync',{configurable:true,get:()=>sync,set(value){sync=value;const get=value.getState;value.getState=()=>({...get(),sessionEpoch:1,user:{id:'friday-coach',role:'coach',organization:{id:'friday-fixture'}}});}});});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
    const base='http://127.0.0.1:'+port;
    const check=async name=>{assert(await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)<=innerWidth+1),name+' overflows at '+width);assert.deepEqual(errors,[]);await page.screenshot({path:'/tmp/courthub-friday-screenshots/'+name+'-'+width+'.png',fullPage:true});};
    try {
      await page.goto(base+'/#/dashboard');
      await page.evaluate(async()=>{for(const date of ['2027-01-15','2027-01-22'])BT.storage.upsertTraining({date,startTime:'20:15',attendance:[],plan:{summary:'Existing January plan',drills:[]}});await BT.storage.flush();});
      await page.locator('[data-workspace="friday-individual"]').click();
      assert((await page.locator('[data-friday-current]').innerText()).includes('20.11.2026'));assert.equal(await page.locator('[name=date]').inputValue(),'2026-11-20');
      const firstWeeks=['2026-11-20','2026-11-27','2026-12-04','2026-12-11','2026-12-18','2026-12-25','2027-01-01','2027-01-08','2027-01-15','2027-01-22','2027-01-29','2027-02-05'];
      const listedDates=()=>page.locator('[data-friday-upcoming] [data-friday-date]').evaluateAll(nodes=>nodes.map(n=>n.dataset.fridayDate));
      assert.deepEqual(await listedDates(),firstWeeks);assert.equal(await page.locator('[data-friday-open-date="2026-11-27"]').count(),1);
      assert.equal(await page.evaluate(()=>BT.storage.getTrainings().length),2,'Showing missing weeks must not write training records');
      await check('missing-fridays-before-january');
      await page.locator('[data-friday-open-current]').click();await page.locator('[data-friday-mode=pending]').waitFor();
      assert.equal(await page.evaluate(()=>BT.storage.getTrainings().filter(t=>t.date==='2026-11-20').length),1);
      await page.goto(base+'/#/friday-individual');await page.getByRole('link',{name:'500 Übungskarten nach Position ansehen'}).click();
      await page.locator('[data-friday-item]').first().waitFor();assert.equal(await page.evaluate(()=>BT.fridayPositionExercises.length),500);
      assert(await page.locator('body').evaluate(el=>el.classList.contains('friday-workspace-mode')));
      if(width<600){
        assert(await page.locator('.friday-mobile-link').isVisible());assert(!await page.locator('.mobile-dock [data-team-nav]').first().isVisible());
        assert(await page.locator('.mobile-dock [data-role="mobile-more"]').isVisible());
        assert((await page.locator('.friday-mobile-link').boundingBox()).width>=120,'Friday dock label needs an unclipped column');
      }
      assert.equal(await page.locator('[data-friday-item]').count(),20);await check('overview');
      for(const position of ['pg','sg','sf','pf','c']) {
        await page.locator('.friday-position[href="#/friday-individual?position='+position+'"]').click();
        await page.waitForFunction(p=>location.hash==='#/friday-individual?position='+p && document.querySelector('[data-friday-count]')?.textContent.includes('100 Übungen'),position);
        await page.locator('[name=task]').selectOption('Konter finden');assert.equal(await page.locator('[data-friday-item]').count(),20);
      }
      await check('center-filter');await page.locator('[name=search]').fill('Drop-Step');assert.equal(await page.locator('[data-friday-item]').count(),3);
      await page.locator('[data-friday-item] a').first().click();await page.locator('[data-friday-page=detail]').waitFor();
      assert.equal(await page.locator('.friday-task-links a').count(),4);await check('detail');
      await page.goBack();await page.locator('[data-friday-page=list]').waitFor();assert.equal(await page.locator('[name=search]').inputValue(),'Drop-Step');
      await page.locator('[data-friday-reset]').click();await page.locator('[data-friday-more]').click();assert.equal(await page.locator('[data-friday-item]').count(),40);
      await page.locator('[name=players]').selectOption('1');assert.equal(await page.locator('[data-friday-item]').count(),3);
      const untouched=await page.evaluate(()=>({trainings:BT.storage.getTrainings().length,drills:BT.storage.getDrills().length}));assert.deepEqual(untouched,{trainings:3,drills:0});
      if(width===390) {
        await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
        await context.setOffline(true);await page.reload();await page.locator('[data-friday-page=list]').waitFor();
        assert.equal(await page.evaluate(()=>BT.fridayPositionExercises.length),500);
        await page.locator('[data-friday-reset]').click();await page.locator('[data-friday-item] a').first().click();await page.locator('[data-friday-page=detail]').waitFor();await check('offline-detail');
        await page.evaluate(()=>document.documentElement.dataset.theme='dark');await check('dark-detail');await context.setOffline(false);
      }
      // Real workspace storage: the same attendance controls drive the <10 rule.
      const session=await page.evaluate(async()=>{
        const players=Array.from({length:10},(_,i)=>BT.storage.upsertPlayer({name:'Friday fixture '+i,position:['PG','SG','SF','PF','C'][i%5]}));
        const existing=BT.storage.getTrainings().find(t=>t.date==='2026-11-20');
        const training=BT.storage.upsertTraining({...existing,date:'2026-11-20',startTime:'20:15',attendance:players.map((p,i)=>({playerId:p.id,status:i<9?'present':'absent',late:false,note:''})),plan:{summary:'Keep the manual plan',drills:[{id:'keep',name:'Unchanged drill',minutes:20}]},freethrows:[]});
        await BT.storage.flush();return {id:training.id,players:players.map(p=>p.id)};
      });
      await page.goto(base+'/#/friday-individual/training/'+session.id);await page.locator('[data-friday-mode=individual]').waitFor();
      assert.equal(await page.locator('[data-friday-player]').count(),9);await check('attendance-assignments');
      await page.locator('[data-friday-attendance="'+session.players[9]+'"]').selectOption('present');await page.locator('[data-friday-mode=team]').waitFor();assert.equal(await page.locator('[data-friday-player]').count(),0);
      await page.locator('[data-friday-attendance="'+session.players[9]+'"]').selectOption('absent');await page.locator('[data-friday-mode=individual]').waitFor();
      await page.locator('[data-friday-position="'+session.players[0]+'"]').selectOption('sg');
      await page.waitForFunction(id=>BT.storage.getTraining(id).fridayIndividual?.positions && Object.values(BT.storage.getTraining(id).fridayIndividual.positions).includes('sg'),session.id);
      await page.waitForFunction(()=>document.querySelector('[data-friday-save]')?.textContent==='Gespeichert.');
      await page.reload();await page.locator('[data-friday-mode=individual]').waitFor();assert.equal(await page.locator('[data-friday-position="'+session.players[0]+'"]').inputValue(),'sg');
      if(width===390){await context.setOffline(true);await page.reload();await page.locator('[data-friday-mode=individual]').waitFor();assert.equal(await page.locator('[data-friday-player]').count(),9);await check('offline-assignments');await context.setOffline(false);}
      assert.equal(await page.evaluate(id=>BT.storage.getTraining(id).plan.drills[0].name,session.id),'Unchanged drill');
      await page.goto(base+'/#/training/'+session.id+'/attendance');await page.locator('[data-friday-training-entry]').waitFor();
      await page.locator('.att-card').filter({has:page.getByRole('link',{name:'Friday fixture 9',exact:true})}).locator('[data-status=present]').click();
      await page.waitForFunction(()=>document.querySelector('[data-friday-training-entry]')?.textContent.includes('10 anwesende Spieler'));
      await page.locator('[data-friday-training-entry] a').click();await page.locator('[data-friday-mode=team]').waitFor();
      await page.evaluate(async()=>{for(const date of ['2027-03-05','2026-11-27','2026-11-13'])BT.storage.upsertTraining({date,attendance:[],plan:{drills:[]}});await BT.storage.flush();});
      await page.goto(base+'/#/friday-individual');await page.locator('[data-friday-upcoming]').waitFor();
      assert.deepEqual(await listedDates(),firstWeeks);
      const beforeMore=await page.evaluate(()=>JSON.stringify(BT.storage.getTrainings()));
      await page.locator('[data-friday-more-weeks]').click();const expanded=await listedDates();assert.equal(expanded.length,24);
      for(let i=1;i<expanded.length;i++)assert.equal((Date.parse(expanded[i])-Date.parse(expanded[i-1]))/86400000,7,'No missing Fridays after expanding');
      assert(await page.locator('[data-friday-date="2027-03-05"]').getAttribute('href'));
      assert.equal(await page.evaluate(()=>JSON.stringify(BT.storage.getTrainings())),beforeMore);
      assert(!await page.locator('[data-friday-past] nav').isVisible());
      assert.equal(await page.locator('[data-friday-current] a').getAttribute('href'),'#/friday-individual/training/'+session.id);
      await check('every-friday');
      await page.locator('[data-friday-open-date="2026-12-04"]').click();await page.locator('[data-friday-mode=pending]').waitFor();
      const created=await page.evaluate(()=>BT.storage.getTrainings().filter(t=>t.date==='2026-12-04').map(t=>({id:t.id,count:t.attendance.length})));
      assert.equal(created.length,1);assert.equal(created[0].count,10,'An unsaved Friday opens with the real player attendance list');
      await page.goto(base+'/#/friday-individual');assert.equal(await page.locator('[data-friday-date="2026-12-04"]').getAttribute('href'),'#/friday-individual/training/'+created[0].id);
      assert.equal(await page.evaluate(()=>BT.storage.getTrainings().find(t=>t.date==='2027-01-15').plan.summary),'Existing January plan');
      console.log(width+'px: separate workspace, five 100-card positions, task/search/resource filters, details, back state and no plan writes passed.');
      console.log(width+'px: real Friday attendance, 9/10 mode changes, positional recommendations, persisted day roles, offline assignments and existing attendance-page connection passed.');
    } catch(error) {await page.screenshot({path:'/tmp/courthub-friday-screenshots/failure-'+width+'.png',fullPage:true}).catch(()=>{});throw error;}
    finally {await context.close();}
  }
} finally {await browser?.close();server.kill();}
