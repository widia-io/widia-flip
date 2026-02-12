-- Usar schema flip
SET search_path TO flip, public;

ALTER TABLE opportunity_scraper_placeholders
  ADD COLUMN state VARCHAR(2) NOT NULL DEFAULT 'pr';

UPDATE opportunity_scraper_placeholders
SET state = LOWER(COALESCE(state, 'pr'));

DROP INDEX IF EXISTS idx_opportunity_scraper_placeholders_city_neighborhood;

CREATE UNIQUE INDEX idx_opportunity_scraper_placeholders_state_city_neighborhood
  ON opportunity_scraper_placeholders (LOWER(state), LOWER(city), LOWER(neighborhood));
