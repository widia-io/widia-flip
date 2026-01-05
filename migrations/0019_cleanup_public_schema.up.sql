-- Cleanup: Remove duplicate tables from public schema
-- All app tables should live in flip schema only
-- schema_migrations stays in public (required by migrate tool)

-- Drop public schema tables (empty duplicates)
DROP TABLE IF EXISTS public.workspace_memberships CASCADE;
DROP TABLE IF EXISTS public.workspace_settings CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.prospecting_properties CASCADE;
DROP TABLE IF EXISTS public.properties CASCADE;
DROP TABLE IF EXISTS public.analysis_cash_inputs CASCADE;
DROP TABLE IF EXISTS public.analysis_cash_snapshots CASCADE;
DROP TABLE IF EXISTS public.analysis_financing_snapshots CASCADE;
DROP TABLE IF EXISTS public.timeline_events CASCADE;
DROP TABLE IF EXISTS public.financing_plans CASCADE;
DROP TABLE IF EXISTS public.financing_payments CASCADE;
DROP TABLE IF EXISTS public.cost_items CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.user_billing CASCADE;

-- Better Auth tables (also duplicated in public)
DROP TABLE IF EXISTS public.session CASCADE;
DROP TABLE IF EXISTS public.account CASCADE;
DROP TABLE IF EXISTS public.verification CASCADE;
DROP TABLE IF EXISTS public.jwks CASCADE;
DROP TABLE IF EXISTS public."user" CASCADE;

-- Fix: 0018 added columns to wrong schema, ensure they exist in flip
ALTER TABLE flip."user" ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE flip."user" ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Recreate index in correct schema
DROP INDEX IF EXISTS public.idx_user_is_admin;
CREATE INDEX IF NOT EXISTS idx_user_is_admin ON flip."user" (is_admin) WHERE is_admin = true;
