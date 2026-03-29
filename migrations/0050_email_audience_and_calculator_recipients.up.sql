ALTER TABLE flip.email_campaigns
  ADD COLUMN IF NOT EXISTS audience_key TEXT NOT NULL DEFAULT 'all_eligible';

ALTER TABLE flip.email_campaigns
  DROP CONSTRAINT IF EXISTS email_campaigns_audience_key_check;

ALTER TABLE flip.email_campaigns
  ADD CONSTRAINT email_campaigns_audience_key_check
  CHECK (audience_key IN ('all_eligible', 'trial_expired_engaged', 'calculator_leads_hot'));

ALTER TABLE flip.email_sends
  ADD COLUMN IF NOT EXISTS calculator_lead_id TEXT REFERENCES flip.calculator_leads(id) ON DELETE CASCADE;

ALTER TABLE flip.email_sends
  DROP CONSTRAINT IF EXISTS email_sends_recipient_check;

ALTER TABLE flip.email_sends
  ADD CONSTRAINT email_sends_recipient_check
  CHECK (
    user_id IS NOT NULL
    OR ebook_lead_id IS NOT NULL
    OR calculator_lead_id IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_email_sends_calculator_lead
  ON flip.email_sends(calculator_lead_id)
  WHERE calculator_lead_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sends_campaign_ebook_lead_unique
  ON flip.email_sends(campaign_id, ebook_lead_id)
  WHERE ebook_lead_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sends_campaign_calculator_lead_unique
  ON flip.email_sends(campaign_id, calculator_lead_id)
  WHERE calculator_lead_id IS NOT NULL;

ALTER TABLE flip.calculator_leads
  ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_calculator_leads_unsub_token
  ON flip.calculator_leads(unsubscribe_token)
  WHERE unsubscribe_token IS NOT NULL;
