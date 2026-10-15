-- CourtHub Individual Training Pilot 2026
-- Additive migration. Existing team workspace data is neither changed nor copied.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version      TEXT PRIMARY KEY,
  applied_at   TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_role_check
  CHECK (role IN ('admin', 'coach', 'assistant', 'viewer', 'player'));

CREATE TABLE IF NOT EXISTS individual_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  player_profile_id TEXT NOT NULL,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  coach_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  pilot_started_on  DATE,
  pilot_target_units SMALLINT NOT NULL DEFAULT 8 CHECK (pilot_target_units = 8),
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, player_profile_id),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS individual_consents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_profile_id UUID NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
  consented_by_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  consent_version       TEXT NOT NULL,
  consented_at          TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  withdrawn_at          TIMESTAMPTZ,
  CHECK (withdrawn_at IS NULL OR withdrawn_at >= consented_at)
);

CREATE TABLE IF NOT EXISTS individual_invites (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  individual_profile_id UUID NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
  token_hash            TEXT NOT NULL UNIQUE,
  created_by            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expires_at            TIMESTAMPTZ NOT NULL,
  used_by               UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at               TIMESTAMPTZ,
  revoked_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK ((used_by IS NULL) = (used_at IS NULL))
);

CREATE TABLE IF NOT EXISTS individual_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  coach_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  scheduled_for    TIMESTAMPTZ NOT NULL,
  timezone         TEXT NOT NULL DEFAULT 'Europe/Berlin' CHECK (timezone = 'Europe/Berlin'),
  duration_minutes SMALLINT NOT NULL DEFAULT 105 CHECK (duration_minutes BETWEEN 1 AND 240),
  unit_number      SMALLINT CHECK (unit_number BETWEEN 1 AND 8),
  status           TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'cancelled', 'in_progress', 'completed')),
  cancellation_kind TEXT CHECK (cancellation_kind IN ('coach_cancelled', 'all_players_declined', 'holiday', 'hall_closed')),
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK ((status = 'cancelled') = (cancellation_kind IS NOT NULL)),
  CHECK (status = 'completed' OR completed_at IS NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS individual_sessions_unit_idx
  ON individual_sessions(organization_id, coach_user_id, unit_number)
  WHERE unit_number IS NOT NULL AND status <> 'cancelled';

CREATE TABLE IF NOT EXISTS individual_session_participants (
  session_id             UUID NOT NULL REFERENCES individual_sessions(id) ON DELETE CASCADE,
  individual_profile_id  UUID NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
  attendance_status      TEXT NOT NULL DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'confirmed', 'declined', 'attended', 'unexcused_no_show')),
  player_decided_at      TIMESTAMPTZ,
  coach_confirmed_at     TIMESTAMPTZ,
  PRIMARY KEY (session_id, individual_profile_id)
);

CREATE TABLE IF NOT EXISTS individual_session_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES individual_sessions(id) ON DELETE CASCADE,
  individual_profile_id UUID NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  objective   TEXT NOT NULL DEFAULT '',
  version     INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (session_id, individual_profile_id)
);

CREATE TABLE IF NOT EXISTS individual_exercises (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id            UUID NOT NULL REFERENCES individual_session_plans(id) ON DELETE CASCADE,
  position           SMALLINT NOT NULL CHECK (position > 0),
  title              TEXT NOT NULL,
  duration_minutes   SMALLINT NOT NULL CHECK (duration_minutes BETWEEN 1 AND 120),
  repetitions        JSONB NOT NULL DEFAULT '{}'::jsonb,
  measurement_method JSONB NOT NULL DEFAULT '{}'::jsonb,
  coaching_cues      JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (plan_id, position)
);

CREATE TABLE IF NOT EXISTS individual_measurements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  individual_profile_id UUID NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
  session_id            UUID NOT NULL REFERENCES individual_sessions(id) ON DELETE CASCADE,
  exercise_id           UUID REFERENCES individual_exercises(id) ON DELETE SET NULL,
  metric_key            TEXT NOT NULL,
  numeric_value         NUMERIC,
  text_value            TEXT,
  unit                  TEXT,
  attempt               SMALLINT CHECK (attempt IS NULL OR attempt > 0),
  device_recorded_at    TIMESTAMPTZ,
  server_received_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_by            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK ((numeric_value IS NOT NULL)::integer + (text_value IS NOT NULL)::integer = 1)
);

