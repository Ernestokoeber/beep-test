import { transaction } from '../_lib/db.js';
import { isIndividualPlayer, requireMembership } from '../_lib/auth.js';
import { findIndividualProfile } from '../_lib/individual-access.js';
import { mutationId, validateAttendanceStatus, validateReadiness, validateWeeklyFeedback, uuid } from '../_lib/individual-training.js';
import { method, noStore, safeError } from '../_lib/http.js';

function isoDate(value) {
  const normalized = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || !Number.isFinite(Date.parse(`${normalized}T12:00:00Z`))) throw new TypeError('Trainingsdatum ist ungültig.');
  return normalized;
}

function deviceTime(value) {
  if (!value) return null;
  if (!Number.isFinite(Date.parse(value))) throw new TypeError('Gerätezeit ist ungültig.');
  return new Date(value).toISOString();
}

function databaseDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || '').slice(0, 10);
}

async function applyMutation(client, auth, profile, mutation) {
  const id = mutationId(mutation?.mutationId);
  const kind = String(mutation?.kind || '');
  const payload = mutation?.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new TypeError('Offline-Eingabe ist ungültig.');
  const existing = await client.query(
    'SELECT mutation_id, applied, failure_code, server_received_at FROM individual_sync_mutations WHERE mutation_id = $1', [id]
  );
  if (existing.rows[0]) return { ...existing.rows[0], duplicate: true };

  const inserted = await client.query(
    `INSERT INTO individual_sync_mutations
      (mutation_id, organization_id, individual_profile_id, entity_type, entity_id, operation, payload, device_recorded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
     RETURNING server_received_at`,
    [id, auth.organization_id, profile.id, kind, uuid(payload.entityId, 'Datensatz-ID'), payload.operation || 'update', JSON.stringify(payload), deviceTime(mutation.deviceRecordedAt)]
  );

  if (kind === 'attendance') {
    const status = validateAttendanceStatus(payload.status);
    if (!['confirmed', 'declined'].includes(status)) throw new TypeError('Spieler dürfen nur zu- oder absagen.');
    const updated = await client.query(
      `UPDATE individual_session_participants
          SET attendance_status = $1, player_decided_at = clock_timestamp()
        WHERE session_id = $2 AND individual_profile_id = $3
        RETURNING session_id`, [status, uuid(payload.entityId, 'Einheiten-ID'), profile.id]
    );
    if (!updated.rows[0]) throw new TypeError('Einheit nicht gefunden.');
    await client.query(
      `UPDATE individual_notifications
          SET stopped_at = CASE WHEN $3 = 'declined' THEN clock_timestamp() ELSE NULL END
        WHERE individual_profile_id = $1
          AND kind = 'attendance'
          AND payload->>'sessionId' = $2
          AND dashboard_visible_at IS NULL`,
      [profile.id, payload.entityId, status]
    );
    const all = await client.query('SELECT attendance_status FROM individual_session_participants WHERE session_id = $1', [payload.entityId]);
    if (all.rows.length && all.rows.every(row => row.attendance_status === 'declined')) {
      await client.query(
        `UPDATE individual_sessions SET status = 'cancelled', cancellation_kind = 'all_players_declined', updated_at = clock_timestamp()
          WHERE id = $1 AND status = 'planned'`, [payload.entityId]
      );
    }
  } else if (kind === 'readiness') {
    const score = validateReadiness(Number(payload.score));
    const participant = await client.query(
      `SELECT 1 FROM individual_session_participants
        WHERE session_id = $1 AND individual_profile_id = $2`,
      [uuid(payload.entityId, 'Einheiten-ID'), profile.id]
    );
    if (!participant.rows[0]) throw new TypeError('Einheit nicht gefunden.');
    await client.query(
      `INSERT INTO individual_readiness
        (individual_profile_id, session_id, score, created_by, device_recorded_at, server_received_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (individual_profile_id, session_id) DO UPDATE
         SET score = EXCLUDED.score, created_by = EXCLUDED.created_by,
             device_recorded_at = EXCLUDED.device_recorded_at,
             server_received_at = EXCLUDED.server_received_at`,
      [profile.id, uuid(payload.entityId, 'Einheiten-ID'), score, auth.sub, deviceTime(mutation.deviceRecordedAt), inserted.rows[0].server_received_at]
    );
  } else if (kind === 'weekly_feedback') {
    const feedback = validateWeeklyFeedback(payload);
    const trainingDay = String(payload.trainingDay || '');
    if (trainingDay !== 'friday') throw new TypeError('Rückmeldungen werden im Pilot nur für das Freitagstraining erfasst.');
    const trainingDate = isoDate(payload.trainingDate);
    const focus = await client.query(
      `SELECT valid_from, valid_until FROM individual_weekly_focus
        WHERE id = $1 AND individual_profile_id = $2`,
      [uuid(payload.focusId, 'Wochenfokus-ID'), profile.id]
    );
    if (!focus.rows[0]) throw new TypeError('Wochenfokus nicht gefunden.');
    if (trainingDate < databaseDate(focus.rows[0].valid_from) || trainingDate > databaseDate(focus.rows[0].valid_until)) {
      throw new TypeError('Trainingsdatum liegt außerhalb des freigegebenen Wochenfokus.');
    }
    if (new Date(`${trainingDate}T12:00:00Z`).getUTCDay() !== 5) throw new TypeError('Trainingstag und Datum stimmen nicht überein.');
    const previous = await client.query(
      `SELECT * FROM individual_weekly_feedback
        WHERE individual_profile_id = $1 AND training_date = $2 FOR UPDATE`,
      [profile.id, trainingDate]
    );
    const saved = await client.query(
      `INSERT INTO individual_weekly_feedback
        (id, individual_profile_id, focus_id, training_day, training_date, occurrence, implementation_score, note, device_recorded_at, server_received_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (individual_profile_id, training_date) DO UPDATE
         SET occurrence = EXCLUDED.occurrence,
             implementation_score = EXCLUDED.implementation_score,
             note = EXCLUDED.note,
             device_recorded_at = EXCLUDED.device_recorded_at,
             server_received_at = EXCLUDED.server_received_at
         WHERE individual_weekly_feedback.server_received_at <= EXCLUDED.server_received_at
       RETURNING *`,
      [uuid(payload.entityId, 'Rückmeldungs-ID'), profile.id, uuid(payload.focusId, 'Wochenfokus-ID'), trainingDay,
        trainingDate, feedback.occurrence, feedback.implementationScore, feedback.note,
        deviceTime(mutation.deviceRecordedAt), inserted.rows[0].server_received_at]
    );
    if (previous.rows[0]) {
      const incoming = {
        individual_profile_id: profile.id, focus_id: payload.focusId, training_day: trainingDay,
        training_date: trainingDate, occurrence: feedback.occurrence,
        implementation_score: feedback.implementationScore, note: feedback.note,
        device_recorded_at: deviceTime(mutation.deviceRecordedAt), server_received_at: inserted.rows[0].server_received_at
      };
      const incomingWon = Boolean(saved.rows[0]);
      await client.query(
        `INSERT INTO individual_audit_log
          (organization_id, individual_profile_id, entity_type, entity_id, field_name, old_value, new_value, change_reason, changed_by, mutation_id)
         VALUES ($1, $2, 'weekly_feedback', $3, 'record', $4::jsonb, $5::jsonb, $6, $7, $8)`,
        [auth.organization_id, profile.id, previous.rows[0].id,
          JSON.stringify(incomingWon ? previous.rows[0] : incoming),
          JSON.stringify(incomingWon ? saved.rows[0] : previous.rows[0]),
          incomingWon ? 'Offline-Änderung nach Server-Eingangszeit übernommen' : 'Offline-Änderung durch neuere Serverfassung verworfen',
          auth.sub, id]
      );
      await client.query(
        `UPDATE individual_ai_drafts SET status = 'stale'
          WHERE individual_profile_id = $1 AND status = 'current'`, [profile.id]
      );
    }
    await client.query(
      `UPDATE individual_notifications
          SET stopped_at = clock_timestamp()
        WHERE individual_profile_id = $1
          AND kind = 'feedback_request'
          AND payload->>'trainingDate' = $2
          AND stopped_at IS NULL`,
      [profile.id, trainingDate]
    );
  } else {
    throw new TypeError('Diese Eingabe ist offline nicht zulässig.');
  }
  await client.query('UPDATE individual_sync_mutations SET applied = TRUE WHERE mutation_id = $1', [id]);
  return { mutation_id: id, applied: true, server_received_at: inserted.rows[0].server_received_at, duplicate: false };
}

