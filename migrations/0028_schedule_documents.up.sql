-- Add schedule_item_id to documents table (similar to cost_item_id, supplier_id)
ALTER TABLE flip.documents
  ADD COLUMN schedule_item_id uuid REFERENCES flip.schedule_items(id) ON DELETE SET NULL;

CREATE INDEX idx_documents_schedule ON flip.documents(schedule_item_id) WHERE schedule_item_id IS NOT NULL;
