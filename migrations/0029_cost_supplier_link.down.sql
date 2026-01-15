DROP INDEX IF EXISTS flip.idx_cost_items_supplier;
ALTER TABLE flip.cost_items DROP COLUMN IF EXISTS supplier_id;
