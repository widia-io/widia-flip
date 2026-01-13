DROP INDEX IF EXISTS flip.idx_cost_items_schedule_unique;
DROP INDEX IF EXISTS flip.idx_cost_items_schedule;
ALTER TABLE flip.cost_items DROP COLUMN IF EXISTS schedule_item_id;
