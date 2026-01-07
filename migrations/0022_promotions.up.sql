-- Promotions table for banner and discount management
CREATE TABLE flip.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  banner_text TEXT NOT NULL,
  banner_emoji VARCHAR(10) DEFAULT '🎉',
  stripe_coupon_id VARCHAR(100),
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup of active promotions
CREATE INDEX idx_promotions_active ON flip.promotions (is_active, ends_at) WHERE is_active = true;

-- Trigger to update updated_at
CREATE TRIGGER promotions_updated_at
  BEFORE UPDATE ON flip.promotions
  FOR EACH ROW
  EXECUTE FUNCTION flip.update_updated_at_column();
