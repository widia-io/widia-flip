DROP INDEX IF EXISTS idx_calculator_leads_marketing_consent;

ALTER TABLE flip.calculator_leads
DROP COLUMN IF EXISTS marketing_consent;
