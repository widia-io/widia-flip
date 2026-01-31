-- Email Events (Webhook tracking from Resend)

-- Add resend_email_id to email_sends for correlating webhook events
ALTER TABLE flip.email_sends
  ADD COLUMN IF NOT EXISTS resend_email_id TEXT;

CREATE INDEX IF NOT EXISTS idx_email_sends_resend_id
  ON flip.email_sends(resend_email_id);

-- Email events table (stores webhook events from Resend)
CREATE TABLE IF NOT EXISTS flip.email_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email_id TEXT NOT NULL,  -- Resend email_id from webhook
  campaign_id TEXT REFERENCES flip.email_campaigns(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- sent, delivered, opened, clicked, bounced, complained
  recipient_email TEXT NOT NULL,
  payload JSONB,  -- Full webhook payload for debugging
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_campaign
  ON flip.email_events(campaign_id);

CREATE INDEX IF NOT EXISTS idx_email_events_type
  ON flip.email_events(event_type);

CREATE INDEX IF NOT EXISTS idx_email_events_email_id
  ON flip.email_events(email_id);
