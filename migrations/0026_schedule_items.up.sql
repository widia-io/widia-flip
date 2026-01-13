-- T-FUTURE.3/T-FUTURE.4: Cronograma da Obra (Construction Schedule)
-- Option B: Dedicated schedule_items table with CRUD

CREATE TABLE IF NOT EXISTS flip.schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES flip.properties(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES flip.workspaces(id) ON DELETE CASCADE,

  title text NOT NULL,
  planned_date date NOT NULL,
  done_at timestamptz,
  notes text,
  order_index int,
  category text,
  estimated_cost numeric,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_items_property ON flip.schedule_items(property_id, planned_date);
CREATE INDEX IF NOT EXISTS idx_schedule_items_workspace ON flip.schedule_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_status ON flip.schedule_items(property_id, done_at NULLS FIRST, planned_date);
