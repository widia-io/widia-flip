-- M2: Imóvel Hub + Viabilidade à Vista
-- Adds workspace settings for cash calculations, analysis tables, and timeline events

-- Expand workspace_settings with defaults BR for cash calculations
ALTER TABLE workspace_settings
  ADD COLUMN IF NOT EXISTS itbi_rate numeric NOT NULL DEFAULT 0.03,
  ADD COLUMN IF NOT EXISTS registry_rate numeric NOT NULL DEFAULT 0.01,
  ADD COLUMN IF NOT EXISTS broker_rate numeric NOT NULL DEFAULT 0.06,
  ADD COLUMN IF NOT EXISTS default_renovation_cost numeric NOT NULL DEFAULT 0;

-- Current analysis inputs (one per property, updated on each edit)
CREATE TABLE IF NOT EXISTS analysis_cash_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  purchase_price numeric,
  renovation_cost numeric,
  other_costs numeric,
  sale_price numeric,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_inputs_property ON analysis_cash_inputs(property_id);
CREATE INDEX IF NOT EXISTS idx_cash_inputs_workspace ON analysis_cash_inputs(workspace_id);

-- Historical snapshots (created explicitly by user action)
CREATE TABLE IF NOT EXISTS analysis_cash_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  inputs jsonb NOT NULL,
  outputs jsonb NOT NULL,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_snapshots_property ON analysis_cash_snapshots(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_snapshots_workspace ON analysis_cash_snapshots(workspace_id);

-- Timeline events for property lifecycle tracking
CREATE TABLE IF NOT EXISTS timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  event_type text NOT NULL,
  payload jsonb,
  actor_user_id text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timeline_property ON timeline_events(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_workspace ON timeline_events(workspace_id);
