SET search_path TO flip, public;

ALTER TABLE workspace_settings DROP CONSTRAINT IF EXISTS chk_workspace_settings_offer_max_sale_to_ask_ratio_positive;
ALTER TABLE workspace_settings DROP CONSTRAINT IF EXISTS chk_workspace_settings_offer_rate_limit_positive;
ALTER TABLE workspace_settings DROP CONSTRAINT IF EXISTS chk_workspace_settings_offer_min_confidence_range;

ALTER TABLE workspace_settings
  DROP COLUMN IF EXISTS offer_first_full_preview_user_id,
  DROP COLUMN IF EXISTS offer_first_full_preview_consumed_at,
  DROP COLUMN IF EXISTS offer_generate_rate_limit_per_min,
  DROP COLUMN IF EXISTS offer_max_sale_to_ask_ratio,
  DROP COLUMN IF EXISTS offer_confidence_weights_json,
  DROP COLUMN IF EXISTS offer_max_risk_score,
  DROP COLUMN IF EXISTS offer_min_confidence,
  DROP COLUMN IF EXISTS offer_min_net_profit_brl,
  DROP COLUMN IF EXISTS offer_min_margin_pct;
