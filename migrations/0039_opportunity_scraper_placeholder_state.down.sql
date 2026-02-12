-- Usar schema flip
SET search_path TO flip, public;

DROP INDEX IF EXISTS idx_opportunity_scraper_placeholders_state_city_neighborhood;

CREATE UNIQUE INDEX idx_opportunity_scraper_placeholders_city_neighborhood
  ON opportunity_scraper_placeholders (LOWER(city), LOWER(neighborhood));

ALTER TABLE opportunity_scraper_placeholders
  DROP COLUMN IF EXISTS state;
