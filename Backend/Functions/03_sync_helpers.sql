-- =====================================================
-- CalmFlow AI / NEXUS - Sync Helper Functions
-- =====================================================
-- Description: Functions to help with Gmail, Calendar, and Drive sync
-- =====================================================

-- =====================================================
-- 1. UPDATE GMAIL SYNC STATUS
-- =====================================================
-- Updates Gmail sync status after a sync operation

CREATE OR REPLACE FUNCTION public.update_gmail_sync_status(
  p_user_id UUID,
  p_status TEXT,
  p_message_count INTEGER DEFAULT 0,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.gmail_sync_status (
    user_id,
    last_sync_at,
    sync_status,
    last_sync_message_count,
    total_messages_synced,
    last_error,
    error_count,
    last_error_at
  )
  VALUES (
    p_user_id,
    NOW(),
    p_status,
    p_message_count,
    p_message_count,
    p_error,
    CASE WHEN p_error IS NOT NULL THEN 1 ELSE 0 END,
    CASE WHEN p_error IS NOT NULL THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_sync_at = NOW(),
    sync_status = p_status,
    last_sync_message_count = p_message_count,
    total_messages_synced = gmail_sync_status.total_messages_synced + p_message_count,
    last_error = p_error,
    error_count = CASE 
      WHEN p_error IS NOT NULL THEN gmail_sync_status.error_count + 1 
      ELSE 0 
    END,
    last_error_at = CASE WHEN p_error IS NOT NULL THEN NOW() ELSE gmail_sync_status.last_error_at END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_gmail_sync_status(UUID, TEXT, INTEGER, TEXT) IS 'Updates Gmail sync status';

-- =====================================================
-- 2. UPDATE CALENDAR SYNC STATUS
-- =====================================================
-- Updates Calendar sync status after a sync operation

CREATE OR REPLACE FUNCTION public.update_calendar_sync_status(
  p_user_id UUID,
  p_calendar_id UUID,
  p_status TEXT,
  p_event_count INTEGER DEFAULT 0,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.calendar_sync_status (
    user_id,
    calendar_id,
    last_sync_at,
    sync_status,
    last_sync_event_count,
    total_events_synced,
    last_error,
    error_count,
    last_error_at
  )
  VALUES (
    p_user_id,
    p_calendar_id,
    NOW(),
    p_status,
    p_event_count,
    p_event_count,
    p_error,
    CASE WHEN p_error IS NOT NULL THEN 1 ELSE 0 END,
    CASE WHEN p_error IS NOT NULL THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, calendar_id) DO UPDATE SET
    last_sync_at = NOW(),
    sync_status = p_status,
    last_sync_event_count = p_event_count,
    total_events_synced = calendar_sync_status.total_events_synced + p_event_count,
    last_error = p_error,
    error_count = CASE 
      WHEN p_error IS NOT NULL THEN calendar_sync_status.error_count + 1 
      ELSE 0 
    END,
    last_error_at = CASE WHEN p_error IS NOT NULL THEN NOW() ELSE calendar_sync_status.last_error_at END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_calendar_sync_status(UUID, UUID, TEXT, INTEGER, TEXT) IS 'Updates Calendar sync status';

-- =====================================================
-- 3. UPDATE DRIVE SYNC STATUS
-- =====================================================
-- Updates Drive sync status after a sync operation

CREATE OR REPLACE FUNCTION public.update_drive_sync_status(
  p_user_id UUID,
  p_status TEXT,
  p_file_count INTEGER DEFAULT 0,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.drive_sync_status (
    user_id,
    last_sync_at,
    sync_status,
    last_sync_file_count,
    total_files_synced,
    last_error,
    error_count,
    last_error_at
  )
  VALUES (
    p_user_id,
    NOW(),
    p_status,
    p_file_count,
    p_file_count,
    p_error,
    CASE WHEN p_error IS NOT NULL THEN 1 ELSE 0 END,
    CASE WHEN p_error IS NOT NULL THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_sync_at = NOW(),
    sync_status = p_status,
    last_sync_file_count = p_file_count,
    total_files_synced = drive_sync_status.total_files_synced + p_file_count,
    last_error = p_error,
    error_count = CASE 
      WHEN p_error IS NOT NULL THEN drive_sync_status.error_count + 1 
      ELSE 0 
    END,
    last_error_at = CASE WHEN p_error IS NOT NULL THEN NOW() ELSE drive_sync_status.last_error_at END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_drive_sync_status(UUID, TEXT, INTEGER, TEXT) IS 'Updates Drive sync status';

-- =====================================================
-- 4. GET USERS NEEDING SYNC
-- =====================================================
-- Returns users who need to sync based on their sync frequency settings

CREATE OR REPLACE FUNCTION public.get_users_needing_sync(p_service TEXT)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_frequency_minutes INTEGER
) AS $$
BEGIN
  IF p_service = 'gmail' THEN
    RETURN QUERY
    SELECT 
      up.id,
      up.email,
      gss.last_sync_at,
      us.gmail_sync_frequency
    FROM public.user_profiles up
    JOIN public.user_settings us ON us.user_id = up.id
    LEFT JOIN public.gmail_sync_status gss ON gss.user_id = up.id
    WHERE us.gmail_sync_enabled = TRUE
      AND up.google_access_token IS NOT NULL
      AND up.deleted_at IS NULL
      AND (
        gss.last_sync_at IS NULL 
        OR gss.last_sync_at < NOW() - (us.gmail_sync_frequency || ' minutes')::INTERVAL
      );
      
  ELSIF p_service = 'calendar' THEN
    RETURN QUERY
    SELECT 
      up.id,
      up.email,
      css.last_sync_at,
      us.calendar_sync_frequency
    FROM public.user_profiles up
    JOIN public.user_settings us ON us.user_id = up.id
    LEFT JOIN public.calendar_sync_status css ON css.user_id = up.id
    WHERE us.calendar_sync_enabled = TRUE
      AND up.google_access_token IS NOT NULL
      AND up.deleted_at IS NULL
      AND (
        css.last_sync_at IS NULL 
        OR css.last_sync_at < NOW() - (us.calendar_sync_frequency || ' minutes')::INTERVAL
      );
      
  ELSIF p_service = 'drive' THEN
    RETURN QUERY
    SELECT 
      up.id,
      up.email,
      dss.last_sync_at,
      us.drive_sync_frequency
    FROM public.user_profiles up
    JOIN public.user_settings us ON us.user_id = up.id
    LEFT JOIN public.drive_sync_status dss ON dss.user_id = up.id
    WHERE us.drive_sync_enabled = TRUE
      AND up.google_access_token IS NOT NULL
      AND up.deleted_at IS NULL
      AND (
        dss.last_sync_at IS NULL 
        OR dss.last_sync_at < NOW() - (us.drive_sync_frequency || ' minutes')::INTERVAL
      );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_users_needing_sync(TEXT) IS 'Returns users who need to sync based on frequency settings';
