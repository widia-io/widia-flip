SET search_path TO flip, public;

DROP INDEX IF EXISTS idx_market_price_m2_aggregates_region;
DROP INDEX IF EXISTS idx_market_price_m2_aggregates_city_month_period_class;

DROP TABLE IF EXISTS market_price_m2_aggregates;

DROP INDEX IF EXISTS idx_market_transactions_run;
DROP INDEX IF EXISTS idx_market_transactions_city_source_month;
DROP INDEX IF EXISTS idx_market_transactions_city_region_name;
DROP INDEX IF EXISTS idx_market_transactions_city_month_property;

DROP TABLE IF EXISTS market_transactions;

DROP INDEX IF EXISTS idx_market_ingestion_runs_city_month;

DROP TABLE IF EXISTS market_ingestion_runs;

DROP INDEX IF EXISTS idx_market_regions_city_region_type_name;

DROP TABLE IF EXISTS market_regions;
