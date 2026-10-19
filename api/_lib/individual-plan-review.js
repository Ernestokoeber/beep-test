import {text, optionalText, uuid, validateChangeReason, zonedDateTimeToInstant} from './individual-training.js';

// This edits the performed session only. The following session remains an AI draft.
export async function saveSessionPlanReview(client, auth, profile, session, body) {
  if (session.status === 'cancelled') throw new TypeError('Eine abgesagte Einheit kann nicht dokumentiert werden.');
  const reason = validateChangeReason(body.changeReason);
  const plan = (await client.query('SELECT * FROM individual_session_plans WHERE session_id = $1 AND individual_profile_id = $2 FOR UPDATE', [session.id,profile.id])).rows[0];
  if (!plan || plan.version !== body.expectedVersion) { const e=new TypeError('Der Ablauf wurde inzwischen geändert. Bitte neu öffnen.');e.status=409;throw e; }
  if (!Array.isArray(body.exercises) || !body.exercises.length || body.exercises.length > 30) throw new TypeError('Bitte 1 bis 30 Übungen angeben.');
  const old = (await client.query('SELECT * FROM individual_exercises WHERE plan_id = $1 ORDER BY position FOR UPDATE',[plan.id])).rows;
  const seen = new Set();
  const exercises = body.exercises.map(e => {
    const id=e.id ? uuid(e.id,'Übungs-ID') : null;
    if (id && (!old.some(row=>row.id===id) || seen.has(id))) throw new TypeError('Ungültige oder doppelte Übungszuordnung.');
    if (id) seen.add(id);
    const minutes=e.durationMinutes === null || e.durationMinutes === '' ? null : Number(e.durationMinutes);
    if (minutes !== null && (!Number.isInteger(minutes) || minutes<1 || minutes>120)) throw new TypeError('Die Übungsdauer muss zwischen 1 und 120 Minuten liegen oder leer bleiben.');
    return {id,title:text(e.title,'Übung',{min:2,max:200}),minutes,
      cues:optionalText(e.cues,'Trainerhinweise',{min:1,max:1000}) || '',
      observation:optionalText(e.observation,'Beobachtung',{min:1,max:500}) || ''};
  });
  const removed=old.filter(e=>!seen.has(e.id)).map(e=>e.id);
  if (removed.length) {
    const measured=await client.query('SELECT id FROM individual_measurements WHERE exercise_id = ANY($1::uuid[]) LIMIT 1',[removed]);
    if (measured.rows.length) throw new TypeError('Übungen mit gespeicherten Ergebnissen bitte beibehalten. Ihre Ergebnisse dürfen nicht verloren gehen.');
  }
  let endedAt=null;
  if (body.endedTime) {
    const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(session.scheduled_for));
    endedAt=zonedDateTimeToInstant(date,body.endedTime);
    if (Date.parse(endedAt)<Date.parse(session.scheduled_for) || Date.parse(endedAt)>Date.now()+300000) throw new TypeError('Das tatsächliche Ende muss nach dem geplanten Beginn und in der Vergangenheit liegen.');
  }
  const before={plan,exercises:old};
  await client.query('DELETE FROM individual_exercises WHERE plan_id = $1 AND id = ANY($2::uuid[])',[plan.id,removed]);
  // Move retained rows out of the way before applying their new order.
  await client.query('UPDATE individual_exercises SET position = position + 100 WHERE plan_id = $1',[plan.id]);
  for (const [index,e] of exercises.entries()) {
    const previous=old.find(row=>row.id===e.id);
    const sameExercise=previous?.title===e.title;
    const repetitions=sameExercise ? previous.repetitions || {} : {};
    const measurement={...(sameExercise ? previous?.measurement_method || {} : {}),durationNotRecorded:e.minutes===null,
      documentation:'Nachgetragener tatsächlicher Ablauf. Nicht notierte Dauer ist unbekannt. Keine standardisierte Ausgangsmessung unterstellen.'};
    const params=[plan.id,index+1,e.title,e.minutes || 1,JSON.stringify(repetitions),JSON.stringify(measurement),JSON.stringify(e.cues.split('\n').filter(Boolean))];
    const saved=e.id
      ? await client.query('UPDATE individual_exercises SET position=$2,title=$3,duration_minutes=$4,repetitions=$5::jsonb,measurement_method=$6::jsonb,coaching_cues=$7::jsonb WHERE plan_id=$1 AND id=$8 RETURNING *',[...params,e.id])
      : await client.query('INSERT INTO individual_exercises (plan_id,position,title,duration_minutes,repetitions,measurement_method,coaching_cues) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb) RETURNING *',params);
    const note=(await client.query("SELECT * FROM individual_measurements WHERE exercise_id=$1 AND individual_profile_id=$2 AND metric_key='trainernotiz' ORDER BY server_received_at DESC LIMIT 1",[saved.rows[0].id,profile.id])).rows[0];
    if (e.observation && note?.text_value !== e.observation) {
      await client.query(`INSERT INTO individual_measurements (organization_id,individual_profile_id,session_id,exercise_id,metric_key,text_value,created_by)
        VALUES ($1,$2,$3,$4,'trainernotiz',$5,$6)`,[auth.organization_id,profile.id,session.id,saved.rows[0].id,e.observation,auth.sub]);
    }
  }
  if (endedAt) {
    await client.query(`INSERT INTO individual_measurements (organization_id,individual_profile_id,session_id,metric_key,text_value,created_by)
      VALUES ($1,$2,$3,'tatsaechliches_ende',$4,$5)`,[auth.organization_id,profile.id,session.id,endedAt,auth.sub]);
    await client.query(`INSERT INTO individual_measurements (organization_id,individual_profile_id,session_id,metric_key,numeric_value,unit,created_by)
      VALUES ($1,$2,$3,'dauer_ab_geplantem_beginn',$4,'Minuten',$5)`,[auth.organization_id,profile.id,session.id,(Date.parse(endedAt)-Date.parse(session.scheduled_for))/60000,auth.sub]);
  }
  const updated=(await client.query('UPDATE individual_session_plans SET title=$1,objective=$2,version=version+1,updated_at=clock_timestamp() WHERE id=$3 RETURNING *',
    [text(body.title,'Titel',{min:2,max:200}),text(body.objective,'Ziel',{min:2,max:3000}),plan.id])).rows[0];
  await client.query(`INSERT INTO individual_audit_log (organization_id,individual_profile_id,entity_type,entity_id,field_name,old_value,new_value,change_reason,changed_by)
    VALUES ($1,$2,'session_plan',$3,'performed_plan',$4::jsonb,$5::jsonb,$6,$7)`,[auth.organization_id,profile.id,plan.id,JSON.stringify(before),JSON.stringify({plan:updated,exercises}),reason,auth.sub]);
  await client.query("UPDATE individual_ai_drafts SET status='stale' WHERE individual_profile_id=$1 AND session_id=$2 AND status='current'",[profile.id,session.id]);
  return {status:200,body:{plan:updated}};
}
