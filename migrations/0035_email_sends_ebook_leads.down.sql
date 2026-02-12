DROP INDEX IF EXISTS flip.idx_ebook_leads_unsub_token;
ALTER TABLE flip.ebook_leads DROP COLUMN IF EXISTS unsubscribe_token;

DROP INDEX IF EXISTS flip.idx_email_sends_ebook_lead;
ALTER TABLE flip.email_sends DROP CONSTRAINT IF EXISTS email_sends_recipient_check;
ALTER TABLE flip.email_sends DROP COLUMN IF EXISTS ebook_lead_id;

DELETE FROM flip.email_sends WHERE user_id IS NULL;
ALTER TABLE flip.email_sends ALTER COLUMN user_id SET NOT NULL;
