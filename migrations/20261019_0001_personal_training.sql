BEGIN;
CREATE TABLE IF NOT EXISTS personal_training (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{"plan":null,"records":[]}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO schema_migrations(version) VALUES ('20261019_0001_personal_training') ON CONFLICT DO NOTHING;
COMMIT;
