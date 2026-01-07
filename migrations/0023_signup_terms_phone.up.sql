-- Add phone and terms acceptance fields for signup
ALTER TABLE flip."user" ADD COLUMN phone TEXT;
ALTER TABLE flip."user" ADD COLUMN accepted_terms_at TIMESTAMPTZ;

-- Index for potential phone lookups
CREATE INDEX idx_user_phone ON flip."user"(phone) WHERE phone IS NOT NULL;
