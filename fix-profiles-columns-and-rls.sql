-- ============================================================================
-- FIX PROFILES TABLE: Add Google Token Columns and RLS Policies
-- ============================================================================
-- This script ensures:
-- 1. Google token columns exist in the profiles table
-- 2. Service role (Edge Functions) can always access profiles
-- 3. Authenticated users can insert/update their own profile (for AuthCallback)
-- ============================================================================

-- Step 1: Ensure google token columns exist
-- Note: Using google_token_expiry for backward compatibility with existing code
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMPTZ;

-- Also add the correct column name from schema (google_token_expires_at)
-- Both will exist for transition period
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ;

-- Step 2: Ensure service_role can always access profiles (edge functions need this)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Service role full access to profiles'
  ) THEN
    CREATE POLICY "Service role full access to profiles"
    ON public.profiles FOR ALL TO service_role
    USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Step 3: Ensure authenticated users can update their own profile (needed for AuthCallback)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Step 4: Ensure authenticated users can insert their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Step 5: Ensure authenticated users can select their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT TO authenticated
    USING (auth.uid() = id);
  END IF;
END $$;

-- Step 6: Verify setup (check output manually)
-- Simple policy verification without expression parsing
SELECT 
  policyname, 
  cmd, 
  roles::text[] as roles
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name LIKE 'google%'
ORDER BY column_name;

-- ============================================================================
-- IMPORTANT: After running this SQL, you must:
-- 1. Redeploy all edge functions: npx supabase functions deploy
-- 2. Sign out and sign back in so fresh tokens get saved with the fixed AuthCallback
-- ============================================================================
