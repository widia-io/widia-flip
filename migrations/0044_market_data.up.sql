-- Market Data Module (M14) - SP MVP
SET search_path TO flip, public;

CREATE TABLE IF NOT EXISTS market_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  region_type TEXT NOT NULL,
  name_raw TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  source TEXT NOT NULL,
  geom JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (city, region_type, name_normalized, source)
);

CREATE INDEX IF NOT EXISTS idx_market_regions_city_region_type_name
  ON market_regions (city, region_type, name_normalized);

CREATE TABLE IF NOT EXISTS market_ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  city TEXT NOT NULL,
  as_of_month DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  input_rows INT NOT NULL DEFAULT 0,
  valid_rows INT NOT NULL DEFAULT 0,
  output_groups INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_ingestion_runs_city_month
  ON market_ingestion_runs (city, as_of_month DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS market_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NULL REFERENCES market_ingestion_runs(id) ON DELETE SET NULL,
  city TEXT NOT NULL,
  source TEXT NOT NULL,
  month DATE NOT NULL,
  region_id UUID NOT NULL REFERENCES market_regions(id) ON DELETE RESTRICT,
  region_name_raw TEXT NOT NULL,
  region_name_normalized TEXT NOT NULL,
  property_class TEXT NOT NULL,
  sql_registration TEXT NULL,
  transaction_date DATE NULL,
  transaction_value NUMERIC(16, 2) NOT NULL,
  area_m2 NUMERIC(12, 2) NOT NULL,
  price_m2 NUMERIC(16, 2) NOT NULL,
  iptu_use TEXT NULL,
  iptu_use_description TEXT NULL,
  row_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (city, source, row_hash)
);

CREATE INDEX IF NOT EXISTS idx_market_transactions_city_month_property
  ON market_transactions (city, month, property_class);

CREATE INDEX IF NOT EXISTS idx_market_transactions_city_region_name
  ON market_transactions (city, region_name_normalized);

CREATE INDEX IF NOT EXISTS idx_market_transactions_city_source_month
  ON market_transactions (city, source, month);

CREATE INDEX IF NOT EXISTS idx_market_transactions_run
  ON market_transactions (run_id);

CREATE TABLE IF NOT EXISTS market_price_m2_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  source TEXT NOT NULL,
  region_id UUID NOT NULL REFERENCES market_regions(id) ON DELETE RESTRICT,
  region_type TEXT NOT NULL,
  as_of_month DATE NOT NULL,
  period_months INT NOT NULL CHECK (period_months IN (1, 3, 6, 12)),
  property_class TEXT NOT NULL,
  median_m2 NUMERIC(16, 2) NOT NULL,
  p25_m2 NUMERIC(16, 2) NOT NULL,
  p75_m2 NUMERIC(16, 2) NOT NULL,
  tx_count INT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (city, source, region_id, as_of_month, period_months, property_class)
);

CREATE INDEX IF NOT EXISTS idx_market_price_m2_aggregates_city_month_period_class
  ON market_price_m2_aggregates (city, as_of_month DESC, period_months, property_class);

CREATE INDEX IF NOT EXISTS idx_market_price_m2_aggregates_region
  ON market_price_m2_aggregates (region_id, as_of_month DESC);
