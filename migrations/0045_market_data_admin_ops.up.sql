-- Market Data Admin Ops (M16 pós-MVP)
SET search_path TO flip, public;

ALTER TABLE market_ingestion_runs
  ADD COLUMN IF NOT EXISTS trigger_type TEXT NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS triggered_by TEXT NULL,
  ADD COLUMN IF NOT EXISTS dry_run BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS storage_key TEXT NULL,
  ADD COLUMN IF NOT EXISTS original_filename TEXT NULL,
  ADD COLUMN IF NOT EXISTS content_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT NULL,
  ADD COLUMN IF NOT EXISTS stats JSONB NULL,
  ADD COLUMN IF NOT EXISTS params JSONB NULL;

CREATE INDEX IF NOT EXISTS idx_market_ingestion_runs_city_created
  ON market_ingestion_runs (city, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_ingestion_runs_status_created
  ON market_ingestion_runs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_ingestion_runs_month_city
  ON market_ingestion_runs (as_of_month DESC, city);
