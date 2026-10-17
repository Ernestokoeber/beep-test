import { transaction } from '../../_lib/db.js';
import QRCode from 'qrcode';
import { isIndividualCoach, isIndividualPlayer, requireMembership } from '../../_lib/auth.js';
import { findIndividualProfile, hashIndividualInviteToken, newIndividualInviteToken, individualInviteUrl } from '../../_lib/individual-access.js';
import { assertTemplateDuration, pilotSessionTemplate } from '../../_lib/individual-pilot.js';
import {
  assertParticipantCapacity,
  optionalText,
  nextOpenPilotMonday,
  text,
  uuid,
  validateAttendanceStatus,
  validateChangeReason,
  validateReadiness,
  validateWeeklyFeedback,
  zonedDateTimeToInstant
} from '../../_lib/individual-training.js';
import { method, noStore, safeError } from '../../_lib/http.js';

class IndividualRequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function isoDate(value, field) {
  const normalized = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || !Number.isFinite(Date.parse(`${normalized}T12:00:00Z`))) {
    throw new TypeError(`${field} ist ungültig.`);
  }
  return normalized;
}

function isoInstant(value, field) {
  const normalized = String(value || '');
  if (!Number.isFinite(Date.parse(normalized))) throw new TypeError(`${field} ist ungültig.`);
  return new Date(normalized).toISOString();
}

function berlinDate(instant) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instant));
}

function berlinTime(instant) {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).format(new Date(instant));
}

function addDays(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function databaseDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || '').slice(0, 10);
}

function assertPilotSessionInstant(value, expectedDate, localTime) {
  const instant = localTime ? zonedDateTimeToInstant(expectedDate, localTime) : isoInstant(value, 'Termin');
  const localDate = berlinDate(instant);
  const weekday = new Date(`${localDate}T12:00:00Z`).getUTCDay();
  if (weekday !== 1) throw new TypeError('Piloteinheiten müssen montags stattfinden.');
  if (localDate < '2026-10-19') throw new TypeError('Der Pilot beginnt am 19. Oktober 2026.');
  if (localDate === '2026-11-02') throw new TypeError('Am 2. November 2026 ist die Halle ferienbedingt geschlossen.');
  if (localDate !== expectedDate) throw new TypeError(`Der nächste offene Pilottermin ist Montag, ${expectedDate}.`);
  if (berlinTime(instant) !== '20:15') throw new TypeError('Die Montagseinheiten beginnen verbindlich um 20:15 Uhr.');
  return instant;
}

async function accessibleProfile(client, auth, profileId, coachOnly = false) {
  if (coachOnly && !isIndividualCoach(auth.role)) throw new IndividualRequestError(403, 'Diese Funktion ist nur für den zugeordneten Coach verfügbar.');
  const profile = await findIndividualProfile(auth, profileId, client.query.bind(client));
  if (!profile) throw new IndividualRequestError(404, 'Individualprofil nicht gefunden.');
  return profile;
}

async function assertSessionForProfile(client, profile, sessionId) {
  const id = uuid(sessionId, 'Einheiten-ID');
  const result = await client.query(
    `SELECT s.*
       FROM individual_sessions s
       JOIN individual_session_participants sp ON sp.session_id = s.id
      WHERE s.id = $1 AND s.organization_id = $2 AND sp.individual_profile_id = $3
      FOR UPDATE`,
    [id, profile.organization_id, profile.id]
  );
  if (!result.rows[0]) throw new IndividualRequestError(404, 'Einheit nicht gefunden.');
  return result.rows[0];
}

