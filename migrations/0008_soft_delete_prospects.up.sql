-- 0008_soft_delete_prospects.up.sql
-- Add soft delete support for prospects

ALTER TABLE prospecting_properties ADD COLUMN deleted_at TIMESTAMPTZ;

-- Partial index for efficient queries (only non-deleted rows)
CREATE INDEX idx_prospects_deleted ON prospecting_properties(deleted_at) WHERE deleted_at IS NULL;
