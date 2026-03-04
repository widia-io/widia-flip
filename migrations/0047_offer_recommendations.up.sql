SET search_path TO flip, public;

CREATE TABLE IF NOT EXISTS offer_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES flip.workspaces(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES flip.prospecting_properties(id) ON DELETE CASCADE,
  created_by_user_id TEXT NOT NULL,
  formula_version TEXT NOT NULL,
  decision TEXT NOT NULL,
  confidence NUMERIC(5,4) NOT NULL,
  confidence_bucket TEXT NOT NULL,
  reason_codes TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  recommended_offer_price NUMERIC(12,2),
  recommended_margin NUMERIC(7,2),
  recommended_net_profit NUMERIC(14,2),
  input_hash TEXT NOT NULL,
  settings_hash TEXT NOT NULL,
  is_stale BOOLEAN NOT NULL DEFAULT false,
  stale_reason TEXT NULL,
  inputs_json JSONB NOT NULL,
  outputs_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_offer_recommendations_decision CHECK (decision IN ('GO', 'REVIEW', 'NO_GO')),
  CONSTRAINT chk_offer_recommendations_confidence_bucket CHECK (confidence_bucket IN ('high', 'medium', 'low')),
  CONSTRAINT chk_offer_recommendations_stale_reason CHECK (
    stale_reason IS NULL OR stale_reason IN ('INPUT_CHANGED', 'SETTINGS_CHANGED', 'FORMULA_CHANGED')
  )
);

CREATE INDEX IF NOT EXISTS idx_offer_recommendations_workspace_prospect_created
  ON offer_recommendations (workspace_id, prospect_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_offer_recommendations_workspace_is_stale
  ON offer_recommendations (workspace_id, is_stale);

CREATE INDEX IF NOT EXISTS idx_offer_recommendations_workspace_decision
  ON offer_recommendations (workspace_id, decision);
