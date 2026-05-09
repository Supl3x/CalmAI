-- ============================================================
-- SCHEMA VERIFICATION SCRIPT
-- Run this AFTER applying fix-profiles-columns-and-rls.sql
-- ============================================================

-- 1. Check profiles table has all required columns
SELECT 'profiles columns' as check_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check drafts table has correct columns
SELECT 'drafts columns' as check_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'drafts'
ORDER BY ordinal_position;

-- 3. Check api_cache table exists
SELECT 'api_cache exists' as check_name, 
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = 'api_cache'
       ) THEN 'YES ✓' ELSE 'NO ✗' END as result;

-- 4. Check open_loops has scheduled_date
SELECT 'open_loops.scheduled_date' as check_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'open_loops' 
         AND column_name = 'scheduled_date'
       ) THEN 'YES ✓' ELSE 'NO ✗' END as result;

-- 5. Check all tables exist
SELECT 'all tables' as check_name, table_name 
FROM information_schema.tables
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 6. Check RLS is enabled on all tables
SELECT 'RLS status' as check_name, tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 7. Check critical indexes exist
SELECT 'indexes' as check_name, indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
