-- =====================================================
-- CalmFlow AI / NEXUS - Google OAuth Functions
-- =====================================================
-- Description: Functions for managing Google OAuth tokens
-- =====================================================

-- =====================================================
-- 1. STORE GOOGLE TOKENS
-- =====================================================
-- Stores or updates Google OAuth tokens for a user

CREATE OR REPLACE FUNCTION public.store_google_tokens(
  p_user_id UUID,
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_profiles
  SET 
    google_access_token = p_access_token,
    google_refresh_token = p_refresh_token,
    google_token_expires_at = p_expires_at,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log the token update
  INSERT INTO public.activity_log (user_id, action_type, action_category, description)
  VALUES (
    p_user_id,
    'token_updated',
    'auth',
    'Google OAuth tokens updated'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.store_google_tokens(UUID, TEXT, TEXT, TIMESTAMPTZ) IS 'Stores or updates Google OAuth tokens';

-- =====================================================
-- 2. GET GOOGLE ACCESS TOKEN
-- =====================================================
-- Retrieves the current Google access token for a user

CREATE OR REPLACE FUNCTION public.get_google_access_token(p_user_id UUID)
RETURNS TABLE (
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    google_access_token,
    google_refresh_token,
    google_token_expires_at,
    (google_token_expires_at < NOW()) AS is_expired
  FROM public.user_profiles
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_google_access_token(UUID) IS 'Retrieves Google access token and checks if expired';

-- =====================================================
-- 3. REVOKE GOOGLE ACCESS
-- =====================================================
-- Removes Google OAuth tokens (when user disconnects)

CREATE OR REPLACE FUNCTION public.revoke_google_access(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_profiles
  SET 
    google_access_token = NULL,
    google_refresh_token = NULL,
    google_token_expires_at = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Update sync status to paused
  UPDATE public.gmail_sync_status SET sync_status = 'paused' WHERE user_id = p_user_id;
  UPDATE public.calendar_sync_status SET sync_status = 'paused' WHERE user_id = p_user_id;
  UPDATE public.drive_sync_status SET sync_status = 'paused' WHERE user_id = p_user_id;
  
  -- Log the revocation
  INSERT INTO public.activity_log (user_id, action_type, action_category, description)
  VALUES (
    p_user_id,
    'google_disconnected',
    'auth',
    'Google OAuth access revoked'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.revoke_google_access(UUID) IS 'Removes Google OAuth tokens and pauses sync';

-- =====================================================
-- 4. CHECK TOKEN EXPIRY
-- =====================================================
-- Checks if any user tokens are about to expire (for background job)

CREATE OR REPLACE FUNCTION public.get_expiring_tokens(p_minutes_before INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  expires_at TIMESTAMPTZ,
  minutes_until_expiry INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    email,
    google_token_expires_at,
    EXTRACT(EPOCH FROM (google_token_expires_at - NOW())) / 60 AS minutes_until_expiry
  FROM public.user_profiles
  WHERE google_token_expires_at IS NOT NULL
    AND google_token_expires_at > NOW()
    AND google_token_expires_at < NOW() + (p_minutes_before || ' minutes')::INTERVAL
    AND deleted_at IS NULL
  ORDER BY google_token_expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_expiring_tokens(INTEGER) IS 'Returns users whose tokens are about to expire';