CREATE TABLE IF NOT EXISTS individual_readiness (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_profile_id UUID NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
  session_id            UUID NOT NULL REFERENCES individual_sessions(id) ON DELETE CASCADE,
  score                 SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 10),
  created_by            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  device_recorded_at    TIMESTAMPTZ,
  server_received_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (individual_profile_id, session_id)
);

CREATE TABLE IF NOT EXISTS individual_weekly_focus (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_profile_id UUID NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
  source_session_id     UUID NOT NULL REFERENCES individual_sessions(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  cue_one               TEXT NOT NULL,
  cue_two               TEXT,
  success_indicator     TEXT NOT NULL,
  valid_from             DATE NOT NULL,
  valid_until            DATE NOT NULL,
  released_by            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  released_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (valid_until >= valid_from),
  UNIQUE (individual_profile_id, source_session_id)
);

CREATE TABLE IF NOT EXISTS individual_weekly_feedback (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_profile_id UUID NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
  focus_id              UUID NOT NULL REFERENCES individual_weekly_focus(id) ON DELETE CASCADE,
  training_day          TEXT NOT NULL CHECK (training_day IN ('tuesday', 'friday')),
  training_date         DATE NOT NULL,
  occurrence            TEXT NOT NULL CHECK (occurrence IN ('often', 'sometimes', 'none', 'training_cancelled', 'not_participated')),
  implementation_score  SMALLINT CHECK (implementation_score BETWEEN 1 AND 5),
  note                  TEXT,
  device_recorded_at    TIMESTAMPTZ,
  server_received_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (individual_profile_id, training_date),
  CHECK (
    (occurrence IN ('training_cancelled', 'not_participated') AND implementation_score IS NULL)
    OR occurrence IN ('often', 'sometimes', 'none')
  )
);

CREATE TABLE IF NOT EXISTS individual_coach_notes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_profile_id UUID NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
  session_id            UUID REFERENCES individual_sessions(id) ON DELETE SET NULL,
  note                  TEXT NOT NULL,
  created_by            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS individual_released_feedback (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_profile_id UUID NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
  session_id            UUID REFERENCES individual_sessions(id) ON DELETE SET NULL,
  content               TEXT NOT NULL,
  released_by           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  released_at           TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS individual_push_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_profile_id UUID NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
  endpoint_hash         TEXT NOT NULL UNIQUE,
  endpoint              TEXT NOT NULL,
  p256dh                TEXT NOT NULL,
  auth_secret           TEXT NOT NULL,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  revoked_at            TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS individual_notifications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_profile_id UUID NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
  notification_key      TEXT NOT NULL,
  kind                  TEXT NOT NULL CHECK (kind IN ('focus', 'feedback_request', 'feedback_followup', 'attendance')),
  due_at                 TIMESTAMPTZ NOT NULL,
  dashboard_visible_at  TIMESTAMPTZ,
  push_sent_at           TIMESTAMPTZ,
  stopped_at             TIMESTAMPTZ,
  read_at                TIMESTAMPTZ,
  payload                JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (individual_profile_id, notification_key)
);

CREATE TABLE IF NOT EXISTS individual_sync_mutations (
  mutation_id            TEXT PRIMARY KEY,
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  individual_profile_id  UUID NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
  entity_type            TEXT NOT NULL,
  entity_id              UUID NOT NULL,
  operation              TEXT NOT NULL CHECK (operation IN ('create', 'update')),
  payload                JSONB NOT NULL,
  device_recorded_at     TIMESTAMPTZ,
  server_received_at     TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  applied                BOOLEAN NOT NULL DEFAULT FALSE,
  failure_code           TEXT
);

CREATE TABLE IF NOT EXISTS individual_ai_drafts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_profile_id UUID NOT NULL REFERENCES individual_profiles(id) ON DELETE CASCADE,
  session_id            UUID NOT NULL REFERENCES individual_sessions(id) ON DELETE CASCADE,
  version               INTEGER NOT NULL CHECK (version > 0),
  status                TEXT NOT NULL CHECK (status IN ('queued', 'generating', 'current', 'stale', 'failed', 'approved')),
  source_revision       TEXT NOT NULL,
  content               JSONB,
  error_code            TEXT,
  requested_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_at          TIMESTAMPTZ,
  approved_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (individual_profile_id, session_id, version),
  CHECK ((status = 'approved') = (approved_at IS NOT NULL)),
  CHECK (status <> 'approved' OR content IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS individual_ai_active_job_idx
  ON individual_ai_drafts(individual_profile_id, session_id)
  WHERE status IN ('queued', 'generating');

CREATE TABLE IF NOT EXISTS individual_audit_log (
  id                    BIGSERIAL PRIMARY KEY,
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  individual_profile_id UUID REFERENCES individual_profiles(id) ON DELETE SET NULL,
  entity_type           TEXT NOT NULL,
  entity_id             UUID NOT NULL,
  field_name            TEXT NOT NULL,
  old_value             JSONB,
  new_value             JSONB,
  change_reason         TEXT NOT NULL CHECK (char_length(btrim(change_reason)) BETWEEN 2 AND 240),
  changed_by            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  changed_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  mutation_id           TEXT REFERENCES individual_sync_mutations(mutation_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS individual_profiles_coach_idx ON individual_profiles(organization_id, coach_user_id, active);
CREATE INDEX IF NOT EXISTS individual_sessions_coach_date_idx ON individual_sessions(organization_id, coach_user_id, scheduled_for);
CREATE INDEX IF NOT EXISTS individual_measurements_profile_idx ON individual_measurements(individual_profile_id, session_id, metric_key);
CREATE INDEX IF NOT EXISTS individual_feedback_profile_date_idx ON individual_weekly_feedback(individual_profile_id, training_date DESC);
CREATE INDEX IF NOT EXISTS individual_notifications_due_idx ON individual_notifications(due_at) WHERE stopped_at IS NULL;
CREATE INDEX IF NOT EXISTS individual_audit_entity_idx ON individual_audit_log(entity_type, entity_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS individual_sync_entity_idx ON individual_sync_mutations(entity_type, entity_id, server_received_at DESC);

CREATE OR REPLACE FUNCTION enforce_individual_coach_capacity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE active_count INTEGER;
BEGIN
  IF NEW.active THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.organization_id::text || ':' || NEW.coach_user_id::text));
    SELECT count(*) INTO active_count
      FROM individual_profiles
     WHERE organization_id = NEW.organization_id
       AND coach_user_id = NEW.coach_user_id
       AND active = TRUE
       AND id <> NEW.id;
    IF active_count >= 3 THEN
      RAISE EXCEPTION 'Ein Coach darf höchstens drei aktive Individualspieler betreuen.' USING ERRCODE = '23514';
    END IF;
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS individual_profiles_capacity_trigger ON individual_profiles;
CREATE TRIGGER individual_profiles_capacity_trigger
BEFORE INSERT OR UPDATE OF coach_user_id, organization_id, active ON individual_profiles
FOR EACH ROW EXECUTE FUNCTION enforce_individual_coach_capacity();

CREATE OR REPLACE FUNCTION enforce_individual_session_capacity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE participant_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.session_id::text));
  SELECT count(*) INTO participant_count
    FROM individual_session_participants
   WHERE session_id = NEW.session_id
     AND individual_profile_id <> NEW.individual_profile_id;
  IF participant_count >= 2 THEN
    RAISE EXCEPTION 'Eine Individualeinheit darf höchstens zwei Teilnehmer haben.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS individual_session_capacity_trigger ON individual_session_participants;
CREATE TRIGGER individual_session_capacity_trigger
BEFORE INSERT OR UPDATE OF session_id ON individual_session_participants
FOR EACH ROW EXECUTE FUNCTION enforce_individual_session_capacity();

CREATE OR REPLACE FUNCTION reject_individual_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit-Einträge sind unveränderbar.' USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS individual_audit_immutable_update ON individual_audit_log;
CREATE TRIGGER individual_audit_immutable_update
BEFORE UPDATE OR DELETE ON individual_audit_log
FOR EACH ROW EXECUTE FUNCTION reject_individual_audit_mutation();

INSERT INTO schema_migrations(version)
VALUES ('20261015_0001_individual_training')
ON CONFLICT (version) DO NOTHING;

COMMIT;
