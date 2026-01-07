-- Final cleanup: Remove ALL duplicate tables from public schema
-- All app tables live in flip schema only
-- schema_migrations stays in public (required by migrate tool)

DROP TABLE IF EXISTS public.suppliers CASCADE;
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
DROP TABLE IF EXISTS public.session CASCADE;
DROP TABLE IF EXISTS public.account CASCADE;
DROP TABLE IF EXISTS public.verification CASCADE;
DROP TABLE IF EXISTS public.jwks CASCADE;
DROP TABLE IF EXISTS public."user" CASCADE;
