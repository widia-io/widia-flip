-- Rollback: Mover tabelas de volta para schema public

-- Better Auth (0011)
ALTER TABLE flip."user" SET SCHEMA public;
ALTER TABLE flip.session SET SCHEMA public;
ALTER TABLE flip.account SET SCHEMA public;
ALTER TABLE flip.verification SET SCHEMA public;
ALTER TABLE flip.jwks SET SCHEMA public;

-- Billing (0010)
ALTER TABLE flip.user_billing SET SCHEMA public;

-- Negocio (0002-0009)
ALTER TABLE flip.documents SET SCHEMA public;
ALTER TABLE flip.cost_items SET SCHEMA public;
ALTER TABLE flip.analysis_financing_snapshots SET SCHEMA public;
ALTER TABLE flip.financing_payments SET SCHEMA public;
ALTER TABLE flip.financing_plans SET SCHEMA public;
ALTER TABLE flip.timeline_events SET SCHEMA public;
ALTER TABLE flip.analysis_cash_snapshots SET SCHEMA public;
ALTER TABLE flip.analysis_cash_inputs SET SCHEMA public;
ALTER TABLE flip.properties SET SCHEMA public;
ALTER TABLE flip.prospecting_properties SET SCHEMA public;

-- Infraestrutura (0001_base)
ALTER TABLE flip.workspace_settings SET SCHEMA public;
ALTER TABLE flip.workspace_memberships SET SCHEMA public;
ALTER TABLE flip.workspaces SET SCHEMA public;

-- Remover schema flip (vazio agora)
DROP SCHEMA IF EXISTS flip;
