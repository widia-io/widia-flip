SET search_path TO flip, public;

UPDATE user_billing
SET tier = 'starter'
WHERE tier = 'free';

ALTER TABLE user_billing
  DROP CONSTRAINT IF EXISTS user_billing_tier_check;

ALTER TABLE user_billing
  ADD CONSTRAINT user_billing_tier_check
  CHECK (tier IN ('starter', 'pro', 'growth'));

COMMENT ON COLUMN user_billing.tier IS 'Current tier: starter, pro, growth';
