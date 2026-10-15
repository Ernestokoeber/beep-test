-- Destructive rollback for a disposable database copy only.
-- Remove pilot player memberships before restoring the original role check.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM memberships WHERE role = 'player') THEN
    RAISE EXCEPTION 'Rollback abgebrochen: player-Mitgliedschaften müssen auf der Datenbankkopie zuerst entfernt werden.';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS individual_audit_immutable_update ON individual_audit_log;
DROP TRIGGER IF EXISTS individual_session_capacity_trigger ON individual_session_participants;
DROP TRIGGER IF EXISTS individual_profiles_capacity_trigger ON individual_profiles;
DROP FUNCTION IF EXISTS reject_individual_audit_mutation();
DROP FUNCTION IF EXISTS enforce_individual_session_capacity();
DROP FUNCTION IF EXISTS enforce_individual_coach_capacity();

DROP TABLE IF EXISTS individual_audit_log;
DROP TABLE IF EXISTS individual_ai_drafts;
DROP TABLE IF EXISTS individual_sync_mutations;
DROP TABLE IF EXISTS individual_notifications;
DROP TABLE IF EXISTS individual_push_subscriptions;
DROP TABLE IF EXISTS individual_released_feedback;
DROP TABLE IF EXISTS individual_coach_notes;
DROP TABLE IF EXISTS individual_weekly_feedback;
DROP TABLE IF EXISTS individual_weekly_focus;
DROP TABLE IF EXISTS individual_readiness;
DROP TABLE IF EXISTS individual_measurements;
DROP TABLE IF EXISTS individual_exercises;
DROP TABLE IF EXISTS individual_session_plans;
DROP TABLE IF EXISTS individual_session_participants;
DROP TABLE IF EXISTS individual_sessions;
DROP TABLE IF EXISTS individual_invites;
DROP TABLE IF EXISTS individual_consents;
DROP TABLE IF EXISTS individual_profiles;

ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_role_check
  CHECK (role IN ('admin', 'coach', 'assistant', 'viewer'));

DELETE FROM schema_migrations WHERE version = '20261015_0001_individual_training';

COMMIT;
