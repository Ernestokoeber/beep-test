import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdirSync} from 'node:fs';
import {trainingFixture} from './fixtures/training-proposals.mjs';
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j);});
let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
  mkdirSync('/tmp/courthub-planning-screenshots',{recursive:true});
  for(const width of [320,390,1280]){
    const f=await trainingFixture();
    const context=await browser.newContext({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
    await context.route('**/api/**',async route=>{
      if(route.request().url().endsWith('/individual/plan-proposals')){const r=await f.call(route.request().postDataJSON());return route.fulfill({status:r.statusCode,contentType:'application/json',body:JSON.stringify(r.body)});}
      return route.fulfill({status:401,contentType:'application/json',body:'{}'});
    });
    await context.addInitScript(()=>{window.BT={};let sync;Object.defineProperty(BT,'sync',{configurable:true,get:()=>sync,set(value){sync=value;const get=value.getState;value.getState=()=>({...get(),sessionEpoch:1,user:{id:'planning-coach',role:'coach',organization:{id:'planning-team'}}});}});});
    const check=async label=>{assert(await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)<=innerWidth+1),label+': horizontal overflow');assert.deepEqual(errors,[]);await page.screenshot({path:`/tmp/courthub-planning-screenshots/${label}-${width}.png`,fullPage:true});};
    try{
      await page.goto(`http://127.0.0.1:${port}/#/drills`);await page.locator('[data-library-item]').first().waitFor();
      const fixture=JSON.parse(JSON.stringify({profile:f.profiles[0],session:f.sessions[0],plan:f.plans[0],exercises:f.exercises[0]}));
      await page.evaluate(fixture=>{window.planningFixture=fixture;const host=document.querySelector('#app');host.innerHTML='<section class="individual-view"><div class="individual-profile-grid"></div></section>';BT.individualPlanBrowser.mount(host.firstChild,{profiles:[{...fixture.profile,account_name:'Thomas'}],sessions:[{...fixture.session,individual_profile_id:fixture.profile.id}],plans:[fixture.plan],exercises:fixture.exercises},{open:(profileId,sessionId)=>window.openedPlan={profileId,sessionId}});},fixture);
      await page.locator('[data-plan-week]').selectOption('');await check('coach-plans');await page.locator('[data-open-plan]').click();assert.equal((await page.evaluate(()=>window.openedPlan)).sessionId,fixture.session.id);
      await page.evaluate(()=>{const host=document.querySelector('#app');host.innerHTML='<section class="individual-view"></section>';BT.individualPlanEditor.mount(host.firstChild,{...window.planningFixture,measurements:[],refresh:async()=>{window.planPublished=true;}});});
      await page.locator('.individual-plan-editor > summary').click();
      await page.locator('[data-planning-goals] > summary').click();await page.locator('[data-goal-preset=guard]').click();await page.locator('[data-save-goals]').click();await page.locator('[data-goal-status]').filter({hasText:'gespeichert'}).waitFor();await check('goals');
      await page.locator('[data-regeneration] > summary').click();await page.locator('[data-regenerate-choice]').nth(1).check();await page.locator('[data-generate-plan]').click();await page.locator('[data-publish-proposal]').waitFor();await check('preview');
      assert.equal((await f.db.query('SELECT version FROM individual_session_plans WHERE id=$1',[fixture.plan.id])).rows[0].version,1);
      await page.locator('[data-adopt-proposal]').click();assert.equal(await page.locator('[name=exerciseTitle]').nth(1).inputValue(),'Neue Entscheidung 1');
      await page.locator('[name=exerciseTitle]').nth(1).fill('Vom Coach nachbearbeitete KI-Übung');
      await page.locator('[data-review-exercises] fieldset').nth(1).locator('.exercise-structured-fields summary').click();await check('editor');
      await page.locator('.individual-plan-editor form > button[type=submit]').click();await page.locator('[data-publish-proposal]').waitFor();assert((await page.locator('[data-proposal-preview]').innerText()).includes('Vom Coach nachbearbeitete KI-Übung'));
      await page.locator('[data-publish-proposal]').click();await page.waitForFunction(()=>window.planPublished===true);
      assert.equal((await f.db.query('SELECT version FROM individual_session_plans WHERE id=$1',[fixture.plan.id])).rows[0].version,2);
      assert.equal((await f.db.query('SELECT title FROM individual_exercises WHERE plan_id=$1 ORDER BY position',[fixture.plan.id])).rows[1].title,'Vom Coach nachbearbeitete KI-Übung');
      assert.equal((await f.db.query('SELECT version FROM individual_session_plans WHERE id=$1',[f.plans[1].id])).rows[0].version,1);
      console.log(`${width}px: coach overview, player goals, selected regeneration, editable preview, real database publication and player isolation passed`);
    }catch(error){await page.screenshot({path:`/tmp/courthub-planning-screenshots/failure-${width}.png`,fullPage:true}).catch(()=>{});throw error;}
    finally{await context.close();await f.db.close();}
  }
}finally{await browser?.close();server.kill();}
