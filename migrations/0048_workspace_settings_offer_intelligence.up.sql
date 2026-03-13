SET search_path TO flip, public;

ALTER TABLE workspace_settings
  ADD COLUMN IF NOT EXISTS offer_min_margin_pct NUMERIC NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS offer_min_net_profit_brl NUMERIC NOT NULL DEFAULT 30000,
  ADD COLUMN IF NOT EXISTS offer_min_confidence NUMERIC NOT NULL DEFAULT 0.55,
  ADD COLUMN IF NOT EXISTS offer_max_risk_score NUMERIC NOT NULL DEFAULT 65,
  ADD COLUMN IF NOT EXISTS offer_confidence_weights_json JSONB NOT NULL DEFAULT '{"input_quality":0.30,"default_dependency":0.25,"economic_consistency":0.20,"risk_signals":0.15,"market_coverage":0.10}'::JSONB,
  ADD COLUMN IF NOT EXISTS offer_max_sale_to_ask_ratio NUMERIC NOT NULL DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS offer_generate_rate_limit_per_min INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS offer_first_full_preview_consumed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS offer_first_full_preview_user_id TEXT NULL;

ALTER TABLE workspace_settings
  ADD CONSTRAINT chk_workspace_settings_offer_min_confidence_range
  CHECK (offer_min_confidence >= 0 AND offer_min_confidence <= 1);

ALTER TABLE workspace_settings
  ADD CONSTRAINT chk_workspace_settings_offer_rate_limit_positive
  CHECK (offer_generate_rate_limit_per_min > 0);

ALTER TABLE workspace_settings
  ADD CONSTRAINT chk_workspace_settings_offer_max_sale_to_ask_ratio_positive
  CHECK (offer_max_sale_to_ask_ratio > 0);
