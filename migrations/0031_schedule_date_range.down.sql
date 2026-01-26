-- Rollback: revert to single planned_date column

-- Drop new index
DROP INDEX IF EXISTS flip.idx_schedule_items_date_range;
DROP INDEX IF EXISTS flip.idx_schedule_items_property;
DROP INDEX IF EXISTS flip.idx_schedule_items_status;

-- Drop constraint
ALTER TABLE flip.schedule_items DROP CONSTRAINT IF EXISTS chk_schedule_dates;

-- Drop end_date column
ALTER TABLE flip.schedule_items DROP COLUMN end_date;

-- Rename start_date back to planned_date
ALTER TABLE flip.schedule_items RENAME COLUMN start_date TO planned_date;

-- Recreate original indexes
CREATE INDEX idx_schedule_items_property ON flip.schedule_items(property_id, planned_date);
CREATE INDEX idx_schedule_items_status ON flip.schedule_items(property_id, done_at NULLS FIRST, planned_date);
