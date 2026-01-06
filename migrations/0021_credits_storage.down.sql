-- Rollback: Remove URL import tracking and storage limits

DROP INDEX IF EXISTS flip.idx_prospects_imported_via_url;

ALTER TABLE flip.prospecting_properties
  DROP COLUMN IF EXISTS imported_via_url;

ALTER TABLE flip.workspaces
  DROP COLUMN IF EXISTS storage_used_bytes;
