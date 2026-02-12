-- Usar schema flip
SET search_path TO flip, public;

DROP INDEX IF EXISTS idx_opportunity_scraper_placeholders_last_run_at;
DROP INDEX IF EXISTS idx_opportunity_scraper_placeholders_city_neighborhood;
DROP TABLE IF EXISTS opportunity_scraper_placeholders;