async function insertPlan(client, sessionId, profileId, template, createdBy) {
  const plan = await client.query(
    `INSERT INTO individual_session_plans (session_id, individual_profile_id, title, objective, version, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [sessionId, profileId, template.title, template.objective, template.version || 1, createdBy]
  );
  for (let index = 0; index < template.exercises.length; index += 1) {
    const exercise = template.exercises[index];
    await client.query(
      `INSERT INTO individual_exercises
        (plan_id, position, title, duration_minutes, repetitions, measurement_method, coaching_cues)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)`,
      [plan.rows[0].id, index + 1, exercise.title, exercise.durationMinutes,
        JSON.stringify(exercise.repetitions), JSON.stringify(exercise.measurementMethod), JSON.stringify(exercise.coachingCues)]
    );
  }
  return plan.rows[0];
}

async function insertPilotTemplate(client, session, profiles, createdBy) {
  const template = pilotSessionTemplate(session.unit_number);
  if (!template) return null;
  assertTemplateDuration(template);
  const plans = [];
  for (const profile of profiles) {
    const plan = await insertPlan(client, session.id, profile.id, template, createdBy);
    plans.push({ ...plan, template_key: template.templateKey, template_version: template.version });
  }
  return plans;
}

async function addSessionParticipantRecord(client, session, profile) {
  await client.query(
    `INSERT INTO individual_session_participants (session_id, individual_profile_id)
     VALUES ($1, $2)
     ON CONFLICT (session_id, individual_profile_id) DO NOTHING`,
    [session.id, profile.id]
  );
}

async function addSessionNotification(client, session, profile) {
  await client.query(
    `INSERT INTO individual_notifications
      (individual_profile_id, notification_key, kind, due_at, payload)
     VALUES ($1::uuid, $1::text || ':attendance:' || ($3::timestamptz - interval '2 hours')::text,
             'attendance', $3::timestamptz - interval '2 hours',
             jsonb_build_object('sessionId', $2::text, 'scheduledFor', $3::text))
     ON CONFLICT (individual_profile_id, notification_key) DO NOTHING`,
    [profile.id, session.id, session.scheduled_for]
  );
}

async function addSessionParticipant(client, session, profile) {
  await addSessionParticipantRecord(client, session, profile);
  await addSessionNotification(client, session, profile);
}

async function ensurePilotStartCore(client, auth) {
  await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [auth.sub]);
  const profileResult = await client.query(
    `SELECT * FROM individual_profiles
      WHERE organization_id = $1
        AND active = TRUE
        AND ($2 = 'admin' OR coach_user_id = $3)
      ORDER BY created_at ASC`,
    [auth.organization_id, auth.role, auth.sub]
  );
  const profiles = profileResult.rows;
  if (!profiles.length) throw new IndividualRequestError(409, 'Zuerst muss mindestens ein Pilotspieler angelegt werden.');
  assertParticipantCapacity(profiles.map(profile => profile.id));

  const existing = await client.query(
    `SELECT * FROM individual_sessions
      WHERE organization_id = $1 AND coach_user_id = $2 AND unit_number = 1 AND status <> 'cancelled'
      ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
    [auth.organization_id, auth.sub]
  );
  let session = existing.rows[0] || null;
  if (!session) {
    const scheduledFor = zonedDateTimeToInstant('2026-10-19', '20:15:00');
    const created = await client.query(
      `INSERT INTO individual_sessions
        (organization_id, coach_user_id, scheduled_for, duration_minutes, unit_number)
       VALUES ($1, $2, $3, 105, 1)
       RETURNING *`,
      [auth.organization_id, auth.sub, scheduledFor]
    );
    session = created.rows[0];
  }

  for (const profile of profiles) {
    await addSessionParticipantRecord(client, session, profile);
  }
  return { session, profiles, profileIds: profiles.map(profile => profile.id) };
}

async function ensurePilotStartExtras(client, auth, ensured) {
  for (const profile of ensured.profiles) {
    await addSessionNotification(client, ensured.session, profile);
    const plan = await client.query(
      `SELECT id FROM individual_session_plans
        WHERE session_id = $1 AND individual_profile_id = $2`,
      [ensured.session.id, profile.id]
    );
    if (!plan.rows[0]) await insertPilotTemplate(client, ensured.session, [profile], auth.sub);
  }
}

async function insertApprovedDraftPlans(client, session, profiles, createdBy) {
  const plans = [];
  for (const profile of profiles) {
    const approved = await client.query(
      `SELECT content FROM individual_ai_drafts
        WHERE individual_profile_id = $1 AND status = 'approved' AND content IS NOT NULL
        ORDER BY approved_at DESC LIMIT 1`, [profile.id]
    );
    const nextSession = approved.rows[0]?.content?.nextSession;
    if (!nextSession || !Array.isArray(nextSession.blocks)) continue;
    const template = {
      title: nextSession.title,
      objective: nextSession.objective,
      version: 1,
      exercises: nextSession.blocks.map(block => ({
        title: block.title, durationMinutes: block.minutes,
        repetitions: { instruction: block.repetitions },
        measurementMethod: { instruction: block.measurementMethod },
        coachingCues: block.coachingCues
      }))
    };
    assertTemplateDuration(template);
    plans.push(await insertPlan(client, session.id, profile.id, template, createdBy));
  }
  return plans;
}

