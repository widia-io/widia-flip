-- Email Marketing MVP (LGPD-compliant)

-- Add marketing consent fields to user table
ALTER TABLE flip."user"
  ADD COLUMN IF NOT EXISTS marketing_opt_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketing_opt_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT UNIQUE;

-- Index for finding eligible recipients efficiently
CREATE INDEX IF NOT EXISTS idx_user_marketing_eligible
  ON flip."user" ("emailVerified", is_active)
  WHERE marketing_opt_in_at IS NOT NULL
    AND marketing_opt_out_at IS NULL;

-- Email campaigns table
CREATE TABLE IF NOT EXISTS flip.email_campaigns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'queued', 'sending', 'sent')),
  created_by TEXT NOT NULL REFERENCES flip."user"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  queued_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER DEFAULT 0
);

-- Index for listing campaigns
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at
  ON flip.email_campaigns(created_at DESC);

-- Email sends table (individual recipient tracking)
CREATE TABLE IF NOT EXISTS flip.email_sends (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id TEXT NOT NULL REFERENCES flip.email_campaigns(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES flip."user"(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);

-- Index for processing queued sends
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_status
  ON flip.email_sends(campaign_id, status);

-- Index for checking send status by user
CREATE INDEX IF NOT EXISTS idx_email_sends_user
  ON flip.email_sends(user_id);
