import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j);});
let browser;
try {
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined});
 for(const width of [390,320]) {
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'allow'});
  const profiles=[{id:'p1',account_name:'Spieler Eins'},{id:'p2',account_name:'Spieler Zwei'}];
  const data={role:'coach',profiles,sessions:profiles.map(p=>({id:'old',individual_profile_id:p.id,unit_number:1,status:'completed',scheduled_for:'2026-10-19T18:15:00Z',attendance_status:'attended'})),plans:profiles.map(p=>({id:'old-plan-'+p.id,session_id:'old',individual_profile_id:p.id,title:'Bestandsaufnahme',version:1})),exercises:[],measurements:[],readiness:[],focuses:[],feedback:[],releasedFeedback:[],coachNotes:[],pilotRoadmap:[],aiDrafts:profiles.map((p,index)=>({id:'draft-'+p.id,individual_profile_id:p.id,session_id:'old',status:'current',content:{planningContractVersion:3,playerRole:index?{key:'center',label:'Center'}:{key:'point_guard',label:'Point Guard'},planningBasis:{primaryPriority:{title:'Passgenauigkeit'},secondaryPriority:{title:'Pick-and-Roll'},deferredTopics:[],allocationMinutes:{primary:60,secondary:30,support:15}},analysis:'Beobachtungen aus der Einheit',nextSession:{title:'Passgenauigkeit',objective:'Präzise Bodenpässe',blocks:[{playerExerciseType:index?'finishing':'passing',priorityRole:'primary',coordinationMode:'individual',roleAssignment:index?'Als Center stabil am Ring abschließen':'Als Point Guard das Passfenster lesen',minutes:105,repetitions:'Kontrollierte Wiederholungen',measurementMethod:'Erfolgreiche Aktionen zählen',coachingCues:['Anspielpunkt treffen']}]}}}))};
  const user={id:'coach',role:'coach',organization:{id:'test-team'}},actions=[];
  await context.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;let body={};
   if(path==='/api/auth/me')body={user};
   else if(path==='/api/workspace')body={version:1,data:{players:[],games:[],trainings:[]}};
   else if(path==='/api/individual/overview')body=data;
   else if(path==='/api/individual/manage'){
    const input=route.request().postDataJSON();actions.push(input);
    if(input.action==='createSession'){
     assert.deepEqual(input.profileIds,['p1','p2']);assert.equal(input.scheduledDate,input.planSource === 'manual' ? '2026-11-23' : '2026-11-16');
     const number = new Set(data.sessions.filter(s=>s.status==='completed').map(s=>s.id)).size + 1;const sessionId='next-'+number;
     data.sessions.push(...profiles.map(p=>({id:sessionId,individual_profile_id:p.id,unit_number:number,status:'planned',scheduled_for:input.scheduledDate+'T19:15:00Z',attendance_status:'attended'})));
     data.plans.push(...profiles.map(p=>({id:'new-plan-'+number+'-'+p.id,session_id:sessionId,individual_profile_id:p.id,title:'Individualtraining · Einheit '+number,version:1})));
     if(input.planSource !== 'manual') data.exercises.push(...profiles.map(p=>({id:'new-exercise-'+number+'-'+p.id,session_id:sessionId,individual_profile_id:p.id,position:1,title:'Passspiel',duration_minutes:105,repetitions:{instruction:'Zielpässe'},measurement_method:{},coaching_cues:['Anspielpunkt treffen']})));
    } else if(input.action==='completeSession') {data.sessions.filter(s=>s.id===input.sessionId).forEach(s=>s.status='completed');body={session:{id:input.sessionId,status:'completed'},queuedDrafts:[]};}
    else if(input.action==='setFocus') {const focus={id:input.focusId || 'focus',individual_profile_id:input.profileId,title:input.title,cue_one:input.cueOne,cue_two:input.cueTwo,success_indicator:input.successIndicator,valid_from:input.validFrom,valid_until:input.validUntil};data.focuses=[focus];body={focus};}
   }
   await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await context.addInitScript(()=>localStorage.setItem('beeptest_auth_token','synthetic-workflow-test'));
  const page=await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/#/individual/player/p1/training`);
  const form=page.locator('[data-plan-session]');await form.waitFor();
  assert.equal(await page.locator('[data-complete-session]').count(),0,'Completed session must not offer completion');
  assert.equal(await page.locator('[data-cancel-session]').count(),0);
  await form.locator('[name="scheduledDate"]').fill('2026-11-16');
  await form.getByRole('button',{name:'Nächste Einheit ansetzen'}).click();
  await page.waitForFunction(()=>document.querySelector('.individual-session-run-card h4')?.textContent.includes('Einheit 2'));
  assert(await page.locator('[data-action="start-live-training"]').isEnabled());
  await page.locator('[data-complete-session]').click();
  await form.waitFor();
  await page.waitForFunction(()=>document.querySelector('.individual-session-run-card')?.textContent.includes('bereits abgeschlossen'));
  assert.equal(await page.locator('[data-complete-session]').count(),0);
  assert.deepEqual(actions.map(a=>a.action),['createSession','completeSession']);
  await page.goto(`http://127.0.0.1:${port}/#/individual/player/p1/focus`);
  const focusForm=page.locator('[data-weekly-focus]');await focusForm.waitFor();
  await focusForm.locator('[name="title"]').fill('Blick vor Ballannahme');
  await focusForm.locator('[name="cueOne"]').fill('Korb zuerst sehen');
  await focusForm.locator('[name="successIndicator"]').fill('Kopf vor dem Dribbling oben');
  await focusForm.locator('[name="validFrom"]').fill('2026-11-09');
  await focusForm.locator('[name="validUntil"]').fill('2026-11-15');
  await focusForm.getByRole('button',{name:'Wochenfokus speichern und freigeben'}).click();
  await page.waitForFunction(()=>document.querySelector('[name="focusId"] option[value="focus"]'));
  await focusForm.locator('[name="focusId"]').selectOption('focus');
  assert.equal(await focusForm.locator('[name="title"]').inputValue(),'Blick vor Ballannahme');
  assert(!('sessionId' in actions.at(-1)),'Focus must be independent of the selected training');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Focus must fit on mobile');
  data.aiDrafts=[];
  await page.goto(`http://127.0.0.1:${port}/#/individual/player/p1/overview`);await form.waitFor();
  assert.equal(await form.locator('[name="planSource"]').inputValue(),'manual');
  assert(await form.locator('button[type="submit"]').isEnabled());
  await form.locator('[name="scheduledDate"]').fill('2026-11-23');
  await form.locator('button[type="submit"]').click();
  await page.locator('.individual-plan-editor[open]').waitFor();
  assert.equal(actions.at(-1).planSource,'manual');
  await page.locator('[data-add-review-exercise]').click();
  assert(await page.locator('[name="repetitions"]').isVisible());
  assert(await page.locator('[name="measurementInstruction"]').isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No mobile horizontal overflow');
  console.log(`${width}px: AI planning, independent editable focus, manual planning and mobile editor`);
  await context.close();
 }
} finally {await browser?.close();server.kill();}