export function createIndividualManageHandler(deps = {}) {
  const runTransaction = deps.transaction || transaction;
  const membership = deps.requireMembership || requireMembership;
  const now = deps.now || (() => new Date());

  return async function handler(req, res) {
    noStore(res);
    if (!method(req, res, ['POST'])) return;
    const action = String(req.body?.action || '');
    try {
      const auth = await membership(req, res);
      if (!auth) return;
      if (!isIndividualCoach(auth.role) && !isIndividualPlayer(auth.role)) {
        return res.status(403).json({ error: 'Kein Zugriff auf Individual Training.' });
      }

      if (action === 'ensurePilotStart') {
        if (!isIndividualCoach(auth.role)) throw new IndividualRequestError(403, 'Nur Coaches dürfen den Pilotstart planen.');
        const ensured = await runTransaction(client => ensurePilotStartCore(client, auth));
        let detailsComplete = true;
        try {
          await runTransaction(client => ensurePilotStartExtras(client, auth, ensured));
        } catch (error) {
          detailsComplete = false;
          console.error('[individual-pilot-details]', error);
        }
        return res.status(200).json({
          session: ensured.session,
          profileIds: ensured.profileIds,
          ensured: true,
          detailsComplete
        });
      }

      const result = await runTransaction(async client => {
        if (action === 'createProfile') {
          if (!isIndividualCoach(auth.role)) throw new IndividualRequestError(403, 'Nur Coaches dürfen Individualprofile anlegen.');
          const playerProfileId = text(req.body.playerProfileId, 'Spielerprofil-ID', { min: 1, max: 120 });
          const workspace = await client.query('SELECT data FROM workspaces WHERE organization_id = $1 FOR SHARE', [auth.organization_id]);
          const players = workspace.rows[0]?.data?.players || [];
          if (!players.some(player => player?.id === playerProfileId)) throw new IndividualRequestError(404, 'Bestehendes Spielerprofil nicht gefunden.');
          const created = await client.query(
            `INSERT INTO individual_profiles (organization_id, player_profile_id, coach_user_id, pilot_started_on)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [auth.organization_id, playerProfileId, auth.sub, req.body.pilotStartedOn ? isoDate(req.body.pilotStartedOn, 'Pilotstart') : null]
          );
          return { status: 201, body: { profile: created.rows[0] } };
        }

        if (action === 'createInvite') {
          // Share the registration lock so issuing and claiming cannot leave two active codes.
          await client.query("SELECT pg_advisory_xact_lock(hashtext('beep-test-registration'))");
          const profile = await accessibleProfile(client, auth, req.body.profileId, true);
          if (profile.user_id) throw new IndividualRequestError(409, 'Dieser Spieler hat bereits ein zugeordnetes Konto. Er kann sich mit seinem bestehenden Konto anmelden.');
          const hours = Number(req.body.expiresInHours ?? 72);
          if (!Number.isInteger(hours) || hours < 1 || hours > 168) throw new TypeError('Einladungsdauer muss zwischen 1 und 168 Stunden liegen.');
          const rawToken = newIndividualInviteToken();
          await client.query(
            `UPDATE individual_invites SET revoked_at = clock_timestamp()
              WHERE individual_profile_id = $1 AND used_at IS NULL AND revoked_at IS NULL`, [profile.id]
          );
          const created = await client.query(
            `INSERT INTO individual_invites
              (organization_id, individual_profile_id, token_hash, created_by, expires_at)
             VALUES ($1, $2, $3, $4, clock_timestamp() + ($5 * interval '1 hour'))
             RETURNING id, expires_at`,
            [auth.organization_id, profile.id, hashIndividualInviteToken(rawToken), auth.sub, hours]
          );
          const inviteUrl = individualInviteUrl(rawToken);
          const qrDataUrl = await QRCode.toDataURL(inviteUrl, { width: 320, margin: 4, errorCorrectionLevel: 'M' });
          return { status: 201, body: { token: rawToken, inviteUrl, qrDataUrl, invite: created.rows[0] } };
        }

        if (action === 'createSession') {
          if (!isIndividualCoach(auth.role)) throw new IndividualRequestError(403, 'Nur Coaches dürfen Einheiten planen.');
          const participantIds = assertParticipantCapacity(req.body.profileIds).map(id => uuid(id, 'Individualprofil-ID'));
          const profiles = [];
          for (const profileId of participantIds) profiles.push(await accessibleProfile(client, auth, profileId, true));
          const completed = await client.query(
            `SELECT count(*)::int AS count FROM individual_sessions
              WHERE organization_id = $1 AND coach_user_id = $2 AND status = 'completed'`,
            [auth.organization_id, auth.sub]
          );
          if (Number(completed.rows[0].count) >= 8) throw new IndividualRequestError(409, 'Der Pilot mit acht durchgeführten Einheiten ist bereits abgeschlossen.');
          const unitNumber = Number(completed.rows[0].count) + 1;
          const latest = await client.query(
            `SELECT max((scheduled_for AT TIME ZONE 'Europe/Berlin')::date)::text AS date
               FROM individual_sessions
              WHERE organization_id = $1 AND coach_user_id = $2`,
            [auth.organization_id, auth.sub]
          );
          const expectedDate = nextOpenPilotMonday(latest.rows[0]?.date || null);
          const requestedDate = req.body.scheduledDate ? isoDate(req.body.scheduledDate, 'Termin') : berlinDate(isoInstant(req.body.scheduledFor, 'Termin'));
          const requestedTime = String(req.body.scheduledTime || '');
          if (req.body.scheduledTime && !/^\d{2}:\d{2}$/.test(requestedTime)) throw new TypeError('Startzeit ist ungültig.');
          if (requestedTime && requestedTime !== '20:15') throw new TypeError('Die Montagseinheiten beginnen verbindlich um 20:15 Uhr.');
          if (requestedDate !== expectedDate) throw new TypeError(`Der nächste offene Pilottermin ist Montag, ${expectedDate}.`);
          const durationMinutes = Number(req.body.durationMinutes ?? 105);
          if (durationMinutes !== 105) throw new TypeError('Eine Piloteinheit dauert verbindlich 105 Minuten.');
          const created = await client.query(
            `INSERT INTO individual_sessions
              (organization_id, coach_user_id, scheduled_for, duration_minutes, unit_number)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [auth.organization_id, auth.sub, assertPilotSessionInstant(req.body.scheduledFor, expectedDate, req.body.scheduledTime ? `${requestedTime}:00` : null), durationMinutes, unitNumber]
          );
          for (const profile of profiles) await addSessionParticipant(client, created.rows[0], profile);
          const fixedPlans = await insertPilotTemplate(client, created.rows[0], profiles, auth.sub);
          const plans = fixedPlans || await insertApprovedDraftPlans(client, created.rows[0], profiles, auth.sub);
          return { status: 201, body: { session: created.rows[0], profileIds: profiles.map(profile => profile.id), plans } };
        }

        if (action === 'setAttendance') {
          const profile = await accessibleProfile(client, auth, req.body.profileId);
          const session = await assertSessionForProfile(client, profile, req.body.sessionId);
          const status = validateAttendanceStatus(req.body.status);
          const allowed = isIndividualPlayer(auth.role)
            ? new Set(['confirmed', 'declined'])
            : new Set(['confirmed', 'declined', 'attended', 'unexcused_no_show']);
          if (!allowed.has(status)) throw new IndividualRequestError(403, 'Dieser Teilnahmestatus darf nicht gesetzt werden.');
          const changed = await client.query(
            `UPDATE individual_session_participants
                SET attendance_status = $1,
                    player_decided_at = CASE WHEN $2 THEN clock_timestamp() ELSE player_decided_at END,
                    coach_confirmed_at = CASE WHEN $2 THEN coach_confirmed_at ELSE clock_timestamp() END
              WHERE session_id = $3 AND individual_profile_id = $4
              RETURNING *`,
            [status, isIndividualPlayer(auth.role), session.id, profile.id]
          );
          await client.query(
            `UPDATE individual_notifications
                SET stopped_at = CASE WHEN $3 = 'declined' THEN clock_timestamp() ELSE NULL END
              WHERE individual_profile_id = $1
                AND kind = 'attendance'
                AND payload->>'sessionId' = $2
                AND dashboard_visible_at IS NULL`,
            [profile.id, session.id, status]
          );
          const attendance = await client.query(
            'SELECT attendance_status FROM individual_session_participants WHERE session_id = $1', [session.id]
          );
          if (attendance.rows.length > 0 && attendance.rows.every(row => row.attendance_status === 'declined')) {
            await client.query(
              `UPDATE individual_sessions
                  SET status = 'cancelled', cancellation_kind = 'all_players_declined', updated_at = clock_timestamp()
                WHERE id = $1 AND status = 'planned'`, [session.id]
            );
          } else {
            await client.query(
              `UPDATE individual_sessions
                  SET status = 'planned', cancellation_kind = NULL, updated_at = clock_timestamp()
                WHERE id = $1 AND status = 'cancelled' AND cancellation_kind = 'all_players_declined'`, [session.id]
            );
          }
          return { status: 200, body: { attendance: changed.rows[0] } };
        }

        if (action === 'completeSession') {
          const profile = await accessibleProfile(client, auth, req.body.profileId, true);
          const session = await assertSessionForProfile(client, profile, req.body.sessionId);
          const attended = await client.query(
            `SELECT count(*)::int AS count FROM individual_session_participants
              WHERE session_id = $1 AND attendance_status = 'attended'`, [session.id]
          );
          if (attended.rows[0].count < 1) throw new IndividualRequestError(409, 'Mindestens ein Teilnehmer muss als anwesend bestätigt sein.');
          const completed = await client.query(
            `UPDATE individual_sessions
                SET status = 'completed', completed_at = clock_timestamp(), cancellation_kind = NULL, updated_at = clock_timestamp()
              WHERE id = $1 AND status IN ('planned', 'in_progress')
              RETURNING *`, [session.id]
          );
          if (!completed.rows[0]) throw new IndividualRequestError(409, 'Die Einheit kann in diesem Status nicht abgeschlossen werden.');
          const participants = await client.query(
            `SELECT sp.individual_profile_id
               FROM individual_session_participants sp
              WHERE sp.session_id = $1 AND sp.attendance_status = 'attended'`, [session.id]
          );
          const queuedDrafts = [];
          for (const participant of participants.rows) {
            const pending = await client.query(
              `SELECT count(*)::int AS count FROM individual_sync_mutations
                WHERE individual_profile_id = $1 AND applied = FALSE`, [participant.individual_profile_id]
            );
            if (Number(pending.rows[0].count) > 0) continue;
            const queued = await client.query(
              `INSERT INTO individual_ai_drafts
                (individual_profile_id, session_id, version, status, source_revision, requested_by)
               VALUES ($1, $2, 1, 'queued', $3, $4)
               ON CONFLICT (individual_profile_id, session_id, version) DO NOTHING
               RETURNING *`,
              [participant.individual_profile_id, session.id, `pending:${session.id}`, auth.sub]
            );
            if (queued.rows[0]) queuedDrafts.push(queued.rows[0]);
          }
          return { status: 200, body: { session: completed.rows[0], queuedDrafts } };
        }

        if (action === 'cancelSession') {
          const profile = await accessibleProfile(client, auth, req.body.profileId, true);
          const session = await assertSessionForProfile(client, profile, req.body.sessionId);
          const cancelled = await client.query(
            `UPDATE individual_sessions
                SET status = 'cancelled', cancellation_kind = 'coach_cancelled', updated_at = clock_timestamp()
              WHERE id = $1 AND status IN ('planned', 'in_progress')
              RETURNING *`, [session.id]
          );
          if (!cancelled.rows[0]) throw new IndividualRequestError(409, 'Die Einheit kann in diesem Status nicht abgesagt werden.');
          await client.query(
            `UPDATE individual_notifications SET stopped_at = clock_timestamp()
              WHERE kind = 'attendance' AND payload->>'sessionId' = $1 AND stopped_at IS NULL`, [session.id]
          );
          await client.query(
            `UPDATE individual_notifications n SET stopped_at = clock_timestamp()
              FROM individual_weekly_focus f
             WHERE f.source_session_id = $1
               AND n.individual_profile_id = f.individual_profile_id
               AND n.stopped_at IS NULL`, [session.id]
          );
          return { status: 200, body: { session: cancelled.rows[0] } };
        }

        if (action === 'setReadiness') {
          const profile = await accessibleProfile(client, auth, req.body.profileId);
          const session = await assertSessionForProfile(client, profile, req.body.sessionId);
          const score = validateReadiness(Number(req.body.score));
          const recorded = await client.query(
            `INSERT INTO individual_readiness
              (individual_profile_id, session_id, score, created_by, device_recorded_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (individual_profile_id, session_id) DO UPDATE
               SET score = EXCLUDED.score,
                   created_by = EXCLUDED.created_by,
                   device_recorded_at = EXCLUDED.device_recorded_at,
                   server_received_at = clock_timestamp()
             RETURNING *`,
            [profile.id, session.id, score, auth.sub, req.body.deviceRecordedAt ? isoInstant(req.body.deviceRecordedAt, 'Gerätezeit') : null]
          );
          return { status: 200, body: { readiness: recorded.rows[0], conversationSuggested: score <= 4 } };
        }

        if (action === 'setWeeklyFeedback') {
          const profile = await accessibleProfile(client, auth, req.body.profileId);
          const feedback = validateWeeklyFeedback(req.body);
          const focusId = uuid(req.body.focusId, 'Wochenfokus-ID');
          const focus = await client.query(
            'SELECT valid_from::text, valid_until::text FROM individual_weekly_focus WHERE id = $1 AND individual_profile_id = $2', [focusId, profile.id]
          );
          if (!focus.rows[0]) throw new IndividualRequestError(404, 'Wochenfokus nicht gefunden.');
          const trainingDay = String(req.body.trainingDay || '');
          if (trainingDay !== 'friday') throw new TypeError('Rückmeldungen werden im Pilot nur für das Freitagstraining erfasst.');
          const trainingDate = isoDate(req.body.trainingDate, 'Trainingsdatum');
          if (trainingDate < databaseDate(focus.rows[0].valid_from) || trainingDate > databaseDate(focus.rows[0].valid_until)) {
            throw new TypeError('Trainingsdatum liegt außerhalb des freigegebenen Wochenfokus.');
          }
          if (new Date(`${trainingDate}T12:00:00Z`).getUTCDay() !== 5) throw new TypeError('Trainingstag und Datum stimmen nicht überein.');
          const previous = await client.query(
            `SELECT * FROM individual_weekly_feedback
              WHERE individual_profile_id = $1 AND training_date = $2 FOR UPDATE`,
            [profile.id, isoDate(req.body.trainingDate, 'Trainingsdatum')]
          );
          const saved = await client.query(
            `INSERT INTO individual_weekly_feedback
              (individual_profile_id, focus_id, training_day, training_date, occurrence, implementation_score, note, device_recorded_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (individual_profile_id, training_date) DO UPDATE
               SET occurrence = EXCLUDED.occurrence,
                   implementation_score = EXCLUDED.implementation_score,
                   note = EXCLUDED.note,
                   device_recorded_at = EXCLUDED.device_recorded_at,
                   server_received_at = clock_timestamp()
             RETURNING *, training_date::text AS training_date`,
            [profile.id, focusId, trainingDay, trainingDate, feedback.occurrence,
              feedback.implementationScore, feedback.note, req.body.deviceRecordedAt ? isoInstant(req.body.deviceRecordedAt, 'Gerätezeit') : null]
          );
          await client.query(
            `UPDATE individual_notifications
                SET stopped_at = clock_timestamp()
              WHERE individual_profile_id = $1
                AND kind = 'feedback_request'
                AND payload->>'trainingDate' = $2
                AND stopped_at IS NULL`,
            [profile.id, trainingDate]
          );
          if (previous.rows[0]) {
            await client.query(
              `UPDATE individual_ai_drafts SET status = 'stale'
                WHERE individual_profile_id = $1 AND status = 'current'`, [profile.id]
            );
          }
          return { status: 200, body: { feedback: saved.rows[0], affectedDraftsMarkedStale: Boolean(previous.rows[0]) } };
        }

        if (action === 'setFocus') {
          const profile = await accessibleProfile(client, auth, req.body.profileId, true);
          const session = await assertSessionForProfile(client, profile, req.body.sessionId);
          const sessionDate = berlinDate(session.scheduled_for);
          const validFrom = isoDate(req.body.validFrom, 'Startdatum');
          const validUntil = isoDate(req.body.validUntil, 'Enddatum');
          if (validFrom !== addDays(sessionDate, 1) || validUntil !== addDays(sessionDate, 6)) {
            throw new TypeError('Der Wochenfokus gilt verbindlich von Dienstag bis Sonntag nach der Montagseinheit.');
          }
          const saved = await client.query(
            `INSERT INTO individual_weekly_focus
              (individual_profile_id, source_session_id, title, cue_one, cue_two, success_indicator, valid_from, valid_until, released_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *, valid_from::text AS valid_from, valid_until::text AS valid_until`,
            [profile.id, session.id, text(req.body.title, 'Wochenfokus', { min: 2, max: 120 }),
              text(req.body.cueOne, 'Erster Hinweis', { min: 2, max: 240 }),
              optionalText(req.body.cueTwo, 'Zweiter Hinweis', { min: 2, max: 240 }),
              text(req.body.successIndicator, 'Erkennungsmerkmal', { min: 2, max: 300 }),
              validFrom, validUntil, auth.sub]
          );
          await client.query(
            `WITH friday AS (
               SELECT day::date AS training_date, 'friday'::text AS training_day
                 FROM generate_series($3::date, $4::date, interval '1 day') day
                WHERE extract(isodow FROM day) = 5
             ), reminders AS (
               SELECT training_date, training_day, 'focus'::text AS kind,
                      (training_date + time '18:15') AT TIME ZONE 'Europe/Berlin' AS due_at
                 FROM friday
               UNION ALL
               SELECT training_date, training_day, 'feedback_request',
                      (training_date + 1 + time '12:00') AT TIME ZONE 'Europe/Berlin'
                 FROM friday
             )
             INSERT INTO individual_notifications
               (individual_profile_id, notification_key, kind, due_at, payload)
             SELECT $1::uuid,
                    $1::text || ':' || kind || ':' || due_at::text,
                    kind,
                    due_at,
                    jsonb_build_object(
                      'focusId', $2::text, 'trainingDate', training_date::text, 'trainingDay', training_day,
                      'title', $5::text, 'cueOne', $6::text, 'cueTwo', $7::text
                    )
               FROM reminders
             ON CONFLICT (individual_profile_id, notification_key) DO NOTHING`,
            [profile.id, saved.rows[0].id, saved.rows[0].valid_from, saved.rows[0].valid_until,
              saved.rows[0].title, saved.rows[0].cue_one, saved.rows[0].cue_two]
          );
          return { status: 201, body: { focus: saved.rows[0] } };
        }

        if (action === 'saveMeasurement') {
          const profile = await accessibleProfile(client, auth, req.body.profileId, true);
          const session = await assertSessionForProfile(client, profile, req.body.sessionId);
          const measurementId = req.body.measurementId ? uuid(req.body.measurementId, 'Messwert-ID') : null;
          const metricKey = text(req.body.metricKey, 'Messwertschlüssel', { min: 2, max: 120 });
          const numeric = req.body.numericValue === undefined || req.body.numericValue === null ? null : Number(req.body.numericValue);
          const textual = numeric === null ? text(req.body.textValue, 'Messwert', { min: 1, max: 500 }) : null;
          if (numeric !== null && !Number.isFinite(numeric)) throw new TypeError('Numerischer Messwert ist ungültig.');
          if (!measurementId) {
            const created = await client.query(
              `INSERT INTO individual_measurements
                (organization_id, individual_profile_id, session_id, exercise_id, metric_key, numeric_value, text_value, unit, attempt, device_recorded_at, created_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               RETURNING *`,
              [auth.organization_id, profile.id, session.id, req.body.exerciseId ? uuid(req.body.exerciseId, 'Übungs-ID') : null,
                metricKey, numeric, textual, optionalText(req.body.unit, 'Einheit', { min: 1, max: 40 }),
                req.body.attempt || null, req.body.deviceRecordedAt ? isoInstant(req.body.deviceRecordedAt, 'Gerätezeit') : null, auth.sub]
            );
            return { status: 201, body: { measurement: created.rows[0] } };
          }
          const reason = validateChangeReason(req.body.changeReason);
          const previous = await client.query(
            `SELECT * FROM individual_measurements
              WHERE id = $1 AND individual_profile_id = $2 AND session_id = $3 FOR UPDATE`,
            [measurementId, profile.id, session.id]
          );
          if (!previous.rows[0]) throw new IndividualRequestError(404, 'Messwert nicht gefunden.');
          const updated = await client.query(
            `UPDATE individual_measurements
                SET metric_key = $1, numeric_value = $2, text_value = $3, unit = $4, attempt = $5,
                    device_recorded_at = $6, server_received_at = clock_timestamp(), updated_at = clock_timestamp()
              WHERE id = $7 RETURNING *`,
            [metricKey, numeric, textual, optionalText(req.body.unit, 'Einheit', { min: 1, max: 40 }), req.body.attempt || null,
              req.body.deviceRecordedAt ? isoInstant(req.body.deviceRecordedAt, 'Gerätezeit') : null, measurementId]
          );
          await client.query(
            `INSERT INTO individual_audit_log
              (organization_id, individual_profile_id, entity_type, entity_id, field_name, old_value, new_value, change_reason, changed_by)
             VALUES ($1, $2, 'measurement', $3, 'record', $4::jsonb, $5::jsonb, $6, $7)`,
            [auth.organization_id, profile.id, measurementId, JSON.stringify(previous.rows[0]), JSON.stringify(updated.rows[0]), reason, auth.sub]
          );
          await client.query(
            `UPDATE individual_ai_drafts SET status = 'stale'
              WHERE individual_profile_id = $1 AND session_id = $2 AND status = 'current'`, [profile.id, session.id]
          );
          return { status: 200, body: { measurement: updated.rows[0], affectedDraftsMarkedStale: true } };
        }

        if (action === 'saveReleasedFeedback') {
          const profile = await accessibleProfile(client, auth, req.body.profileId, true);
          if (req.body.shareWithPlayer !== true) throw new IndividualRequestError(403, 'Bitte die Notiz ausdrücklich als „Für Spieler freigeben“ kennzeichnen.');
          const content = text(req.body.content, 'Feedback', { min: 2, max: 5000 });
          const feedbackId = req.body.feedbackId ? uuid(req.body.feedbackId, 'Feedback-ID') : null;
          if (!feedbackId) {
            const created = await client.query(
              `INSERT INTO individual_released_feedback
                (individual_profile_id, session_id, content, released_by)
               VALUES ($1, $2, $3, $4) RETURNING *`,
              [profile.id, req.body.sessionId ? uuid(req.body.sessionId, 'Einheiten-ID') : null, content, auth.sub]
            );
            return { status: 201, body: { feedback: created.rows[0] } };
          }
          const reason = validateChangeReason(req.body.changeReason);
          const previous = await client.query(
            'SELECT * FROM individual_released_feedback WHERE id = $1 AND individual_profile_id = $2 FOR UPDATE',
            [feedbackId, profile.id]
          );
          if (!previous.rows[0]) throw new IndividualRequestError(404, 'Freigegebenes Feedback nicht gefunden.');
          const updated = await client.query(
            `UPDATE individual_released_feedback SET content = $1, updated_at = clock_timestamp()
              WHERE id = $2 RETURNING *`, [content, feedbackId]
          );
          await client.query(
            `INSERT INTO individual_audit_log
              (organization_id, individual_profile_id, entity_type, entity_id, field_name, old_value, new_value, change_reason, changed_by)
             VALUES ($1, $2, 'released_feedback', $3, 'content', to_jsonb($4::text), to_jsonb($5::text), $6, $7)`,
            [auth.organization_id, profile.id, feedbackId, previous.rows[0].content, content, reason, auth.sub]
          );
          return { status: 200, body: { feedback: updated.rows[0] } };
        }

        if (action === 'addCoachNote') {
          const profile = await accessibleProfile(client, auth, req.body.profileId, true);
          const created = await client.query(
            `INSERT INTO individual_coach_notes (individual_profile_id, session_id, note, created_by)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [profile.id, req.body.sessionId ? uuid(req.body.sessionId, 'Einheiten-ID') : null,
              text(req.body.note, 'Coach-Notiz', { min: 2, max: 5000 }), auth.sub]
          );
          return { status: 201, body: { note: created.rows[0] } };
        }

        throw new IndividualRequestError(400, 'Unbekannte Individual-Training-Aktion.');
      });
      return res.status(result.status).json(result.body);
    } catch (error) {
      if (error instanceof IndividualRequestError || error instanceof TypeError || error instanceof RangeError) {
        return res.status(error.status || 400).json({ error: error.message });
      }
      if (error?.code === '23505') return res.status(409).json({ error: 'Der Datensatz existiert bereits.' });
      if (error?.code === '23514') return res.status(409).json({ error: error.message });
      return safeError('individual-manage', error, res, 'Individual Training konnte nicht gespeichert werden.');
    }
  };
}

export default createIndividualManageHandler();
