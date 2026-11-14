BEGIN;
-- Additive: published plans and historical results remain untouched.
ALTER TABLE individual_profiles ADD COLUMN IF NOT EXISTS planning_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE individual_profiles ADD COLUMN IF NOT EXISTS planning_preferences_version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS individual_plan_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  individual_profile_id UUID NOT NULL REFERENCES individual_profiles(id),
  requested_by UUID NOT NULL REFERENCES users(id),
  request_key UUID NOT NULL,
  request_hash TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('manual','ai')),
  status TEXT NOT NULL CHECK (status IN ('generating','ready','failed','stale','published','discarded')),
  source JSONB NOT NULL,
  proposal JSONB,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (requested_by, request_key)
);
CREATE INDEX IF NOT EXISTS individual_plan_proposals_profile_idx ON individual_plan_proposals(individual_profile_id, created_at DESC);
INSERT INTO schema_migrations(version) VALUES ('20261114_0001_training_proposals') ON CONFLICT DO NOTHING;
COMMIT;
