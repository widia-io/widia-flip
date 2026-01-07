-- Fornecedores (Suppliers) - workspace-level vendor management

CREATE TABLE IF NOT EXISTS flip.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES flip.workspaces(id) ON DELETE CASCADE,

  name text NOT NULL,
  phone text,
  email text,
  category text NOT NULL,  -- pintura, eletrica, hidraulica, arquitetura, engenharia, marcenaria, gesso, piso, serralheria, limpeza, corretor, advogado, despachante, outro
  notes text,
  rating smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  hourly_rate numeric,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_workspace ON flip.suppliers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON flip.suppliers(workspace_id, category);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON flip.suppliers(workspace_id, name);

-- Link documents to suppliers for portfolio photos
ALTER TABLE flip.documents ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES flip.suppliers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_supplier ON flip.documents(supplier_id);
