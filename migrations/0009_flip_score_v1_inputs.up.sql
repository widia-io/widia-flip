-- M9: Flip Score v1 inputs for economics-based scoring
-- Add investment estimate fields to prospecting_properties

ALTER TABLE prospecting_properties
  ADD COLUMN IF NOT EXISTS offer_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS expected_sale_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS renovation_cost_estimate NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS hold_months INT DEFAULT 6,
  ADD COLUMN IF NOT EXISTS other_costs_estimate NUMERIC(12,2);

COMMENT ON COLUMN prospecting_properties.offer_price IS 'User offer price (if null, uses asking_price)';
COMMENT ON COLUMN prospecting_properties.expected_sale_price IS 'Expected sale price / ARV target';
COMMENT ON COLUMN prospecting_properties.renovation_cost_estimate IS 'Estimated renovation budget';
COMMENT ON COLUMN prospecting_properties.hold_months IS 'Expected holding period in months (default 6)';
COMMENT ON COLUMN prospecting_properties.other_costs_estimate IS 'Other estimated costs beyond renovation';
