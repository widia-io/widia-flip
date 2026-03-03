-- Market Data: aliases de bairro para revisão e aprovação manual
SET search_path TO flip, public;

CREATE TABLE IF NOT EXISTS market_region_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  alias_raw TEXT NULL,
  alias_normalized TEXT NOT NULL,
  canonical_name TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  suggested_canonical TEXT NULL,
  suggested_confidence DOUBLE PRECISION NULL,
  occurrences INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_market_region_aliases_status CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT chk_market_region_aliases_approved_canonical CHECK (
    status <> 'approved' OR canonical_name IS NOT NULL
  ),
  CONSTRAINT chk_market_region_aliases_confidence CHECK (
    suggested_confidence IS NULL OR (suggested_confidence >= 0 AND suggested_confidence <= 1)
  ),
  UNIQUE (city, alias_normalized)
);

CREATE INDEX IF NOT EXISTS idx_market_region_aliases_city_status_last_seen
  ON market_region_aliases (city, status, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_region_aliases_status_updated
  ON market_region_aliases (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_region_aliases_city_occurrences
  ON market_region_aliases (city, occurrences DESC);
