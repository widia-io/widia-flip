SET search_path TO flip, public;

DROP INDEX IF EXISTS idx_market_ingestion_runs_month_city;
DROP INDEX IF EXISTS idx_market_ingestion_runs_status_created;
DROP INDEX IF EXISTS idx_market_ingestion_runs_city_created;

ALTER TABLE market_ingestion_runs
  DROP COLUMN IF EXISTS params,
  DROP COLUMN IF EXISTS stats,
  DROP COLUMN IF EXISTS file_size_bytes,
  DROP COLUMN IF EXISTS content_type,
  DROP COLUMN IF EXISTS original_filename,
  DROP COLUMN IF EXISTS storage_key,
  DROP COLUMN IF EXISTS dry_run,
  DROP COLUMN IF EXISTS triggered_by,
  DROP COLUMN IF EXISTS trigger_type;
