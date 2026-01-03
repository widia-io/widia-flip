-- Property-level tax rate overrides
-- NULL values = inherit from workspace_settings

CREATE TABLE IF NOT EXISTS flip.property_tax_rates (
  property_id uuid PRIMARY KEY REFERENCES flip.properties(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES flip.workspaces(id) ON DELETE CASCADE,

  itbi_rate numeric,
  registry_rate numeric,
  broker_rate numeric,
  pj_tax_rate numeric,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_tax_rates_workspace
  ON flip.property_tax_rates(workspace_id);
