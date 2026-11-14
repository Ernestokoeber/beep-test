import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createTrainingProposalsHandler} from '../../api/_handlers/individual/plan-proposals.js';

export async function trainingFixture(){
  const db=new PGlite();
  await db.exec(readFileSync('schema.sql','utf8').replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;',''));
  for(const file of readdirSync('migrations').filter(f=>f.endsWith('.sql')&&!f.endsWith('.down.sql')).sort())await db.exec(readFileSync('migrations/'+file,'utf8').replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;',''));
  const org=(await db.query("INSERT INTO organizations(name,slug) VALUES ('Training test','training-test') RETURNING id")).rows[0].id;
  const coach=(await db.query("INSERT INTO users(email,display_name,password_hash) VALUES ('coach@training.invalid','Coach','unused') RETURNING id")).rows[0].id;
  const profiles=[];
  for(const name of ['Thomas','Adnan'])profiles.push((await db.query('INSERT INTO individual_profiles(organization_id,player_profile_id,coach_user_id) VALUES ($1,$2,$3) RETURNING *',[org,name,coach])).rows[0]);
  const sessions=[],plans=[],exercises=[];
  for(const [i,profile] of profiles.entries()){
    const session=i?sessions[0]:(await db.query("INSERT INTO individual_sessions(organization_id,coach_user_id,scheduled_for,unit_number,duration_minutes) VALUES ($1,$2,$3,2,105) RETURNING *",[org,coach,`2026-11-${16+i}T19:15Z`])).rows[0];sessions.push(session);
    await db.query('INSERT INTO individual_session_participants(session_id,individual_profile_id) VALUES ($1,$2)',[session.id,profile.id]);
    const plan=(await db.query('INSERT INTO individual_session_plans(session_id,individual_profile_id,title,objective,created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',[session.id,profile.id,i?'Postgefühl':'Dribbling und Entscheidungen',i?'Weich abschließen':'Drive oder Pass lesen',coach])).rows[0];plans.push(plan);
    const list=[];
    for(let index=0;index<3;index++)list.push((await db.query(`INSERT INTO individual_exercises(plan_id,position,title,duration_minutes,repetitions,measurement_method,coaching_cues)
      VALUES ($1,$2,$3,30,$4::jsonb,$5::jsonb,'["Blick oben"]') RETURNING *`,[plan.id,index+1,`${profile.player_profile_id} Übung ${index+1}`,JSON.stringify({instruction:'Sechs saubere Aktionen, dann 30 Sekunden Pause.'}),JSON.stringify({instruction:'Saubere Aktionen zählen.'})])).rows[0]);exercises.push(list);
  }
  let auth={sub:coach,organization_id:org,role:'coach'},calls=0,generator=null,lastInput;
  const generate=async request=>{calls++;lastInput=request;if(generator)return generator(request);return {value:{exercises:request.payload.data.slots.map(slot=>({slotId:slot.slotId,title:'Neue Entscheidung '+slot.index,minutes:slot.minutes,
    goal:'Freien Raum erkennen',setup:'Ein Feld markieren und einen Ball bereitlegen.',instructions:'1. Zum freien Tor dribbeln. 2. Kontrolliert abbremsen. 3. Sechsmal wiederholen, dann 30 Sekunden Pause.',pause:'30 Sekunden zwischen den Serien',cues:'Blick oben, kontrolliert abbremsen.',successIndicator:'Acht richtige Entscheidungen in zehn Aktionen.',easier:'Zwei feste Tore.',harder:'Späteres Richtungssignal.',players:1,helpers:1,baskets:0,equipment:['Basketball']}))}};};
  const handler=createTrainingProposalsHandler({requireMembership:async()=>auth,transaction:cb=>db.transaction(cb),generate});
  const call=async body=>{const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};await handler({method:'POST',body,headers:{}},res);return res;};
  const edit=(index=0)=>({expectedVersion:plans[index].version,title:plans[index].title,objective:plans[index].objective,exercises:exercises[index].map(e=>({id:e.id,title:e.title,durationMinutes:e.duration_minutes,repetitions:e.repetitions.instruction,measurementInstruction:e.measurement_method.instruction,cues:e.coaching_cues.join('\n'),observation:'',details:{},locked:false}))});
  return {db,org,coach,profiles,sessions,plans,exercises,handler,call,edit,setAuth:value=>auth=value,auth:()=>auth,calls:()=>calls,setGenerator:value=>generator=value,lastInput:()=>lastInput};
}
