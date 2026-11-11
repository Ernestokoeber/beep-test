BEGIN;
-- A coach can release a weekly focus even when no individual session took place.
-- Existing session links, focus IDs and player feedback remain intact.
ALTER TABLE individual_weekly_focus ALTER COLUMN source_session_id DROP NOT NULL;
INSERT INTO schema_migrations(version) VALUES ('20261111_0001_independent_weekly_focus') ON CONFLICT DO NOTHING;
COMMIT;
