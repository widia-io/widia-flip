-- Migration: Add URL import tracking and storage limits
-- M14: Credit system for URL imports + storage tracking

-- Track if prospect was imported via URL (for counting URL import credits)
ALTER TABLE flip.prospecting_properties
  ADD COLUMN IF NOT EXISTS imported_via_url BOOLEAN DEFAULT FALSE;

-- Track total storage used per workspace (in bytes)
ALTER TABLE flip.workspaces
  ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0;

-- Index for efficient URL import counting per period
CREATE INDEX IF NOT EXISTS idx_prospects_imported_via_url
  ON flip.prospecting_properties(workspace_id, imported_via_url, created_at)
  WHERE imported_via_url = TRUE AND deleted_at IS NULL;

COMMENT ON COLUMN flip.prospecting_properties.imported_via_url IS 'True if prospect was created via URL scraping (uses API credits)';
COMMENT ON COLUMN flip.workspaces.storage_used_bytes IS 'Total storage used by documents in this workspace (bytes)';
