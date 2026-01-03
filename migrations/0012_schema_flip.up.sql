-- Migration: Mover todas as tabelas para schema flip
-- Permite multiplos projetos no mesmo Supabase

-- 1. Criar schema flip
CREATE SCHEMA IF NOT EXISTS flip;

-- 2. Mover tabelas de infraestrutura (0001_base)
ALTER TABLE workspaces SET SCHEMA flip;
ALTER TABLE workspace_memberships SET SCHEMA flip;
ALTER TABLE workspace_settings SET SCHEMA flip;

-- 3. Mover tabelas de negocio (0002-0009)
ALTER TABLE prospecting_properties SET SCHEMA flip;
ALTER TABLE properties SET SCHEMA flip;
ALTER TABLE analysis_cash_inputs SET SCHEMA flip;
ALTER TABLE analysis_cash_snapshots SET SCHEMA flip;
ALTER TABLE timeline_events SET SCHEMA flip;
ALTER TABLE financing_plans SET SCHEMA flip;
ALTER TABLE financing_payments SET SCHEMA flip;
ALTER TABLE analysis_financing_snapshots SET SCHEMA flip;
ALTER TABLE cost_items SET SCHEMA flip;
ALTER TABLE documents SET SCHEMA flip;

-- 4. Mover tabela de billing (0010)
ALTER TABLE user_billing SET SCHEMA flip;

-- 5. Mover tabelas do Better Auth (0011)
ALTER TABLE "user" SET SCHEMA flip;
ALTER TABLE session SET SCHEMA flip;
ALTER TABLE account SET SCHEMA flip;
ALTER TABLE verification SET SCHEMA flip;
ALTER TABLE jwks SET SCHEMA flip;

-- NOTA: schema_migrations permanece em public (migrate precisa dela)
