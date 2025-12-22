-- 0008_soft_delete_prospects.down.sql
-- Remove soft delete support

DROP INDEX IF EXISTS idx_prospects_deleted;
ALTER TABLE prospecting_properties DROP COLUMN deleted_at;
