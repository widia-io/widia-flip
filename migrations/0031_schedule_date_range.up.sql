-- Convert schedule_items from single planned_date to date range (start_date, end_date)
-- Required for Gantt chart visualization

-- Rename planned_date to start_date
ALTER TABLE flip.schedule_items RENAME COLUMN planned_date TO start_date;

-- Add end_date column
ALTER TABLE flip.schedule_items ADD COLUMN end_date date;

-- Populate end_date from existing start_date (single-day items)
UPDATE flip.schedule_items SET end_date = start_date WHERE end_date IS NULL;

-- Make end_date NOT NULL
ALTER TABLE flip.schedule_items ALTER COLUMN end_date SET NOT NULL;

-- Add constraint to ensure end_date >= start_date
ALTER TABLE flip.schedule_items ADD CONSTRAINT chk_schedule_dates CHECK (end_date >= start_date);

-- Recreate indexes for new column names
DROP INDEX IF EXISTS flip.idx_schedule_items_property;
DROP INDEX IF EXISTS flip.idx_schedule_items_status;

CREATE INDEX idx_schedule_items_property ON flip.schedule_items(property_id, start_date);
CREATE INDEX idx_schedule_items_status ON flip.schedule_items(property_id, done_at NULLS FIRST, start_date);
CREATE INDEX idx_schedule_items_date_range ON flip.schedule_items(property_id, start_date, end_date);
