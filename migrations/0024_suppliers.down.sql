-- Rollback Suppliers

DROP INDEX IF EXISTS flip.idx_documents_supplier;
ALTER TABLE flip.documents DROP COLUMN IF EXISTS supplier_id;

DROP INDEX IF EXISTS flip.idx_suppliers_name;
DROP INDEX IF EXISTS flip.idx_suppliers_category;
DROP INDEX IF EXISTS flip.idx_suppliers_workspace;
DROP TABLE IF EXISTS flip.suppliers;
