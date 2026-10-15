import { createHash, randomUUID } from 'node:crypto';
import { transaction } from '../../_lib/db.js';
import { isIndividualCoach, requireMembership } from '../../_lib/auth.js';
import { findIndividualProfile } from '../../_lib/individual-access.js';
import { generateWithGemini } from '../../_lib/gemini-client.js';
import { canApproveDraft, uuid } from '../../_lib/individual-training.js';
import { method, noStore, safeError } from '../../_lib/http.js';

class DraftRequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function revisionOf(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function sourceData(client, auth, profileId, sessionId) {
  const profile = await findIndividualProfile(auth, uuid(profileId, 'Individualprofil-ID'), client.query.bind(client));
  if (!profile) throw new DraftRequestError(404, 'Individualprofil nicht gefunden.');
  const session = await client.query(
    `SELECT s.* FROM individual_sessions s
      JOIN individual_session_participants sp ON sp.session_id = s.id
     WHERE s.id = $1 AND sp.individual_profile_id = $2 AND s.organization_id = $3`,
    [uuid(sessionId, 'Einheiten-ID'), profile.id, auth.organization_id]
  );
  if (!session.rows[0]) throw new DraftRequestError(404, 'Einheit nicht gefunden.');
  if (session.rows[0].status !== 'completed') throw new DraftRequestError(409, 'KI-Entwürfe entstehen erst nach Abschluss der Einheit.');
  const pending = await client.query(
    'SELECT count(*)::int AS count FROM individual_sync_mutations WHERE individual_profile_id = $1 AND applied = FALSE', [profile.id]
  );
  if (Number(pending.rows[0].count) > 0) throw new DraftRequestError(409, 'Zugehörige Offline-Eingaben sind noch nicht vollständig synchronisiert.');
  const [plan, exercises, measurements, readiness, focuses, weeklyFeedback, releasedFeedback] = await Promise.all([
    client.query('SELECT title, objective, version FROM individual_session_plans WHERE session_id = $1 AND individual_profile_id = $2', [session.rows[0].id, profile.id]),
    client.query(`SELECT e.position, e.title, e.duration_minutes, e.repetitions, e.measurement_method, e.coaching_cues
                    FROM individual_exercises e JOIN individual_session_plans p ON p.id = e.plan_id
                   WHERE p.session_id = $1 AND p.individual_profile_id = $2 ORDER BY e.position`, [session.rows[0].id, profile.id]),
    client.query(`SELECT metric_key, numeric_value, text_value, unit, attempt, device_recorded_at, server_received_at
                    FROM individual_measurements WHERE individual_profile_id = $1 AND session_id = $2
                   ORDER BY server_received_at`, [profile.id, session.rows[0].id]),
    client.query(`SELECT score, device_recorded_at, server_received_at FROM individual_readiness
                   WHERE individual_profile_id = $1 AND session_id = $2`, [profile.id, session.rows[0].id]),
    client.query(`SELECT title, cue_one, cue_two, success_indicator, valid_from, valid_until
                    FROM individual_weekly_focus WHERE individual_profile_id = $1 ORDER BY valid_from DESC LIMIT 8`, [profile.id]),
    client.query(`SELECT training_day, training_date, occurrence, implementation_score, note
                    FROM individual_weekly_feedback WHERE individual_profile_id = $1 ORDER BY training_date DESC LIMIT 16`, [profile.id]),
    client.query(`SELECT content, released_at FROM individual_released_feedback
                   WHERE individual_profile_id = $1 ORDER BY released_at DESC LIMIT 8`, [profile.id])
  ]);
  return {
    profile: { id: profile.id, playerProfileId: profile.player_profile_id },
    session: session.rows[0],
    plan: plan.rows[0] || null,
    exercises: exercises.rows,
    measurements: measurements.rows,
    readiness: readiness.rows[0] || null,
    previousFocuses: focuses.rows,
    weeklyFeedback: weeklyFeedback.rows,
    releasedFeedback: releasedFeedback.rows,
    constraints: { durationMinutes: 105, availableBaskets: 1, maximumParticipants: 2, medicalInferencesForbidden: true }
  };
}

async function publishApprovedContent(client, auth, draft) {
  const content = draft.content;
  await client.query(
    `INSERT INTO individual_released_feedback (individual_profile_id, session_id, content, released_by)
     VALUES ($1, $2, $3, $4)`,
    [draft.individual_profile_id, draft.session_id, content.playerFeedback, auth.sub]
  );
  const focus = content.weeklyFocus;
  const saved = await client.query(
    `INSERT INTO individual_weekly_focus
      (individual_profile_id, source_session_id, title, cue_one, cue_two, success_indicator, valid_from, valid_until, released_by)
     SELECT $1, s.id, $2, $3, $4, $5,
            (s.scheduled_for AT TIME ZONE 'Europe/Berlin')::date + 1,
            (s.scheduled_for AT TIME ZONE 'Europe/Berlin')::date + 6,
            $6
       FROM individual_sessions s WHERE s.id = $7
     RETURNING *`,
    [draft.individual_profile_id, focus.title, focus.coachingCues[0], focus.coachingCues[1] || null,
      focus.successIndicator, auth.sub, draft.session_id]
  );
  await client.query(
    `WITH friday AS (
       SELECT day::date AS training_date, 'friday'::text AS training_day
         FROM generate_series($3::date, $4::date, interval '1 day') day
        WHERE extract(isodow FROM day) = 5
     ), reminders AS (
       SELECT training_date, training_day, 'focus'::text AS kind,
              (training_date + time '18:15') AT TIME ZONE 'Europe/Berlin' AS due_at FROM friday
       UNION ALL SELECT training_date, training_day, 'feedback_request',
              (training_date + 1 + time '12:00') AT TIME ZONE 'Europe/Berlin' FROM friday
     )
     INSERT INTO individual_notifications (individual_profile_id, notification_key, kind, due_at, payload)
     SELECT $1, $1::text || ':' || kind || ':' || due_at::text, kind, due_at,
            jsonb_build_object('focusId', $2::text, 'trainingDate', training_date::text, 'trainingDay', training_day,
              'title', $5::text, 'cueOne', $6::text, 'cueTwo', $7::text)
       FROM reminders
     ON CONFLICT (individual_profile_id, notification_key) DO NOTHING`,
    [draft.individual_profile_id, saved.rows[0].id, saved.rows[0].valid_from, saved.rows[0].valid_until,
      saved.rows[0].title, saved.rows[0].cue_one, saved.rows[0].cue_two]
  );
}

export function createIndividualAIDraftHandler(deps = {}) {
  const membership = deps.requireMembership || requireMembership;
  const runTransaction = deps.transaction || transaction;
  const generate = deps.generate || generateWithGemini;
  return async function handler(req, res) {
    noStore(res);
    if (!method(req, res, ['POST'])) return;
    try {
      const auth = await membership(req, res);
      if (!auth) return;
      if (!isIndividualCoach(auth.role)) return res.status(403).json({ error: 'KI-Entwürfe sind nur im Coach-Bereich verfügbar.' });
      const action = String(req.body?.action || 'generate');

      if (action === 'approve') {
        const result = await runTransaction(async client => {
          const selected = await client.query(
            `SELECT d.* FROM individual_ai_drafts d
              JOIN individual_profiles p ON p.id = d.individual_profile_id
             WHERE d.id = $1 AND p.organization_id = $2
               AND ($3 = 'admin' OR p.coach_user_id = $4)
             FOR UPDATE`,
            [uuid(req.body.draftId, 'Entwurfs-ID'), auth.organization_id, auth.role, auth.sub]
          );
          const draft = selected.rows[0];
          if (!draft) throw new DraftRequestError(404, 'KI-Entwurf nicht gefunden.');
          if (!canApproveDraft(draft)) throw new DraftRequestError(409, 'Nur ein aktueller, vollständiger KI-Entwurf kann freigegeben werden. Veraltete Entwürfe müssen neu erzeugt werden.');
          const approved = await client.query(
            `UPDATE individual_ai_drafts
                SET status = 'approved', approved_by = $1, approved_at = clock_timestamp()
              WHERE id = $2 AND status = 'current'
              RETURNING *`, [auth.sub, draft.id]
          );
          if (!approved.rows[0]) throw new DraftRequestError(409, 'Der Entwurfsstatus hat sich geändert.');
          await publishApprovedContent(client, auth, approved.rows[0]);
          return approved.rows[0];
        });
        return res.status(200).json({ draft: result, published: true });
      }

      if (action !== 'generate' && action !== 'regenerate') throw new DraftRequestError(400, 'Unbekannte KI-Entwurfsaktion.');
      const prepared = await runTransaction(async client => {
        const data = await sourceData(client, auth, req.body.profileId, req.body.sessionId);
        const sourceRevision = revisionOf(data);
        let draft = null;
        if (action === 'generate') {
          const queued = await client.query(
            `SELECT * FROM individual_ai_drafts
              WHERE individual_profile_id = $1 AND session_id = $2 AND status = 'queued'
              ORDER BY version DESC LIMIT 1 FOR UPDATE`, [data.profile.id, data.session.id]
          );
          draft = queued.rows[0] || null;
          if (!draft) {
            const existing = await client.query(
              `SELECT * FROM individual_ai_drafts
                WHERE individual_profile_id = $1 AND session_id = $2
                ORDER BY version DESC LIMIT 1`, [data.profile.id, data.session.id]
            );
            if (existing.rows[0]?.status === 'current' || existing.rows[0]?.status === 'approved') {
              throw new DraftRequestError(409, 'Für diese Einheit existiert bereits ein aktueller oder freigegebener Entwurf.');
            }
            draft = existing.rows[0] || null;
          }
        }
        if (action === 'regenerate') {
          await client.query(
            `UPDATE individual_ai_drafts SET status = 'stale'
              WHERE individual_profile_id = $1 AND session_id = $2 AND status = 'current'`, [data.profile.id, data.session.id]
          );
          draft = null;
        }
        if (draft && ['queued', 'failed'].includes(draft.status)) {
          const updated = await client.query(
            `UPDATE individual_ai_drafts
                SET status = 'generating', source_revision = $1, error_code = NULL, requested_by = $2
              WHERE id = $3 RETURNING *`, [sourceRevision, auth.sub, draft.id]
          );
          draft = updated.rows[0];
        } else if (!draft || action === 'regenerate') {
          const created = await client.query(
            `INSERT INTO individual_ai_drafts
              (individual_profile_id, session_id, version, status, source_revision, requested_by)
             SELECT $1, $2, COALESCE(max(version), 0) + 1, 'generating', $3, $4
               FROM individual_ai_drafts WHERE individual_profile_id = $1 AND session_id = $2
             RETURNING *`, [data.profile.id, data.session.id, sourceRevision, auth.sub]
          );
          draft = created.rows[0];
        } else if (draft.status === 'generating') {
          throw new DraftRequestError(409, 'Der KI-Entwurf wird bereits erzeugt.');
        }
        return { data, draft };
      });

      try {
        const generated = await generate({
          action: 'individualTrainingDraft', payload: { data: prepared.data },
          apiKey: process.env.GEMINI_API_KEY, requestId: `individual_${randomUUID()}`
        });
        const current = await runTransaction(async client => {
          await client.query(
            `UPDATE individual_ai_drafts SET status = 'stale'
              WHERE individual_profile_id = $1 AND session_id = $2 AND status = 'current' AND id <> $3`,
            [prepared.draft.individual_profile_id, prepared.draft.session_id, prepared.draft.id]
          );
          const updated = await client.query(
            `UPDATE individual_ai_drafts
                SET status = 'current', content = $1::jsonb, error_code = NULL, generated_at = clock_timestamp()
              WHERE id = $2 AND status = 'generating'
              RETURNING *`, [JSON.stringify(generated.value), prepared.draft.id]
          );
          if (!updated.rows[0]) throw new DraftRequestError(409, 'Der KI-Entwurfsstatus hat sich geändert.');
          return updated.rows[0];
        });
        return res.status(200).json({ draft: current });
      } catch (error) {
        await runTransaction(client => client.query(
          `UPDATE individual_ai_drafts
              SET status = 'failed', content = NULL, error_code = $1
            WHERE id = $2 AND status = 'generating'`,
          [String(error?.code || 'AI_FAILED').slice(0, 120), prepared.draft.id]
        ));
        throw error;
      }
    } catch (error) {
      if (error instanceof DraftRequestError || error instanceof TypeError) {
        return res.status(error.status || 400).json({ error: error.message });
      }
      return safeError('individual-ai-drafts', error, res, 'KI-Entwurf konnte nicht verarbeitet werden.');
    }
  };
}

export default createIndividualAIDraftHandler();
