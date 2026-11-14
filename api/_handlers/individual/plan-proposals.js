import {randomUUID} from 'node:crypto';
import {transaction} from '../../_lib/db.js';
import {isIndividualCoach, requireMembership} from '../../_lib/auth.js';
import {findIndividualProfile} from '../../_lib/individual-access.js';
import {generateWithGemini} from '../../_lib/gemini-client.js';
import {saveSessionPlanReview} from '../../_lib/individual-plan-review.js';
import {method,noStore} from '../../_lib/http.js';
import {uuid,text} from '../../_lib/individual-training.js';
import {revision,proposalError,planningPreferences,snapshotPlan,validatePlanEdit,targetSlots,applyGeneratedExercises} from '../../_lib/training-proposals.js';

async function sourceFor(client,auth,body,{lock=false}={}) {
  const profile=await findIndividualProfile(auth,uuid(body.profileId,'Spielerprofil'),client.query.bind(client));
  if(!profile)proposalError(404,'Individualprofil nicht gefunden.');
  if(lock){const row=(await client.query('SELECT planning_preferences,planning_preferences_version FROM individual_profiles WHERE id=$1 FOR UPDATE',[profile.id])).rows[0];Object.assign(profile,row);}
  const sessionId=uuid(body.sessionId,'Einheit');
  const sessions=(await client.query(`SELECT s.* FROM individual_sessions s
    JOIN individual_session_participants sp ON sp.session_id=s.id
    WHERE sp.individual_profile_id=$1 AND s.organization_id=$2 AND
      (s.id=$3 OR ($4::boolean AND date_trunc('week',s.scheduled_for AT TIME ZONE 'Europe/Berlin')=
      (SELECT date_trunc('week',anchor.scheduled_for AT TIME ZONE 'Europe/Berlin') FROM individual_sessions anchor
       JOIN individual_session_participants ap ON ap.session_id=anchor.id WHERE anchor.id=$3 AND ap.individual_profile_id=$1)))
    ORDER BY s.scheduled_for,s.id ${lock?'FOR UPDATE OF s':''}`,[profile.id,auth.organization_id,sessionId,body.scope==='week'])).rows;
  if(!sessions.some(s=>s.id===sessionId))proposalError(404,'Einheit nicht gefunden.');
  if(sessions.length>7)throw new TypeError('Bitte höchstens sieben Einheiten gemeinsam planen.');
  const plans=[];
  for(const session of sessions) {
    if(session.status!=='planned') {
      if(session.id===sessionId)proposalError(409,'Nur noch nicht begonnene Einheiten können neu geplant werden.');
      continue;
    }
    const plan=(await client.query(`SELECT * FROM individual_session_plans WHERE session_id=$1 AND individual_profile_id=$2 ${lock?'FOR UPDATE':''}`,[session.id,profile.id])).rows[0];
    if(!plan)proposalError(404,'Trainingsplan nicht gefunden.');
    const exercises=(await client.query('SELECT * FROM individual_exercises WHERE plan_id=$1 ORDER BY position',[plan.id])).rows;
    plans.push(snapshotPlan(plan,session,exercises));
  }
  return {profileId:profile.id,preferences:planningPreferences(profile.planning_preferences),preferencesVersion:profile.planning_preferences_version||1,plans};
}

function sameSource(left,right) { return revision(left)===revision(right); }
const receipt = row => ({id:row.id,status:row.status,kind:row.kind,createdAt:row.created_at,source:row.source,proposal:row.proposal,errorCode:row.error_code});

