import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['scripts/static-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j);});
const browser=await chromium.launch({headless:true});
try {
 for(const width of [390,320]) {
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'allow'});
  const user={id:'offline-coach',role:'coach',displayName:'Testtrainer',organization:{id:'offline-team',name:'Testteam'}};
  const date=new Date().toISOString(),data={role:'coach',profiles:[{id:'p',player_profile_id:'player'}],sessions:[{id:'s',individual_profile_id:'p',unit_number:1,status:'planned',attendance_status:'attended',scheduled_for:date}],plans:[{id:'plan',individual_profile_id:'p',session_id:'s',title:'Offline-Testplan',version:1}],exercises:[{id:'e',plan_id:'plan',individual_profile_id:'p',session_id:'s',title:'Freiwürfe',position:1,duration_minutes:10}],measurements:[],readiness:[],focuses:[],feedback:[],releasedFeedback:[],coachNotes:[],aiDrafts:[],pilotRoadmap:[]};
  const actions=[];let networkAvailable=true;
  await context.route('**/api/**',async route=>{
   if(!networkAvailable){await route.abort('internetdisconnected');return;}
   const path=new URL(route.request().url()).pathname;
   let body={};
   if(path==='/api/auth/me')body={user};
   else if(path==='/api/workspace')body={version:1,data:{players:[{id:'player',name:'Testspieler'}],games:[],trainings:[]}};
   else if(path==='/api/individual/overview')body=data;
   else if(path==='/api/individual/manage'){const request=route.request().postDataJSON();actions.push(request);if(request.action==='completeLiveSession')data.sessions[0].status='completed';}
   await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await context.addInitScript(()=>{localStorage.setItem('beeptest_auth_token','synthetic-offline-test');});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=`http://127.0.0.1:${port}/#/individual/player/p/training`;
  await page.goto(url);await page.locator('[data-action="start-live-training"]').waitFor();
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  networkAvailable=false;await context.setOffline(true);await page.reload();
  console.log(width+'px offline reload: '+await page.evaluate(()=>JSON.stringify({online:navigator.onLine,identity:BT.sync.getState().identitySource,keys:Object.keys(localStorage).filter(k=>k.startsWith('courthub_individual'))})));
  await page.locator('[data-action="start-live-training"]').waitFor();
  assert.match(await page.locator('main').innerText(),/Offline: gespeicherter Trainingsstand/);
  await page.locator('[data-action="start-live-training"]').click();await page.locator('[data-live-toggle]').click();
  await page.locator('[data-live-note]').fill('Offline beobachtet und privat gespeichert.');
  const form=page.locator('[data-live-measurement]');await form.locator('[name="value"]').fill('6');await form.getByRole('button',{name:'Speichern',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-live-measurement] [name="value"]').value==='');
  assert.equal(actions.length,0,'Offline darf der Start keine Serverantwort voraussetzen.');
  await page.reload();await page.locator('[data-action="start-live-training"]').click();
  assert.equal(await page.locator('[data-live-note]').inputValue(),'Offline beobachtet und privat gespeichert.');
  await page.locator('[data-live-finish]').click();
  await page.waitForFunction(()=>!document.querySelector('.individual-live-shell'));
  const pending=()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('courthub_individual_coach_queue:')).flatMap(k=>JSON.parse(localStorage.getItem(k))));
  assert.equal((await pending()).length,3,'Start, Messung und Abschluss müssen den Offline-Neustart überstehen.');
  networkAvailable=true;await context.setOffline(false);await page.waitForFunction(()=>Object.keys(localStorage).filter(k=>k.startsWith('courthub_individual_coach_queue:')).every(k=>JSON.parse(localStorage.getItem(k)).length===0));
  assert.deepEqual(actions.map(a=>a.action),['startSession','saveMeasurement','completeLiveSession']);
  assert.equal(actions[2].documents[0].exercises[0].note,'Offline beobachtet und privat gespeichert.');
  assert.equal(new Set(actions.map(a=>a.mutationId)).size,3);
  assert.deepEqual(errors,[]);await context.close();console.log(`${width}px: echter Service Worker, Offline-Kaltstart, Uhr, Notiz, Messung, Neustart, Abschluss und Wiederverbindung geprüft.`);
 }
} finally {await browser.close();server.kill();}
