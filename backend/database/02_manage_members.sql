-- ================================================================
-- HOMESPLIT / SHARED HOME EXPENSE TRACKER
-- Non-Destructive Migration: Manage Members Feature (Resilient)
-- ================================================================
-- Purpose:
-- 1. Create dedicated members table with status, move-in, and move-out dates.
-- 2. Safely ensure all columns exist even on pre-existing tables.
-- 3. Seed initial 7 active roommates idempotently (WHERE NOT EXISTS).
-- 4. Seed any historical member names from expenses (WHERE NOT EXISTS).
-- 5. Safely add member_id column to expenses table.
-- 6. Backfill expenses.member_id from members.id.
-- 7. Lock down Supabase Row Level Security (RLS) on members table.
--
-- Safety:
-- STRICTLY NON-DESTRUCTIVE:
-- - No tables or columns are dropped.
-- - No expenses are modified or deleted.
-- - Existing member_name column on expenses remains completely intact.
-- - Idempotent statements safe to run repeatedly.
-- ================================================================

-- Step 1: Create members table
CREATE TABLE IF NOT EXISTS public.members (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' or 'archived'
  move_in_date DATE,
  move_out_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Ensure required columns exist
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS move_in_date DATE;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS move_out_date DATE;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Step 3: Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_name ON public.members(name);

-- Step 4: Seed initial household members (7 active members) safely without constraint dependencies
INSERT INTO public.members (name, status, move_in_date)
SELECT n.name, 'active', '2024-01-01'::DATE
FROM (VALUES 
  ('Gunal'), ('Gopi'), ('Sathish'), ('Sekar'), ('Vishnu'), ('Kumar'), ('Hemu')
) AS n(name)
WHERE NOT EXISTS (SELECT 1 FROM public.members m WHERE LOWER(m.name) = LOWER(n.name));

-- Step 5: Ensure any historical member with existing expenses is present in members
INSERT INTO public.members (name, status, move_in_date)
SELECT DISTINCT e.member_name, 'active', '2024-01-01'::DATE
FROM public.expenses e
WHERE e.member_name IS NOT NULL 
  AND TRIM(e.member_name) != ''
  AND NOT EXISTS (SELECT 1 FROM public.members m WHERE LOWER(m.name) = LOWER(e.member_name));

-- Step 6: Safely add member_id column to expenses for relational integrity
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS member_id INTEGER;

-- Step 7: Backfill member_id for existing expenses
UPDATE public.expenses e
SET member_id = m.id
FROM public.members m
WHERE LOWER(e.member_name) = LOWER(m.name) AND e.member_id IS NULL;

-- Step 8: Index member_id on expenses
CREATE INDEX IF NOT EXISTS idx_expenses_member_id ON public.expenses(member_id);

-- Step 9: Supabase RLS Security Lockdown
-- Enable Row Level Security on members table
ALTER TABLE IF EXISTS public.members ENABLE ROW LEVEL SECURITY;

-- Revoke Data API access from unauthenticated roles (anon, authenticated)
-- Express connects via the postgres role which bypasses RLS
REVOKE ALL ON TABLE public.members FROM anon, authenticated;
