DROP INDEX IF EXISTS flip.idx_documents_schedule;
ALTER TABLE flip.documents DROP COLUMN IF EXISTS schedule_item_id;
