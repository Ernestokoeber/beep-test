import {text, optionalText, uuid} from './individual-training.js';

function fail(status, message) { const error = new TypeError(message); error.status = status; throw error; }
export function validateFocusDates(from, until) {
  for (const value of [from, until]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || !Number.isFinite(Date.parse(`${value}T12:00:00Z`)) || new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) !== value) {
      throw new TypeError('Bitte gültige Kalendertage für den Wochenfokus angeben.');
    }
  }
  const days = (Date.parse(until) - Date.parse(from)) / 86400000;
  if (days < 0 || days > 6) throw new TypeError('Der Wochenfokus muss einen Zeitraum von einem bis sieben Tagen abdecken.');
}

export async function saveWeeklyFocus(client, auth, profile, body, session = null) {
  const {validFrom, validUntil} = body;
  validateFocusDates(validFrom, validUntil);
  const values = [text(body.title,'Wochenfokus',{min:2,max:120}),
    text(body.cueOne,'Erster Hinweis',{min:2,max:240}), optionalText(body.cueTwo,'Zweiter Hinweis',{min:2,max:240}),
    text(body.successIndicator,'Erkennungsmerkmal',{min:2,max:300}), validFrom, validUntil, auth.sub];
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`individual-focus:${profile.id}`]);
  const focusId = body.focusId ? uuid(body.focusId, 'Wochenfokus-ID') : null;
  const existing = (await client.query(
    `SELECT *, valid_from::text AS valid_from, valid_until::text AS valid_until FROM individual_weekly_focus
      WHERE individual_profile_id = $1 AND
        (($2::uuid IS NOT NULL AND id = $2) OR ($2::uuid IS NULL AND
          ((valid_from = $3::date AND valid_until = $4::date) OR source_session_id = $5::uuid)))
      ORDER BY released_at DESC LIMIT 1 FOR UPDATE`,
    [profile.id, focusId, validFrom, validUntil, session?.id || null]
  )).rows[0];
  if (focusId && !existing) fail(404, 'Wochenfokus nicht gefunden.');
  if (existing && (existing.valid_from !== validFrom || existing.valid_until !== validUntil)) {
    const feedback = await client.query('SELECT id FROM individual_weekly_feedback WHERE focus_id = $1 LIMIT 1', [existing.id]);
    if (feedback.rows.length) fail(409, 'Zu diesem Zeitraum gibt es bereits Rückmeldungen. Bitte einen neuen Wochenfokus anlegen.');
  }
  const overlap = await client.query(
    `SELECT id FROM individual_weekly_focus WHERE individual_profile_id = $1
      AND valid_from <= $3::date AND valid_until >= $2::date AND ($4::uuid IS NULL OR id <> $4) LIMIT 1`,
    [profile.id, validFrom, validUntil, existing?.id || null]
  );
  if (overlap.rows.length) fail(409, 'Für diesen Zeitraum ist bereits ein Wochenfokus vorhanden. Bitte diesen zum Bearbeiten auswählen.');
  const saved = existing
    ? await client.query(`UPDATE individual_weekly_focus
        SET title=$1, cue_one=$2, cue_two=$3, success_indicator=$4, valid_from=$5, valid_until=$6,
            released_by=$7, released_at=clock_timestamp() WHERE id=$8 AND individual_profile_id=$9
        RETURNING *, valid_from::text AS valid_from, valid_until::text AS valid_until`, [...values, existing.id, profile.id])
    : await client.query(`INSERT INTO individual_weekly_focus
        (title,cue_one,cue_two,success_indicator,valid_from,valid_until,released_by,individual_profile_id,source_session_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *, valid_from::text AS valid_from, valid_until::text AS valid_until`, [...values, profile.id, session?.id || null]);
  const focus = saved.rows[0];
  if (existing) await client.query(`INSERT INTO individual_audit_log
    (organization_id,individual_profile_id,entity_type,entity_id,field_name,old_value,new_value,change_reason,changed_by)
    VALUES ($1,$2,'weekly_focus',$3,'focus',$4::jsonb,$5::jsonb,'Wochenfokus durch Trainer bearbeitet',$6)`,
    [auth.organization_id,profile.id,focus.id,JSON.stringify(existing),JSON.stringify(focus),auth.sub]);
  // Retain sent/read markers so editing a focus never sends an old reminder twice.
  await client.query(`UPDATE individual_notifications SET stopped_at=clock_timestamp()
    WHERE individual_profile_id=$1 AND payload->>'focusId'=$2 AND stopped_at IS NULL`, [profile.id, focus.id]);
  await client.query(`WITH friday AS (
      SELECT day::date AS training_date FROM generate_series($3::date,$4::date,interval '1 day') day
      WHERE extract(isodow FROM day)=5
    ), reminders AS (
      SELECT training_date,'focus'::text AS kind,(training_date + time '18:15') AT TIME ZONE 'Europe/Berlin' AS due_at FROM friday
      UNION ALL SELECT training_date,'feedback_request',(training_date+1+time '12:00') AT TIME ZONE 'Europe/Berlin' FROM friday
    )
    INSERT INTO individual_notifications (individual_profile_id,notification_key,kind,due_at,payload,stopped_at)
    SELECT $1::uuid,$1::text || ':' || kind || ':' || due_at::text,kind,due_at,
      jsonb_build_object('focusId',$2::text,'trainingDate',training_date::text,'trainingDay','friday',
        'title',$5::text,'cueOne',$6::text,'cueTwo',$7::text),
      CASE WHEN kind='feedback_request' AND EXISTS (
        SELECT 1 FROM individual_weekly_feedback f WHERE f.individual_profile_id=$1 AND f.training_date=reminders.training_date
      ) THEN clock_timestamp() ELSE NULL END
    FROM reminders
    ON CONFLICT (individual_profile_id,notification_key) DO UPDATE
      SET payload=EXCLUDED.payload, stopped_at=EXCLUDED.stopped_at`,
    [profile.id,focus.id,validFrom,validUntil,focus.title,focus.cue_one,focus.cue_two]);
  return {status: existing ? 200 : 201, body:{focus}};
}
