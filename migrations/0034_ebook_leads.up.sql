CREATE TABLE flip.ebook_leads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL,
  ebook_slug TEXT NOT NULL,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ebook_leads_email_slug ON flip.ebook_leads(email, ebook_slug);
CREATE INDEX idx_ebook_leads_created_at ON flip.ebook_leads(created_at DESC);
