-- M4: Custos + Documentos + Timeline expandido

-- Tabela de custos
CREATE TABLE IF NOT EXISTS cost_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  cost_type text NOT NULL,           -- 'renovation', 'legal', 'tax', 'other'
  category text,                     -- subcategoria livre
  status text NOT NULL DEFAULT 'planned', -- 'planned', 'paid'
  amount numeric NOT NULL,
  due_date date,                     -- data prevista/pagamento
  vendor text,                       -- fornecedor
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cost_items_property ON cost_items(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_items_workspace ON cost_items(workspace_id);

-- Tabela de documentos
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  cost_item_id uuid REFERENCES cost_items(id) ON DELETE SET NULL,
  
  storage_key text NOT NULL,         -- path no S3/MinIO
  storage_provider text NOT NULL DEFAULT 'minio', -- 'minio', 's3'
  filename text NOT NULL,            -- nome original
  content_type text,                 -- mime type
  size_bytes bigint,                 -- tamanho
  
  tags text[],                       -- tags livres
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_property ON documents(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_workspace ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_cost ON documents(cost_item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_storage_key ON documents(storage_key);


