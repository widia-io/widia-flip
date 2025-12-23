-- M10: User Billing table for Stripe integration
-- Subscription is PER USER (not per workspace)
-- Limits on workspaces are per user; usage limits are per workspace per billing period

CREATE TABLE IF NOT EXISTS user_billing (
  user_id TEXT PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter', 'pro', 'growth')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN (
    'active', 'trialing', 'canceled', 'past_due', 'unpaid',
    'incomplete', 'incomplete_expired'
  )),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_billing_stripe_customer_idx
  ON user_billing (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_billing_status_idx
  ON user_billing (status);

COMMENT ON TABLE user_billing IS 'Per-user billing state from Stripe subscriptions';
COMMENT ON COLUMN user_billing.user_id IS 'Better Auth user ID (primary key)';
COMMENT ON COLUMN user_billing.tier IS 'Current tier: starter, pro, growth';
COMMENT ON COLUMN user_billing.status IS 'Stripe subscription status';
COMMENT ON COLUMN user_billing.trial_end IS 'Trial end timestamp (14-day free trial)';
