ALTER TABLE flip.ebook_leads ADD COLUMN converted_at TIMESTAMPTZ;
ALTER TABLE flip.ebook_leads ADD COLUMN converted_user_id TEXT;
CREATE INDEX idx_ebook_leads_converted ON flip.ebook_leads(converted_at) WHERE converted_at IS NOT NULL;