export function createIndividualSyncHandler(deps = {}) {
  const membership = deps.requireMembership || requireMembership;
  const runTransaction = deps.transaction || transaction;
  return async function handler(req, res) {
    noStore(res);
    if (!method(req, res, ['POST'])) return;
    try {
      const auth = await membership(req, res);
      if (!auth) return;
      if (!isIndividualPlayer(auth.role)) return res.status(403).json({ error: 'Offline-Eingaben sind nur dem eigenen Spielerprofil zugeordnet.' });
      const mutations = req.body?.mutations;
      if (!Array.isArray(mutations) || mutations.length < 1 || mutations.length > 50) {
        return res.status(400).json({ error: 'Eine bis 50 Offline-Eingaben erforderlich.' });
      }
      const results = await runTransaction(async client => {
        const profile = await findIndividualProfile(auth, null, client.query.bind(client));
        if (!profile) throw new TypeError('Individualprofil nicht gefunden.');
        const applied = [];
        for (let index = 0; index < mutations.length; index++) {
          const savepoint = `individual_mutation_${index}`;
          await client.query(`SAVEPOINT ${savepoint}`);
          try {
            applied.push(await applyMutation(client, auth, profile, mutations[index]));
            await client.query(`RELEASE SAVEPOINT ${savepoint}`);
          } catch (error) {
            await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
            applied.push({ mutation_id: String(mutations[index]?.mutationId || ''), applied: false, error: error.message });
          }
        }
        return applied;
      });
      return res.status(200).json({ results });
    } catch (error) {
      return safeError('individual-sync', error, res, 'Offline-Eingaben konnten nicht synchronisiert werden.');
    }
  };
}

export default createIndividualSyncHandler();
