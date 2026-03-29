DROP INDEX IF EXISTS flip.idx_calculator_leads_unsub_token;

ALTER TABLE flip.calculator_leads
  DROP COLUMN IF EXISTS unsubscribe_token;

DROP INDEX IF EXISTS flip.idx_email_sends_campaign_ebook_lead_unique;
DROP INDEX IF EXISTS flip.idx_email_sends_campaign_calculator_lead_unique;
DROP INDEX IF EXISTS flip.idx_email_sends_calculator_lead;

ALTER TABLE flip.email_sends
  DROP CONSTRAINT IF EXISTS email_sends_recipient_check;

ALTER TABLE flip.email_sends
  ADD CONSTRAINT email_sends_recipient_check
  CHECK (user_id IS NOT NULL OR ebook_lead_id IS NOT NULL);

ALTER TABLE flip.email_sends
  DROP COLUMN IF EXISTS calculator_lead_id;

ALTER TABLE flip.email_campaigns
  DROP CONSTRAINT IF EXISTS email_campaigns_audience_key_check;

ALTER TABLE flip.email_campaigns
  DROP COLUMN IF EXISTS audience_key;
