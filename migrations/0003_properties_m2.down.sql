-- M2: Rollback Imóvel Hub + Viabilidade à Vista

DROP TABLE IF EXISTS timeline_events;
DROP TABLE IF EXISTS analysis_cash_snapshots;
DROP TABLE IF EXISTS analysis_cash_inputs;

ALTER TABLE workspace_settings
  DROP COLUMN IF EXISTS itbi_rate,
  DROP COLUMN IF EXISTS registry_rate,
  DROP COLUMN IF EXISTS broker_rate,
  DROP COLUMN IF EXISTS default_renovation_cost;
