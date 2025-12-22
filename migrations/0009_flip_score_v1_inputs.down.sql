-- M9: Rollback Flip Score v1 inputs

ALTER TABLE prospecting_properties
  DROP COLUMN IF EXISTS offer_price,
  DROP COLUMN IF EXISTS expected_sale_price,
  DROP COLUMN IF EXISTS renovation_cost_estimate,
  DROP COLUMN IF EXISTS hold_months,
  DROP COLUMN IF EXISTS other_costs_estimate;
