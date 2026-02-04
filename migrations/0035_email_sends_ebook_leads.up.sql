-- Allow email_sends to reference ebook leads (not just registered users)
ALTER TABLE flip.email_sends ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE flip.email_sends ADD COLUMN ebook_lead_id TEXT REFERENCES flip.ebook_leads(id) ON DELETE CASCADE;

-- Ensure at least one recipient reference is set
ALTER TABLE flip.email_sends ADD CONSTRAINT email_sends_recipient_check
  CHECK (user_id IS NOT NULL OR ebook_lead_id IS NOT NULL);

CREATE INDEX idx_email_sends_ebook_lead ON flip.email_sends(ebook_lead_id) WHERE ebook_lead_id IS NOT NULL;

-- Add unsubscribe_token to ebook_leads for marketing emails
ALTER TABLE flip.ebook_leads ADD COLUMN unsubscribe_token TEXT;
CREATE UNIQUE INDEX idx_ebook_leads_unsub_token ON flip.ebook_leads(unsubscribe_token) WHERE unsubscribe_token IS NOT NULL;
