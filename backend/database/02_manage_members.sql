-- ================================================================
-- HOMESPLIT / SHARED HOME EXPENSE TRACKER
-- Non-Destructive Migration: Manage Members Feature
-- ================================================================
-- Purpose:
-- 1. Create dedicated members table with status, move-in, and move-out dates.
-- 2. Seed initial 7 active roommates safely (ON CONFLICT DO NOTHING).
-- 3. Seed any historical member names from expenses (ON CONFLICT DO NOTHING).
-- 4. Safely add member_id column to expenses table.
-- 5. Backfill expenses.member_id from members.id.
-- 6. Lock down Supabase Row Level Security (RLS) on members table.
--
-- Safety:
-- STRICTLY NON-DESTRUCTIVE:
-- - No tables or columns are dropped.
-- - No expenses are modified or deleted.
-- - Existing member_name column on expenses remains completely intact.
-- ================================================================

-- Step 1: Create members table
CREATE TABLE IF NOT EXISTS public.members (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' or 'archived'
  move_in_date DATE,
  move_out_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_name ON public.members(name);

-- Step 3: Seed initial household members (7 active members)
INSERT INTO public.members (name, status, move_in_date)
VALUES 
  ('Gunal', 'active', '2024-01-01'),
  ('Gopi', 'active', '2024-01-01'),
  ('Sathish', 'active', '2024-01-01'),
  ('Sekar', 'active', '2024-01-01'),
  ('Vishnu', 'active', '2024-01-01'),
  ('Kumar', 'active', '2024-01-01'),
  ('Hemu', 'active', '2024-01-01')
ON CONFLICT (name) DO NOTHING;

-- Step 4: Ensure any historical member with existing expenses is present in members
INSERT INTO public.members (name, status, move_in_date)
SELECT DISTINCT e.member_name, 'active', '2024-01-01'
FROM public.expenses e
WHERE NOT EXISTS (SELECT 1 FROM public.members m WHERE m.name = e.member_name)
ON CONFLICT (name) DO NOTHING;

-- Step 5: Safely add member_id column to expenses for relational integrity
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS member_id INTEGER REFERENCES public.members(id);

-- Step 6: Backfill member_id for existing expenses
UPDATE public.expenses e
SET member_id = m.id
FROM public.members m
WHERE e.member_name = m.name AND e.member_id IS NULL;

-- Step 7: Index member_id on expenses
CREATE INDEX IF NOT EXISTS idx_expenses_member_id ON public.expenses(member_id);

-- Step 8: Supabase RLS Security Lockdown
-- Enable Row Level Security on members table
ALTER TABLE IF EXISTS public.members ENABLE ROW LEVEL SECURITY;

-- Revoke Data API access from unauthenticated roles (anon, authenticated)
-- Express connects via the postgres role which bypasses RLS
REVOKE ALL ON TABLE public.members FROM anon, authenticated;