export function createTrainingProposalsHandler(deps={}) {
  const transact=deps.transaction||transaction,membership=deps.requireMembership||requireMembership,generate=deps.generate||generateWithGemini;
  return async(req,res)=>{
    noStore(res);if(!method(req,res,['POST']))return;
    let prepared;
    try {
      const auth=await membership(req,res);if(!auth)return;
      if(!isIndividualCoach(auth.role))return res.status(403).json({error:'Trainingsentwürfe sind nur für zugeordnete Trainer verfügbar.'});
      const body=req.body||{},action=body.action;
      if(Buffer.byteLength(JSON.stringify(body))>160000)return res.status(413).json({error:'Die Planungsanfrage ist zu groß.'});
      if(action==='preferences') {
        const saved=await transact(async client=>{
          const p=await findIndividualProfile(auth,uuid(body.profileId),client.query.bind(client));
          if(!p)proposalError(404,'Individualprofil nicht gefunden.');
          const preferences=planningPreferences(body.preferences);
          const result=await client.query(`UPDATE individual_profiles SET planning_preferences=$1::jsonb,
            planning_preferences_version=planning_preferences_version+1,updated_at=clock_timestamp()
            WHERE id=$2 AND planning_preferences_version=$3 RETURNING planning_preferences,planning_preferences_version`,[JSON.stringify(preferences),p.id,body.expectedVersion]);
          if(!result.rows[0])proposalError(409,'Die Trainingsziele wurden inzwischen geändert. Bitte neu öffnen.');
          await client.query(`INSERT INTO individual_audit_log
            (organization_id,individual_profile_id,entity_type,entity_id,field_name,old_value,new_value,change_reason,changed_by)
            VALUES ($1,$2,'profile',$2,'planning_preferences',$3::jsonb,$4::jsonb,'Trainingsziele angepasst',$5)`,
          [auth.organization_id,p.id,JSON.stringify(p.planning_preferences||{}),JSON.stringify(preferences),auth.sub]);
          return result.rows[0];
        });return res.status(200).json(saved);
      }
      if(['list','publish','discard'].includes(action)) {
        const result=await transact(async client=>{
          const profile=await findIndividualProfile(auth,uuid(body.profileId),client.query.bind(client));
          if(!profile)proposalError(404,'Individualprofil nicht gefunden.');
          if(action==='list') {
            const rows=(await client.query(`SELECT * FROM individual_plan_proposals WHERE individual_profile_id=$1 AND requested_by=$2
              ORDER BY created_at DESC LIMIT 20`,[profile.id,auth.sub])).rows;
            return {proposals:rows.map(receipt)};
          }
          const row=(await client.query(`SELECT * FROM individual_plan_proposals WHERE id=$1 AND individual_profile_id=$2
            AND organization_id=$3 AND requested_by=$4 FOR UPDATE`,[uuid(body.proposalId),profile.id,auth.organization_id,auth.sub])).rows[0];
          if(!row)proposalError(404,'Entwurf nicht gefunden.');
          if(action==='discard') {
            if(row.status==='published')proposalError(409,'Ein veröffentlichter Plan kann nicht als Entwurf verworfen werden.');
            await client.query("UPDATE individual_plan_proposals SET status='discarded',updated_at=clock_timestamp() WHERE id=$1",[row.id]);
            return {proposal:{...receipt(row),status:'discarded'}};
          }
          if(row.status==='published')return {proposal:receipt(row),published:true};
          if(row.status!=='ready'||!row.proposal?.plans)proposalError(409,'Nur ein fertiger aktueller Entwurf kann veröffentlicht werden.');
          const current=await sourceFor(client,auth,{profileId:profile.id,sessionId:row.source.anchorSessionId,scope:row.source.scope},{lock:true});
          if(!sameSource(current,row.source.base))proposalError(409,'Plan, Termin oder Trainingsziele wurden geändert. Der Entwurf bleibt erhalten; bitte mit dem aktuellen Stand neu planen.');
          for(const plan of row.proposal.plans) {
            const session=(await client.query('SELECT * FROM individual_sessions WHERE id=$1',[plan.sessionId])).rows[0];
            await saveSessionPlanReview(client,auth,profile,session,{...plan,changeReason:row.kind==='ai'?'KI-Vorschlag geprüft und veröffentlicht':'Planentwurf geprüft und veröffentlicht'});
          }
          const updated=(await client.query("UPDATE individual_plan_proposals SET status='published',updated_at=clock_timestamp() WHERE id=$1 RETURNING *",[row.id])).rows[0];
          return {proposal:receipt(updated),published:true};
        });return res.status(200).json(result);
      }
      if(!['save','generate'].includes(action))throw new TypeError('Unbekannte Planungsaktion.');
      const requestKey=uuid(body.requestKey,'Auftragskennung'),requestHash=revision(body);
      prepared=await transact(async client=>{
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`training-proposal:${auth.sub}:${requestKey}`]);
        const previous=(await client.query('SELECT * FROM individual_plan_proposals WHERE requested_by=$1 AND request_key=$2',[auth.sub,requestKey])).rows[0];
        if(previous) {
          if(previous.request_hash!==requestHash)proposalError(409,'Diese Auftragskennung gehört zu anderen Eingaben.');
          const access=await findIndividualProfile(auth,previous.individual_profile_id,client.query.bind(client));
          if(!access)proposalError(404,'Individualprofil nicht gefunden.');
          return {existing:previous};
        }
        const base=await sourceFor(client,auth,{...body,scope:action==='save'?'session':body.scope}),plans=structuredClone(base.plans);
        const anchor=plans.find(p=>p.sessionId===body.sessionId);
        if(body.expectedVersion!==anchor.expectedVersion)proposalError(409,'Der Trainingsplan wurde geändert. Bitte neu öffnen.');
        if(body.edit)plans[plans.indexOf(anchor)]=validatePlanEdit(body.edit,anchor);
        let slots=[];
        if(action==='generate') {
          await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`training-generation:${base.profileId}`]);
          await client.query("UPDATE individual_plan_proposals SET status='failed',error_code='AI_TIMEOUT',updated_at=clock_timestamp() WHERE individual_profile_id=$1 AND status='generating' AND created_at<clock_timestamp()-interval '2 minutes'",[base.profileId]);
          const running=await client.query("SELECT id FROM individual_plan_proposals WHERE individual_profile_id=$1 AND status='generating' LIMIT 1",[base.profileId]);
          if(running.rows.length)proposalError(409,'Für diesen Spieler läuft bereits ein KI-Auftrag. Bitte die Entwurfsliste aktualisieren.');
          if(plans.some(p=>[1,4,8].includes(p.unitNumber)))proposalError(409,'Standardisierte Testeinheiten bleiben unverändert. Bitte eine reguläre Einheit auswählen.');
          const usage=(await client.query(`INSERT INTO ai_rate_limit(user_id,action,window_start,count)
            VALUES ($1,'individualPlanRegeneration',now(),1) ON CONFLICT (user_id,action) DO UPDATE SET
            count=CASE WHEN ai_rate_limit.window_start<now()-interval '1 hour' THEN 1 ELSE ai_rate_limit.count+1 END,
            window_start=CASE WHEN ai_rate_limit.window_start<now()-interval '1 hour' THEN now() ELSE ai_rate_limit.window_start END RETURNING count`,[auth.sub])).rows[0];
          if(usage.count>30)proposalError(429,'Das KI-Limit von 30 Aufträgen pro Stunde ist erreicht.');
          const measured=new Set((await client.query('SELECT exercise_id FROM individual_measurements WHERE individual_profile_id=$1 AND exercise_id IS NOT NULL',[base.profileId])).rows.map(r=>r.exercise_id));
          for(const plan of plans)if(!plan.exercises.length) {
            if(!['session','week'].includes(body.scope))throw new TypeError('Für einen leeren Plan bitte die ganze Einheit auswählen.');
            const count=Math.min(7,Math.floor(plan.durationMinutes/5));
            plan.exercises=Array.from({length:count},(_,i)=>({id:null,title:`Neuer Trainingsblock ${i+1}`,durationMinutes:Math.floor(plan.durationMinutes/count)+(i<plan.durationMinutes%count?1:0),repetitions:'',measurementInstruction:'',cues:'',details:{},observation:'',locked:false}));
          }
          // Empty plans contain no manual edits to protect.
          const comparison=base.plans.map(p=>p.exercises.length?p:{...p,exercises:structuredClone(plans.find(x=>x.planId===p.planId).exercises).map((e,i)=>({...e,id:`empty-${i}`}))});
          for(const p of plans)if(!base.plans.find(x=>x.planId===p.planId).exercises.length)p.exercises.forEach((e,i)=>e.id=`empty-${i}`);
          slots=targetSlots(plans,body,comparison,measured);
          for(const p of plans)p.exercises.forEach(e=>{if(e.id?.startsWith('empty-'))e.id=null;});
          for(const p of plans)if(p.exercises.reduce((n,e)=>n+(e.durationMinutes||0),0)>p.durationMinutes)throw new TypeError('Der Plan überschreitet die Einheitsdauer. Bitte zuerst die Dauer korrigieren.');
        } else if(!body.edit)throw new TypeError('Der bearbeitete Plan fehlt.');
        const source={base,scope:action==='save'?'session':body.scope,anchorSessionId:body.sessionId};
        const proposal=action==='save'?{plans}:null;
        const row=(await client.query(`INSERT INTO individual_plan_proposals
          (organization_id,individual_profile_id,requested_by,request_key,request_hash,kind,status,source,proposal)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb) RETURNING *`,
          [auth.organization_id,base.profileId,auth.sub,requestKey,requestHash,action==='save'?'manual':'ai',action==='save'?'ready':'generating',JSON.stringify(source),proposal?JSON.stringify(proposal):null])).rows[0];
        return {row,base,plans,slots,auth,source,request:text(body.request||'Gezielt neue Übungen für die gespeicherten Ziele vorschlagen.','Änderungswunsch',{max:1000})};
      });
      if(prepared.existing)return res.status(200).json({proposal:receipt(prepared.existing)});
      if(action==='save')return res.status(201).json({proposal:receipt(prepared.row)});
      const result=await generate({action:'individualPlanRegeneration',apiKey:process.env.GEMINI_API_KEY,requestId:`training_${randomUUID()}`,
        payload:{data:{preferences:prepared.base.preferences,request:prepared.request,slots:prepared.slots,
          plans:prepared.plans.map(p=>({title:p.title,objective:p.objective,exercises:p.exercises.map(({observation,...e})=>e)}))}}});
      const proposal=applyGeneratedExercises(prepared.plans,prepared.slots,result.value,prepared.base.preferences);
      const final=await transact(async client=>{
        const fresh=await sourceFor(client,auth,{profileId:prepared.base.profileId,sessionId:body.sessionId,scope:body.scope});
        const status=sameSource(fresh,prepared.base)?'ready':'stale';
        const updated=(await client.query(`UPDATE individual_plan_proposals SET status=$1,proposal=$2::jsonb,updated_at=clock_timestamp()
          WHERE id=$3 AND status='generating' RETURNING *`,[status,JSON.stringify(proposal),prepared.row.id])).rows[0];
        if(!updated)proposalError(409,'Der Auftrag wurde zwischenzeitlich verworfen.');
        return updated;
      });return res.status(201).json({proposal:receipt(final)});
    } catch(error) {
      if(prepared?.row?.status==='generating')await transact(client=>client.query(`UPDATE individual_plan_proposals SET status='failed',error_code=$1,updated_at=clock_timestamp() WHERE id=$2 AND status='generating'`,[error.code||'GENERATION_FAILED',prepared.row.id])).catch(()=>{});
      const status=error.status||(error instanceof TypeError?400:500);
      return res.status(status).json({error:status>=500?'Der KI-Auftrag konnte nicht abgeschlossen werden. Dein bisheriger Plan bleibt erhalten.':error.message,code:error.code||'PLAN_REQUEST_FAILED',proposalId:prepared?.row?.id});
    }
  };
}
export default createTrainingProposalsHandler();
