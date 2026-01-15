-- Link cost_items to suppliers
ALTER TABLE flip.cost_items ADD COLUMN IF NOT EXISTS supplier_id uuid
  REFERENCES flip.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cost_items_supplier ON flip.cost_items(supplier_id);
