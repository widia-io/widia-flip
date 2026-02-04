DROP INDEX IF EXISTS flip.idx_ebook_leads_converted;
ALTER TABLE flip.ebook_leads DROP COLUMN IF EXISTS converted_user_id;
ALTER TABLE flip.ebook_leads DROP COLUMN IF EXISTS converted_at;
