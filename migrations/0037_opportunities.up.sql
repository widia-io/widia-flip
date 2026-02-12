-- Tabelas para POC de oportunidades (global, sem workspace_id)

-- Usar schema flip
SET search_path TO flip, public;

-- source_listings: dados brutos coletados do ZAP
CREATE TABLE source_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,
  source_listing_id VARCHAR(255) NOT NULL,
  canonical_url TEXT NOT NULL,

  -- dados do imóvel
  title TEXT,
  description TEXT,
  price_cents BIGINT,
  area_m2 NUMERIC(10,2),
  bedrooms INT,
  bathrooms INT,
  parking_spots INT,
  condo_fee_cents BIGINT,
  iptu_cents BIGINT,

  -- localização
  city VARCHAR(255),
  neighborhood VARCHAR(255),
  state VARCHAR(2),
  address TEXT,

  -- imagens
  images JSONB DEFAULT '[]',

  -- metadados
  price_history JSONB DEFAULT '[]',
  raw_data JSONB,

  -- timestamps
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  listing_published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(source, source_listing_id)
);

-- opportunities: score calculado
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_listing_id UUID NOT NULL REFERENCES source_listings(id) ON DELETE CASCADE,

  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  score_breakdown JSONB NOT NULL,
  price_per_m2 NUMERIC(10,2),
  market_median_m2 NUMERIC(10,2),
  discount_pct NUMERIC(5,4),

  status VARCHAR(50) DEFAULT 'new',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(source_listing_id)
);

-- job_runs: log de execuções do scraper
CREATE TABLE opportunity_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,

  status VARCHAR(50) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL,
  triggered_by VARCHAR(255),

  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,

  params JSONB,
  stats JSONB,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- índices
CREATE INDEX idx_opportunities_score ON opportunities(score DESC, created_at DESC);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_source_listings_location ON source_listings(city, neighborhood);
CREATE INDEX idx_source_listings_last_seen ON source_listings(last_seen_at);
CREATE INDEX idx_source_listings_source ON source_listings(source, source_listing_id);
CREATE INDEX idx_opportunity_job_runs_job_name ON opportunity_job_runs(job_name, created_at DESC);
