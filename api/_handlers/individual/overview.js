import { query } from '../../_lib/db.js';
import { isIndividualCoach, isIndividualPlayer, requireMembership } from '../../_lib/auth.js';
import { findIndividualProfile } from '../../_lib/individual-access.js';
import { method, noStore, safeError } from '../../_lib/http.js';
import { pilotRoadmap } from '../../_lib/individual-pilot.js';
import { individualPlayerData } from '../../_lib/individual-player-data.js';
import {buildShootingComparison,loadTeamShootingRows} from '../../_lib/individual-shooting.js';

export function createIndividualOverviewHandler(deps = {}) {
  const execute = deps.query || query;
  const membership = deps.requireMembership || requireMembership;
  return async function handler(req, res) {
    noStore(res);
    if (!method(req, res, ['GET'])) return;
    try {
      const auth = await membership(req, res);
      if (!auth) return;
      if (!isIndividualCoach(auth.role) && !isIndividualPlayer(auth.role)) {
        return res.status(403).json({ error: 'Kein Zugriff auf Individual Training.' });
      }

      let profiles;
      if (isIndividualPlayer(auth.role)) {
        const profile = await findIndividualProfile(auth, null, execute);
        if (!profile) return res.status(404).json({ error: 'Individualprofil nicht gefunden.' });
        profiles = [profile];
      } else if (req.query?.profileId) {
        const profile = await findIndividualProfile(auth, req.query.profileId, execute);
        if (!profile) return res.status(404).json({ error: 'Individualprofil nicht gefunden.' });
        profiles = [profile];
      } else {
        const result = await execute(
          `SELECT ip.*, u.display_name AS account_name,
                  (SELECT count(*)::int FROM individual_sync_mutations sm
                    WHERE sm.individual_profile_id = ip.id AND sm.applied = FALSE) AS pending_sync_count
             FROM individual_profiles ip
             LEFT JOIN users u ON u.id = ip.user_id
            WHERE ip.organization_id = $1
              AND ip.active = TRUE
              AND ($2 = 'admin' OR ip.coach_user_id = $3)
            ORDER BY ip.created_at ASC`,
          [auth.organization_id, auth.role, auth.sub]
        );
        profiles = result.rows;
      }
      const profileIds = profiles.map(profile => profile.id);
      if (profileIds.length === 0) return res.status(200).json({ role: auth.role, profiles: [], pilotRoadmap: pilotRoadmap(), sessions: [], plans: [], exercises: [], measurements: [], readiness: [], focuses: [], feedback: [], releasedFeedback: [], notifications: [] });

      const [sessions, plans, exercises, measurements, readiness, focuses, feedback, releasedFeedback, notifications, teamShooting] = await Promise.all([
        execute(
          `SELECT s.*, sp.individual_profile_id, sp.attendance_status
             FROM individual_sessions s
             JOIN individual_session_participants sp ON sp.session_id = s.id
            WHERE sp.individual_profile_id = ANY($1::uuid[])
            ORDER BY s.scheduled_for ASC`, [profileIds]
        ),
        execute(
          `SELECT p.*
             FROM individual_session_plans p
            WHERE p.individual_profile_id = ANY($1::uuid[])
            ORDER BY p.created_at ASC`, [profileIds]
        ),
        execute(
          `SELECT e.*, p.session_id, p.individual_profile_id
             FROM individual_exercises e
             JOIN individual_session_plans p ON p.id = e.plan_id
            WHERE p.individual_profile_id = ANY($1::uuid[])
            ORDER BY p.created_at ASC, e.position ASC`, [profileIds]
        ),
        execute(
          `SELECT * FROM individual_measurements
            WHERE individual_profile_id = ANY($1::uuid[])
            ORDER BY server_received_at ASC`, [profileIds]
        ),
        execute(
          `SELECT * FROM individual_readiness
            WHERE individual_profile_id = ANY($1::uuid[])
            ORDER BY server_received_at DESC`, [profileIds]
        ),
        execute(
          `SELECT *, valid_from::text AS valid_from, valid_until::text AS valid_until FROM individual_weekly_focus
            WHERE individual_profile_id = ANY($1::uuid[])
            ORDER BY individual_weekly_focus.valid_from DESC`, [profileIds]
        ),
        execute(
          `SELECT *, training_date::text AS training_date FROM individual_weekly_feedback
            WHERE individual_profile_id = ANY($1::uuid[])
            ORDER BY individual_weekly_feedback.training_date DESC`, [profileIds]
        ),
        execute(
          `SELECT * FROM individual_released_feedback
            WHERE individual_profile_id = ANY($1::uuid[])
            ORDER BY released_at DESC`, [profileIds]
        ),
        execute(
          `SELECT * FROM individual_notifications
            WHERE individual_profile_id = ANY($1::uuid[])
              AND stopped_at IS NULL
              AND due_at <= clock_timestamp()
            ORDER BY due_at ASC`, [profileIds]
        ),
        loadTeamShootingRows(execute,auth.organization_id,profiles)
      ]);

      const payload = {
        role: auth.role,
        profiles,
        pilotRoadmap: pilotRoadmap(),
        sessions: sessions.rows,
        plans: plans.rows,
        exercises: exercises.rows,
        measurements: measurements.rows,
        readiness: readiness.rows,
        focuses: focuses.rows,
        feedback: feedback.rows,
        releasedFeedback: releasedFeedback.rows,
        notifications: notifications.rows
      };
      payload.shootingComparison=buildShootingComparison({profiles,sessions:sessions.rows,exercises:exercises.rows,measurements:measurements.rows,teamRows:teamShooting});
      if (isIndividualCoach(auth.role)) {
        const [coachNotes, aiDrafts, auditLog] = await Promise.all([
          execute(
            `SELECT * FROM individual_coach_notes
              WHERE individual_profile_id = ANY($1::uuid[])
              ORDER BY created_at DESC`, [profileIds]
          ),
          execute(
            `SELECT * FROM individual_ai_drafts
              WHERE individual_profile_id = ANY($1::uuid[])
              ORDER BY created_at DESC`, [profileIds]
          ),
          execute(
            `SELECT * FROM individual_audit_log
              WHERE individual_profile_id = ANY($1::uuid[])
              ORDER BY changed_at DESC`, [profileIds]
          )
        ]);
        payload.coachNotes = coachNotes.rows;
        payload.aiDrafts = aiDrafts.rows;
        payload.auditLog = auditLog.rows;
      }
      return res.status(200).json(isIndividualPlayer(auth.role) ? individualPlayerData(payload) : payload);
    } catch (error) {
      return safeError('individual-overview', error, res, 'Individual Training konnte nicht geladen werden.');
    }
  };
}

export default createIndividualOverviewHandler();
