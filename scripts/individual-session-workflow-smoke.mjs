import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createIndividualManageHandler} from '../api/_handlers/individual/manage.js';
const id=n=>`${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const [coach,org,p1,p2,s1,s2,planId]=[1,2,3,4,5,6,7].map(id);
const content={nextSession:{objective:'Kontrolliert passen',blocks:[{playerExerciseType:'passing',minutes:105,repetitions:'Zielpässe',measurementMethod:'Präzision zählen',coachingCues:['Anspielpunkt treffen']}]}};
let open=false,missing=false,queries=[],state={writes:[],published:[]};
const handler=createIndividualManageHandler({requireMembership:async()=>({sub:coach,organization_id:org,role:'coach'}),transaction:async fn=>{
 const before=structuredClone(state);
 try{return await fn({query:async(sql,params=[])=>{
  queries.push(sql);
  if(sql.includes('FROM individual_profiles'))return {rows:[{id:params[0],organization_id:org,coach_user_id:coach}]};
  if(sql.includes('SELECT content FROM individual_ai_drafts')){
   assert(sql.includes("status IN ('current', 'approved')"));assert(sql.includes("s.status = 'completed'"));assert(sql.includes('max(newest.version)'));
   return {rows:missing&&params[0]===p2?[]:[{content}]};
  }
  if(sql.includes('SELECT id FROM individual_sessions'))return {rows:open?[{id:s2}]:[]};
  if(sql.includes('SELECT max('))return {rows:[{date:'2026-10-19'}]};
  if(sql.includes('SELECT count(*)'))return {rows:[{count:1}]};
  if(sql.includes('SELECT s.*'))return {rows:[{id:s1,status:'completed'}]};
  if(sql.includes('FROM individual_ai_drafts'))return {rows:[]};
  if(sql.includes('INSERT INTO individual_sessions')){state.writes.push('session');return {rows:[{id:s2,unit_number:2,scheduled_for:params[2]}]};}
  if(sql.includes('INSERT INTO individual_session_plans')){state.writes.push('plan');return {rows:[{id:planId}]};}
  if(sql.includes('INSERT INTO individual_exercises'))state.writes.push('exercise');
  if(sql.includes('individual_released_feedback')||sql.includes('individual_weekly_focus'))state.published.push(sql);
  return {rows:[]};
 }});}catch(e){state=before;throw e;}
}});
const call=async(body)=>{const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};await handler({method:'POST',headers:{},body},res);return res;};
const request={action:'createSession',profileIds:[p1,p2],scheduledDate:'2026-10-26',scheduledTime:'20:15'};
let res=await call(request);assert.equal(res.statusCode,201,JSON.stringify(res.body));assert.equal(res.body.plans.length,2);assert.deepEqual(state.writes,['session','plan','exercise','plan','exercise']);assert.equal(state.published.length,0,'Planübernahme darf keine Rückmeldung veröffentlichen');
state.writes=[];open=true;assert.equal((await call(request)).statusCode,409);assert.equal(state.writes.length,0,'Offene Einheit darf nicht dupliziert werden');
open=false;missing=true;assert.equal((await call(request)).statusCode,409);assert.equal(state.writes.length,0,'Fehlender KI-Plan muss die gesamte Anlage zurückrollen');
res=await call({action:'completeSession',profileId:p1,sessionId:s1});assert.equal(res.statusCode,200);assert.equal(res.body.alreadyCompleted,true);assert.equal(state.writes.length,0,'Wiederholter Abschluss darf keine Daten duplizieren');

const dom=new JSDOM('<main></main>',{url:'https://coach.test/#/individual',runScripts:'outside-only'}),w=dom.window;
const data={role:'coach',profiles:[{id:p1,account_name:'Spieler Eins'},{id:p2,account_name:'Spieler Zwei'}],sessions:[p1,p2].map(p=>({id:s1,individual_profile_id:p,scheduled_for:'2026-10-19T18:15:00Z',unit_number:1,status:'completed',attendance_status:'attended'})),plans:[p1,p2].map(p=>({id:planId,session_id:s1,individual_profile_id:p,title:'Erfasste Einheit'})),exercises:[],aiDrafts:[{id:'draft',individual_profile_id:p1,session_id:s1,status:'current',content}],pilotRoadmap:[],coachNotes:[],measurements:[]};
let release;const calls=[];
w.BT={util:{escapeHTML:s=>String(s??'')},storage:{getPlayers:()=>[]},sync:{getState:()=>({user:{id:coach,role:'coach'}})},api:{getIndividualOverview:async()=>data,individualAction:async(action,payload)=>{calls.push({action,payload});await new Promise(r=>release=r);throw Error('Test: Verbindung unterbrochen');}}};
for(const name of ['individual-copy','individual-training'])w.eval(readFileSync(`js/${name}.js`,'utf8'));
const root=w.document.querySelector('main');await w.BT.individualTraining.render(root,p1,'training');
assert(!root.querySelector('[data-complete-session]'));assert(!root.querySelector('[data-cancel-session]'));assert(!root.querySelector('[data-set-attendance]'));assert(root.textContent.includes('bereits abgeschlossen'));
let form=root.querySelector('[data-plan-session]');assert(form,'Abgeschlossene Durchführung muss direkt zur nächsten Planung führen');assert.equal(form.elements.secondProfileId.value,p2);assert.equal(form.elements.scheduledDate.value,'2026-10-26');
form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(calls.length,1);assert.deepEqual([...calls[0].payload.profileIds],[p1,p2]);assert(form.querySelector('button').disabled);
release();await new Promise(r=>setTimeout(r,0));assert.match(form.querySelector('[data-plan-session-status]').textContent,/Verbindung/);assert(!form.querySelector('button').disabled);assert.equal(form.elements.secondProfileId.value,p2);
await w.BT.individualTraining.render(root,p1,'ai-history');assert(root.querySelector('.individual-ai-plan').textContent.includes('Zielpässe'));assert(root.querySelector('[data-plan-session]'));
await w.BT.individualTraining.render(root,p1,'overview');assert(root.querySelector('[data-plan-session]'));
w.BT.individualTraining.cleanup();dom.window.close();console.log('Einheitenablauf: wiederholter Abschluss, aktueller privater KI-Plan, vollständige Zweierplanung, keine Veröffentlichung, Rollback und Doppelklickschutz geprüft.');
