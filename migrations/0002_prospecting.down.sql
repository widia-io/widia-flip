-- Rollback M1: Prospecção + Quick Add

DROP INDEX IF EXISTS idx_properties_workspace_created;
DROP INDEX IF EXISTS idx_properties_workspace_status;
DROP INDEX IF EXISTS idx_prospecting_properties_workspace_created;
DROP INDEX IF EXISTS idx_prospecting_properties_workspace_status;

DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS prospecting_properties;
