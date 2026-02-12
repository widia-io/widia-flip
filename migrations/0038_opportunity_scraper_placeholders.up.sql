-- Usar schema flip
SET search_path TO flip, public;

CREATE TABLE opportunity_scraper_placeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city VARCHAR(255) NOT NULL,
  neighborhood VARCHAR(255) NOT NULL,
  last_run_at TIMESTAMPTZ,
  last_job_run_id UUID REFERENCES opportunity_job_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_opportunity_scraper_placeholders_city_neighborhood
  ON opportunity_scraper_placeholders (LOWER(city), LOWER(neighborhood));

CREATE INDEX idx_opportunity_scraper_placeholders_last_run_at
  ON opportunity_scraper_placeholders (last_run_at DESC NULLS LAST);
