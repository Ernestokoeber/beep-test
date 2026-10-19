import assert from 'node:assert/strict';
import {saveSessionPlanReview} from '../api/_lib/individual-plan-review.js';
import {createIndividualManageHandler} from '../api/_handlers/individual/manage.js';
const id=n=>`${n}`.repeat(8)+'-'+`${n}`.repeat(4)+'-4'+`${n}`.repeat(3)+'-8'+`${n}`.repeat(3)+'-'+`${n}`.repeat(12);
const profile={id:id(1),organization_id:id(2)},auth={sub:id(3),organization_id:id(2),role:'coach'},session={id:id(4),status:'in_progress'},plan={id:id(5),version:1};
const old=[{id:id(6),title:'Alte Übung',duration_minutes:10,position:1,measurement_method:{rules:'Alter Test'},repetitions:{totalAttempts:25}}];
let measured=false;const writes=[];
const client={query:async(sql,p=[])=>{
 if(sql.startsWith('SELECT * FROM individual_session_plans'))return{rows:[plan]};
 if(sql.startsWith('SELECT * FROM individual_exercises'))return{rows:old};
 if(sql.startsWith('SELECT id FROM individual_measurements'))return{rows:measured?[{id:'existing'}]:[]};
 if(sql.startsWith('SELECT * FROM individual_measurements'))return{rows:[]};
 writes.push({sql,p});
 if(sql.includes('individual_exercises')&&sql.includes('RETURNING'))return{rows:[{id:id(7)}]};
 if(sql.startsWith('UPDATE individual_session_plans'))return{rows:[{...plan,version:2}]};
 return{rows:[]};
}};
const body={expectedVersion:1,title:'Bestandsaufnahme – tatsächlich durchgeführt',objective:'Tatsächlicher Ablauf laut Hallennotizen.',changeReason:'Durchgeführte Übungen nachgetragen',exercises:[{id:id(6),title:'Freiwürfe',durationMinutes:null,cues:'Ruhig abschließen.',observation:'6 von 10 getroffen.'}]};
assert.equal((await saveSessionPlanReview(client,auth,profile,session,body)).status,200);
const exercise=writes.find(x=>x.sql.startsWith('UPDATE individual_exercises SET position=$2'));
assert.equal(JSON.parse(exercise.p[5]).durationNotRecorded,true);assert.equal(JSON.parse(exercise.p[5]).rules,undefined,'Altes Testprotokoll darf nicht zu anderer Übung übernommen werden');
assert.deepEqual(JSON.parse(exercise.p[4]),{});
assert(writes.some(x=>x.sql.includes('individual_audit_log')),'Planänderung braucht den alten Stand im Audit');
assert(writes.some(x=>x.sql.includes("'trainernotiz'")),'Beobachtung muss privat bleiben');
await assert.rejects(saveSessionPlanReview(client,auth,profile,session,{...body,expectedVersion:2}),/inzwischen geändert/);
measured=true;await assert.rejects(saveSessionPlanReview(client,auth,profile,session,{...body,exercises:[{...body.exercises[0],id:null}]}),/gespeicherten Ergebnissen/);

// Lost replies repeat exactly once inside the same transaction; actor/payload reuse is rejected.
let record=null,insertions=0;
const handler=createIndividualManageHandler({requireMembership:async()=>auth,transaction:async fn=>fn({query:async(sql,p=[])=>{
 if(sql.includes('FROM individual_profiles'))return{rows:[{...profile,coach_user_id:auth.sub}]};
 if(sql.includes('FROM individual_sessions'))return{rows:[session]};
 if(sql.startsWith('SELECT * FROM individual_sync_mutations'))return{rows:record?[record]:[]};
 if(sql.includes('INSERT INTO individual_coach_notes')){insertions++;return{rows:[{id:id(8),note:p[2]}]};}
 if(sql.includes('INSERT INTO individual_sync_mutations'))record={organization_id:auth.organization_id,individual_profile_id:profile.id,payload:JSON.parse(p[4])};
 return{rows:[]};
}})});
const call=async(extra={})=>{const res={setHeader(){},status(n){this.code=n;return this;},json(body){this.body=body;return this;}};await handler({method:'POST',body:{action:'addCoachNote',profileId:profile.id,sessionId:session.id,note:'Privater Originaltext',mutationId:'coach-offline-test',...extra}},res);return res;};
assert.equal((await call()).code,201);assert.equal((await call()).code,201);assert.equal(insertions,1);
assert.equal((await call({note:'Geänderter Inhalt mit derselben Kennung'})).code,409);assert.equal(insertions,1);
console.log('Ablaufkorrektur: Versionskonflikte, unveränderte Messwerte, unbekannte Dauer, privates Ergebnis, Audit und idempotente Coach-API geprüft.');
