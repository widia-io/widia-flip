ALTER TABLE flip.calculator_leads
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_calculator_leads_marketing_consent
  ON flip.calculator_leads(marketing_consent);
