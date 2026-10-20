import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j);});
let browser;
try {
 browser=await chromium.launch({headless:true});
 for(const width of [390,320]) {
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'allow'});
  const profiles=[{id:'p1',account_name:'Spieler Eins'},{id:'p2',account_name:'Spieler Zwei'}];
  const data={role:'coach',profiles,sessions:profiles.map(p=>({id:'old',individual_profile_id:p.id,unit_number:1,status:'completed',scheduled_for:'2026-10-19T18:15:00Z',attendance_status:'attended'})),plans:profiles.map(p=>({id:'old-plan-'+p.id,session_id:'old',individual_profile_id:p.id,title:'Bestandsaufnahme',version:1})),exercises:[],measurements:[],readiness:[],focuses:[],feedback:[],releasedFeedback:[],coachNotes:[],pilotRoadmap:[],aiDrafts:profiles.map(p=>({id:'draft-'+p.id,individual_profile_id:p.id,session_id:'old',status:'current',content:{planningContractVersion:2,planningBasis:{primaryPriority:{title:'Passgenauigkeit'},secondaryPriority:{title:'Pick-and-Roll'},deferredTopics:[],allocationMinutes:{primary:60,secondary:30,support:15}},analysis:'Beobachtungen aus der Einheit',nextSession:{title:'Passgenauigkeit',objective:'Präzise Bodenpässe',blocks:[{priorityRole:'primary',minutes:105,repetitions:'Kontrollierte Zielpässe',measurementMethod:'Präzise Anspiele zählen',coachingCues:['Anspielpunkt treffen']}]}}}))};
  const user={id:'coach',role:'coach',organization:{id:'test-team'}},actions=[];
  await context.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;let body={};
   if(path==='/api/auth/me')body={user};
   else if(path==='/api/workspace')body={version:1,data:{players:[],games:[],trainings:[]}};
   else if(path==='/api/individual/overview')body=data;
   else if(path==='/api/individual/manage'){
    const input=route.request().postDataJSON();actions.push(input);
    if(input.action==='createSession'){
     assert.deepEqual(input.profileIds,['p1','p2']);assert.equal(input.scheduledDate,'2026-10-26');
     data.sessions.push(...profiles.map(p=>({id:'next',individual_profile_id:p.id,unit_number:2,status:'planned',scheduled_for:'2026-10-26T19:15:00Z',attendance_status:'attended'})));
     data.plans.push(...profiles.map(p=>({id:'new-plan-'+p.id,session_id:'next',individual_profile_id:p.id,title:'Individualtraining · Einheit 2',version:1})));
     data.exercises.push(...profiles.map(p=>({id:'new-exercise-'+p.id,session_id:'next',individual_profile_id:p.id,position:1,title:'Passspiel',duration_minutes:105,repetitions:{instruction:'Zielpässe'},measurement_method:{},coaching_cues:['Anspielpunkt treffen']})));
    } else if(input.action==='completeSession') {data.sessions.filter(s=>s.id==='next').forEach(s=>s.status='completed');body={session:{id:'next',status:'completed'},queuedDrafts:[]};}
   }
   await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await context.addInitScript(()=>localStorage.setItem('beeptest_auth_token','synthetic-workflow-test'));
  const page=await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/#/individual/player/p1/training`);
  const form=page.locator('[data-plan-session]');await form.waitFor();
  assert.equal(await page.locator('[data-complete-session]').count(),0,'Completed session must not offer completion');
  assert.equal(await page.locator('[data-cancel-session]').count(),0);
  await form.getByRole('button',{name:'Nächste Einheit mit KI-Plan ansetzen'}).click();
  await page.waitForFunction(()=>document.querySelector('.individual-session-run-card h4')?.textContent.includes('Einheit 2'));
  assert(await page.locator('[data-action="start-live-training"]').isEnabled());
  await page.locator('[data-complete-session]').click();
  await form.waitFor();
  await page.waitForFunction(()=>document.querySelector('.individual-session-run-card')?.textContent.includes('bereits abgeschlossen'));
  assert.equal(await page.locator('[data-complete-session]').count(),0);
  assert.deepEqual(actions.map(a=>a.action),['createSession','completeSession']);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No mobile horizontal overflow');
  console.log(`${width}px: completed session -> next shared AI plan -> completion, no obsolete actions or duplicated requests`);
  await context.close();
 }
} finally {await browser?.close();server.kill();}
