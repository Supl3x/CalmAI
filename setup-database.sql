-- CalmAI Database Setup Script
-- Run this in your Supabase SQL Editor to apply all fixes

-- ============================================
-- 1. Create API Cache Table
-- ============================================
CREATE TABLE IF NOT EXISTS api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_user_id ON api_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_api_cache_cached_at ON api_cache(cached_at);

ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read their own cache"
  ON api_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Service role can manage all cache"
  ON api_cache FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 2. Add Sync Tracking Columns to Profiles
-- ============================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_gmail_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_calendar_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_drive_sync TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_last_gmail_sync ON profiles(last_gmail_sync);
CREATE INDEX IF NOT EXISTS idx_profiles_last_calendar_sync ON profiles(last_calendar_sync);

-- ============================================
-- 3. Create Cache Cleanup Function
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM api_cache
  WHERE cached_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Verification Queries
-- ============================================

-- Check that api_cache table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'api_cache'
  ) THEN
    RAISE NOTICE '✓ api_cache table created successfully';
  ELSE
    RAISE EXCEPTION '✗ api_cache table not found';
  END IF;
END $$;

-- Check that profile columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name = 'last_gmail_sync'
  ) THEN
    RAISE NOTICE '✓ Sync tracking columns added successfully';
  ELSE
    RAISE EXCEPTION '✗ Sync tracking columns not found';
  END IF;
END $$;

-- Show current cache status
SELECT 
  COUNT(*) as total_cache_entries,
  COUNT(DISTINCT user_id) as users_with_cache,
  MAX(cached_at) as most_recent_cache
FROM api_cache;

-- Show profiles with sync data
SELECT 
  COUNT(*) as total_profiles,
  COUNT(last_gmail_sync) as profiles_with_gmail_sync,
  COUNT(last_calendar_sync) as profiles_with_calendar_sync
FROM profiles;

-- ============================================
-- Setup Complete!
-- ============================================
-- Next steps:
-- 1. Deploy Edge Functions: supabase functions deploy
-- 2. Set Edge Function Secrets in Supabase Dashboard
-- 3. Deploy frontend to Vercel
-- 4. Test authentication and data fetching
