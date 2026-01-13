-- Link cost_items to schedule_items for automatic sync
ALTER TABLE flip.cost_items ADD COLUMN schedule_item_id uuid
  REFERENCES flip.schedule_items(id) ON DELETE CASCADE;

-- Index for efficient lookups
CREATE INDEX idx_cost_items_schedule ON flip.cost_items(schedule_item_id)
  WHERE schedule_item_id IS NOT NULL;

-- Unique constraint: one cost per schedule item
CREATE UNIQUE INDEX idx_cost_items_schedule_unique ON flip.cost_items(schedule_item_id)
  WHERE schedule_item_id IS NOT NULL;
