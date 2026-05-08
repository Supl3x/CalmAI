-- =====================================================
-- FIX RLS POLICIES FOR USER_PROFILES AND USER_SETTINGS
-- =====================================================
-- Run this in Supabase SQL Editor if signup still fails

-- First, check current policies
SELECT 
  tablename, 
  policyname, 
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'user_settings')
ORDER BY tablename, cmd;

-- =====================================================
-- DROP EXISTING POLICIES (if they're causing issues)
-- =====================================================

-- User profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- User settings policies
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;

-- =====================================================
-- CREATE NEW POLICIES (more permissive for authenticated users)
-- =====================================================

-- USER_PROFILES POLICIES
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- USER_SETTINGS POLICIES
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- VERIFY POLICIES WERE CREATED
-- =====================================================

SELECT 
  tablename, 
  policyname, 
  cmd,
  roles
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'user_settings')
ORDER BY tablename, cmd;

-- =====================================================
-- TEST QUERIES (run these after signup to verify)
-- =====================================================

-- Check if your user profile exists
-- Replace 'your-email@example.com' with your actual email
SELECT * FROM user_profiles WHERE email = 'your-email@example.com';

-- Check if your user settings exist
SELECT us.* 
FROM user_settings us
JOIN user_profiles up ON us.user_id = up.id
WHERE up.email = 'your-email@example.com';

-- Check if trigger is working
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
