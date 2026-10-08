-- ================================================================
-- HOMESPLIT / SHARED HOME EXPENSE TRACKER
-- Supabase Security Advisor Remediation Migration
-- Issue: rls_disabled_in_public
-- ================================================================
-- Purpose:
-- 1. Enable Row Level Security (RLS) on all public tables.
-- 2. Revoke Data API access (anon, authenticated) to prevent
--    unauthorized external access via PostgREST.
-- 3. Preserve 100% functionality for HomeSplit backend (pg/postgres role).
-- 4. Eliminate the Supabase "rls_disabled_in_public" critical advisor warning.
--
-- Safety:
-- This script does NOT delete, alter, or recreate any data or schema columns.
-- Existing expenses, settings, and push subscriptions remain completely intact.
-- ================================================================

-- Step 1: Enable Row Level Security on all application tables in public schema
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Step 2: Revoke PostgREST Data API permissions from public/unauthenticated roles
-- HomeSplit does NOT use the Supabase Data API (architecture is Browser -> Express -> PostgreSQL).
-- Therefore, anon and authenticated roles must NOT have access to these tables.
REVOKE ALL ON TABLE public.expenses FROM anon, authenticated;
REVOKE ALL ON TABLE public.settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.push_subscriptions FROM anon, authenticated;

-- Step 3: Prevent future tables in public schema from auto-granting to anon/authenticated
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- ================================================================
-- Verification Queries (Safe Read-Only Inspection)
-- ================================================================
-- Check RLS status (rowsecurity should now be true for all 3 tables):
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('expenses', 'settings', 'push_subscriptions');

-- Check table permissions (anon and authenticated should have NO rows):
-- SELECT grantee, table_name, privilege_type 
-- FROM information_schema.role_table_grants 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('expenses', 'settings', 'push_subscriptions')
--   AND grantee IN ('anon', 'authenticated', 'postgres');
