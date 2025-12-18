-- M1: Prospecção + Quick Add
-- Tables: prospecting_properties, properties

CREATE TABLE IF NOT EXISTS prospecting_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  status text NOT NULL DEFAULT 'active',
  link text,
  neighborhood text,
  address text,
  
  area_usable numeric,
  bedrooms integer,
  suites integer,
  bathrooms integer,
  
  gas text,
  floor integer,
  elevator boolean,
  face text,
  parking integer,
  
  condo_fee numeric,
  asking_price numeric,
  
  agency text,
  broker_name text,
  broker_phone text,
  
  comments text,
  tags text[],
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  origin_prospect_id uuid REFERENCES prospecting_properties(id) ON DELETE SET NULL,
  
  status_pipeline text NOT NULL DEFAULT 'analyzing',
  neighborhood text,
  address text,
  area_usable numeric,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for tenant isolation and common queries
CREATE INDEX IF NOT EXISTS idx_prospecting_properties_workspace_status 
  ON prospecting_properties(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_prospecting_properties_workspace_created 
  ON prospecting_properties(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_properties_workspace_status 
  ON properties(workspace_id, status_pipeline);

CREATE INDEX IF NOT EXISTS idx_properties_workspace_created 
  ON properties(workspace_id, created_at DESC);
