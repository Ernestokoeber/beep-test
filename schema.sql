-- CourtHub · TSV Lindau Basketball
-- PostgreSQL-Schema für Konten, Rollen, Team-Workspace und KI-Kostenschutz.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS memberships (
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role           TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'assistant', 'viewer')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS workspaces (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  data            JSONB NOT NULL DEFAULT '{}'::jsonb,
  version         BIGINT NOT NULL DEFAULT 0,
  updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_rate_limit (
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count        INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, action)
);

CREATE TABLE IF NOT EXISTS checkin_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  training_id     TEXT NOT NULL,
  token_hash      TEXT UNIQUE NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checkin_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id      UUID NOT NULL REFERENCES checkin_links(id) ON DELETE CASCADE,
  player_id    TEXT NOT NULL,
  player_name  TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (link_id, player_id)
);

CREATE TABLE IF NOT EXISTS atlas_import_receipts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  atlas_game_id      TEXT NOT NULL,
  checksum           TEXT UNIQUE NOT NULL,
  schema_version     TEXT NOT NULL,
  workspace_version  BIGINT NOT NULL,
  imported_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memberships_organization_idx ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users(lower(email));
CREATE INDEX IF NOT EXISTS checkin_links_training_idx ON checkin_links(organization_id, training_id, created_at DESC);
CREATE INDEX IF NOT EXISTS checkin_submissions_link_idx ON checkin_submissions(link_id, submitted_at);
CREATE INDEX IF NOT EXISTS atlas_import_receipts_game_idx ON atlas_import_receipts(organization_id, atlas_game_id, imported_at DESC);
