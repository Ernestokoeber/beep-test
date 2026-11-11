import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {JSDOM} from 'jsdom';
import {createIndividualManageHandler} from '../api/_handlers/individual/manage.js';
import {validateFocusDates} from '../api/_lib/individual-weekly-focus.js';

const db = new PGlite();
try {
  // PGlite supplies gen_random_uuid natively; the production pgcrypto extension is not needed here.
  for (const file of ['schema.sql','migrations/20261015_0001_individual_training.sql','migrations/20261111_0001_independent_weekly_focus.sql']) {
    await db.exec(readFileSync(file,'utf8').replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;',''));
  }
  const org=(await db.query("INSERT INTO organizations(name,slug) VALUES ('Test','test') RETURNING id")).rows[0].id;
  const coach=(await db.query("INSERT INTO users(email,display_name,password_hash) VALUES ('coach@test.invalid','Coach','unused') RETURNING id")).rows[0].id;
  const profile=(await db.query("INSERT INTO individual_profiles(organization_id,player_profile_id,coach_user_id) VALUES ($1,'p1',$2) RETURNING id",[org,coach])).rows[0].id;
  const other=(await db.query("INSERT INTO individual_profiles(organization_id,player_profile_id,coach_user_id) VALUES ($1,'p2',$2) RETURNING id",[org,coach])).rows[0].id;
  const session=(await db.query("INSERT INTO individual_sessions(organization_id,coach_user_id,scheduled_for,unit_number,status,completed_at) VALUES ($1,$2,'2026-10-26T19:15Z',1,'completed',now()) RETURNING id",[org,coach])).rows[0].id;
  await db.query('INSERT INTO individual_session_participants(session_id,individual_profile_id) VALUES ($1,$2)',[session,profile]);
  let role='coach';
  const handler=createIndividualManageHandler({requireMembership:async()=>({sub:coach,organization_id:org,role}),now:()=>new Date('2026-11-11T12:00:00Z'),transaction:callback=>db.transaction(callback)});
  const call=async(body,expected)=>{
    const res={statusCode:200,setHeader(){},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
    await handler({method:'POST',headers:{},body},res);
    assert.equal(res.statusCode,expected,JSON.stringify(res.body));return res.body;
  };
  // A missed Monday and no AI draft must not prevent manually planning the following week.
  const planRequest={action:'createSession',profileIds:[profile,other],scheduledDate:'2026-11-16',scheduledTime:'20:15',planSource:'manual'};
  const planned=await call(planRequest,201);
  assert.equal(planned.plans.length,2);assert.equal(planned.session.unit_number,2);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM individual_exercises')).rows[0].count,0);
  await call(planRequest,409);
  await db.query('INSERT INTO individual_readiness(individual_profile_id,session_id,score,created_by) VALUES ($1,$2,7,$3)',[profile,planned.session.id,coach]);
  const shifted=await call({action:'rescheduleSession',profileId:profile,sessionId:planned.session.id,expectedScheduledFor:planned.session.scheduled_for,scheduledDate:'2026-11-23'},200);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM individual_readiness WHERE session_id=$1',[planned.session.id])).rows[0].count,0,'Readiness belongs to the old date');
  const audit=(await db.query("SELECT old_value FROM individual_audit_log WHERE entity_type='session'")).rows[0];assert.equal(audit.old_value.readiness[0].score,7,'Previous readiness is retained in audit history');
  assert.equal(new Date(shifted.session.scheduled_for).toISOString(),'2026-11-23T19:15:00.000Z');
  await call({action:'rescheduleSession',profileId:profile,sessionId:planned.session.id,expectedScheduledFor:planned.session.scheduled_for,scheduledDate:'2026-11-30'},409);
  await call({action:'rescheduleSession',profileId:profile,sessionId:planned.session.id,scheduledDate:'2026-11-16'},200);
  const reminders=await db.query("SELECT * FROM individual_notifications WHERE kind='attendance' AND stopped_at IS NULL");
  assert.equal(reminders.rows.length,2,'Moving back must revive exactly one reminder per participant');
  assert(reminders.rows.every(row=>new Date(row.due_at).toISOString()==='2026-11-16T17:15:00.000Z'));
  const savedPlan=await call({action:'saveSessionPlan',profileId:profile,sessionId:planned.session.id,expectedVersion:1,title:'Eigener Plan',objective:'Ballkontrolle verbessern',changeReason:'Einheit selbst geplant',exercises:[{title:'Ballhandling',durationMinutes:105,repetitions:'3 Serien je Hand',measurementInstruction:'Kontrollverluste zählen',cues:'Blick oben',observation:''}]},200);
  const exercises=await db.query('SELECT * FROM individual_exercises WHERE plan_id=$1',[savedPlan.plan.id]);
  assert.equal(exercises.rows[0].repetitions.instruction,'3 Serien je Hand');
  assert.equal(exercises.rows[0].measurement_method.instruction,'Kontrollverluste zählen');
  assert.equal((await db.query('SELECT count(*)::int AS count FROM individual_measurements')).rows[0].count,0,'Planning must not invent performed measurements');

  const focusRequest={action:'setFocus',profileId:profile,title:'Blick vor Ballannahme',cueOne:'Korb zuerst sehen',successIndicator:'Kopf ist vor dem Dribbling oben',validFrom:'2026-11-09',validUntil:'2026-11-15'};
  const first=await call(focusRequest,201);assert.equal(first.focus.source_session_id,null);
  const retry=await call({...focusRequest,title:'Blick und Orientierung'},200);
  assert.equal(first.focus.id,retry.focus.id,'Saving the same week must update the focus');
  assert.equal((await db.query('SELECT count(*)::int AS count FROM individual_weekly_focus')).rows[0].count,1);
  await call({...focusRequest,validFrom:'2026-11-10'},409);
  await call({...focusRequest,validUntil:'2026-11-08'},400);
  await call({...focusRequest,validUntil:'2026-11-30'},400);
  for (const date of ['2026-02-30','2026-13-01','not-a-date']) assert.throws(()=>validateFocusDates(date,'2026-11-15'),TypeError);
  await call({...focusRequest,profileId:other,focusId:first.focus.id},404);
  role='player';await call(focusRequest,403);await call(planRequest,403);role='coach';
  await call({action:'setWeeklyFeedback',profileId:profile,focusId:first.focus.id,trainingDay:'friday',trainingDate:'2026-11-13',occurrence:'often',implementationScore:4,note:'Gut gelungen'},200);
  await db.query("UPDATE individual_notifications SET push_sent_at=now() WHERE payload->>'focusId'=$1",[first.focus.id]);
  await call({...focusRequest,focusId:first.focus.id,title:'Bewusst orientieren'},200);
  const feedback=(await db.query('SELECT * FROM individual_weekly_feedback')).rows[0];
  assert.equal(feedback.focus_id,first.focus.id);assert.equal(feedback.implementation_score,4);
  const focusReminders=(await db.query("SELECT * FROM individual_notifications WHERE payload->>'focusId'=$1",[first.focus.id])).rows;
  assert.equal(focusReminders.length,2);assert(focusReminders.every(row=>row.push_sent_at));
  assert(focusReminders.find(row=>row.kind==='feedback_request').stopped_at,'An answered feedback reminder must remain stopped');
  assert(focusReminders.every(row=>row.payload.title==='Bewusst orientieren'));
  await call({...focusRequest,focusId:first.focus.id,validFrom:'2026-11-16',validUntil:'2026-11-22'},409);
  await call({...focusRequest,validFrom:'2026-11-16',validUntil:'2026-11-22'},201);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM individual_weekly_focus')).rows[0].count,2,'A second week needs its own focus and keeps history');
  assert((await db.query("SELECT count(*)::int AS count FROM individual_audit_log WHERE entity_type='weekly_focus'")).rows[0].count>=2);
  await call({action:'rescheduleSession',profileId:profile,sessionId:session,scheduledDate:'2026-11-23'},409);

  // Coach UI: current calendar week independent of a future planned session, editable existing focus.
  const dom=new JSDOM('<main></main>',{url:'https://coach.test/',runScripts:'outside-only'}),w=dom.window;
  try {
    const ActualDate=w.Date;w.Date=class extends ActualDate {constructor(...args){super(...(args.length?args:['2026-11-11T12:00:00Z']));}static now(){return new ActualDate('2026-11-11T12:00:00Z').getTime();}};
    const data={role:'coach',profiles:[{id:profile,account_name:'Spieler'}],sessions:[{id:planned.session.id,individual_profile_id:profile,status:'planned',scheduled_for:'2026-11-16T19:15Z',unit_number:2}],focuses:[],aiDrafts:[]};
    const actions=[];
    w.BT={util:{escapeHTML:v=>String(v??'')},storage:{getPlayers:()=>[]},sync:{getState:()=>({user:{id:coach,role:'coach'}})},api:{getIndividualOverview:async()=>data,individualAction:async(action,payload)=>{actions.push({action,payload});}}};
    for(const name of ['individual-copy','individual-training'])w.eval(readFileSync(`js/${name}.js`,'utf8'));
    const root=w.document.querySelector('main');await w.BT.individualTraining.render(root,profile,'focus');
    let form=root.querySelector('[data-weekly-focus]');
    assert.equal(form.elements.validFrom.value,'2026-11-09');assert.equal(form.elements.validUntil.value,'2026-11-15');assert(!form.elements.validFrom.readOnly);
    form.elements.title.value='Eigener Fokus';form.elements.cueOne.value='Blick oben';form.elements.successIndicator.value='Blick vor dem Dribbling';
    form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    await new Promise(r=>setTimeout(r,0));assert.equal(actions.length,1,'Opening the focus page must not create a session');const focusActions=actions.filter(a=>a.action==='setFocus');assert.equal(focusActions.length,1);assert(!('sessionId' in focusActions[0].payload));
    data.focuses=[{...first.focus,title:'Gespeicherter Fokus'}];
    await w.BT.individualTraining.render(root,profile,'focus');form=root.querySelector('[data-weekly-focus]');
    assert.equal(form.elements.focusId.value,first.focus.id);assert.equal(form.elements.title.value,'Gespeicherter Fokus');
    data.sessions=[];data.focuses=[];await w.BT.individualTraining.render(root,profile,'focus');assert(root.querySelector('[data-weekly-focus]'),'Focus must work without any session');
    w.BT.individualTraining.cleanup();
  } finally {dom.window.close();}
  console.log('Flexible Wochen: echte PostgreSQL-Abfragen, Migration, manuelle Zweierplanung, Terminverschiebung, Wochenfokus ohne Einheit, Bearbeitung, Rückmeldungen, Erinnerungen und UI geprüft.');
} finally {await db.close();}
