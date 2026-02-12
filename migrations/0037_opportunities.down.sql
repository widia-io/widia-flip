-- Usar schema flip
SET search_path TO flip, public;

-- Drop índices
DROP INDEX IF EXISTS idx_opportunity_job_runs_job_name;
DROP INDEX IF EXISTS idx_source_listings_source;
DROP INDEX IF EXISTS idx_source_listings_last_seen;
DROP INDEX IF EXISTS idx_source_listings_location;
DROP INDEX IF EXISTS idx_opportunities_status;
DROP INDEX IF EXISTS idx_opportunities_score;

-- Drop tabelas
DROP TABLE IF EXISTS opportunity_job_runs;
DROP TABLE IF EXISTS opportunities;
DROP TABLE IF EXISTS source_listings;
