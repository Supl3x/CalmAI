-- =====================================================
-- CalmFlow AI / NEXUS - User Management Functions
-- =====================================================
-- Description: Functions for user profile creation and management
-- =====================================================

-- =====================================================
-- 1. HANDLE NEW USER SIGNUP
-- =====================================================
-- Automatically creates user_profiles and user_settings when a new user signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url, last_login_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  );
  
  -- Create default user settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  -- Log the signup activity
  INSERT INTO public.activity_log (user_id, action_type, action_category, description)
  VALUES (
    NEW.id,
    'signup',
    'auth',
    'User signed up via Google OAuth'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call function on new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile and settings when a new user signs up';

-- =====================================================
-- 2. UPDATE LAST LOGIN
-- =====================================================
-- Updates last_login_at timestamp when user logs in

CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET last_login_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger would be called from application code when user logs in
-- Or you can create a trigger on user_sessions table

COMMENT ON FUNCTION public.update_last_login() IS 'Updates last login timestamp for user';

-- =====================================================
-- 3. SOFT DELETE USER
-- =====================================================
-- Soft deletes a user and all their data

CREATE OR REPLACE FUNCTION public.soft_delete_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Soft delete user profile
  UPDATE public.user_profiles
  SET deleted_at = NOW()
  WHERE id = p_user_id;
  
  -- Soft delete all user data
  UPDATE public.gmail_messages SET deleted_at = NOW() WHERE user_id = p_user_id;
  UPDATE public.gmail_threads SET deleted_at = NOW() WHERE user_id = p_user_id;
  UPDATE public.gmail_drafts SET deleted_at = NOW() WHERE user_id = p_user_id;
  UPDATE public.calendar_events SET deleted_at = NOW() WHERE user_id = p_user_id;
  UPDATE public.calendars SET deleted_at = NOW() WHERE user_id = p_user_id;
  UPDATE public.drive_files SET deleted_at = NOW() WHERE user_id = p_user_id;
  UPDATE public.drive_folders SET deleted_at = NOW() WHERE user_id = p_user_id;
  UPDATE public.tasks SET deleted_at = NOW() WHERE user_id = p_user_id;
  UPDATE public.workflows SET deleted_at = NOW() WHERE user_id = p_user_id;
  UPDATE public.task_comments SET deleted_at = NOW() WHERE user_id = p_user_id;
  
  -- Log the deletion
  INSERT INTO public.activity_log (user_id, action_type, action_category, description)
  VALUES (
    p_user_id,
    'account_deleted',
    'auth',
    'User account soft deleted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.soft_delete_user(UUID) IS 'Soft deletes a user and all their data';

-- =====================================================
-- 4. HARD DELETE USER DATA
-- =====================================================
-- Permanently deletes all user data (respects data retention policy)

CREATE OR REPLACE FUNCTION public.hard_delete_user_data(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_retention_days INTEGER;
BEGIN
  -- Get user's data retention setting
  SELECT data_retention_days INTO v_retention_days
  FROM public.user_settings
  WHERE user_id = p_user_id;
  
  -- Default to 90 days if not set
  v_retention_days := COALESCE(v_retention_days, 90);
  
  -- Delete data older than retention period
  DELETE FROM public.gmail_messages 
  WHERE user_id = p_user_id 
    AND deleted_at IS NOT NULL 
    AND deleted_at < NOW() - (v_retention_days || ' days')::INTERVAL;
  
  DELETE FROM public.calendar_events 
  WHERE user_id = p_user_id 
    AND deleted_at IS NOT NULL 
    AND deleted_at < NOW() - (v_retention_days || ' days')::INTERVAL;
  
  DELETE FROM public.drive_files 
  WHERE user_id = p_user_id 
    AND deleted_at IS NOT NULL 
    AND deleted_at < NOW() - (v_retention_days || ' days')::INTERVAL;
  
  DELETE FROM public.tasks 
  WHERE user_id = p_user_id 
    AND deleted_at IS NOT NULL 
    AND deleted_at < NOW() - (v_retention_days || ' days')::INTERVAL;
  
  -- Log the cleanup
  INSERT INTO public.activity_log (user_id, action_type, action_category, description)
  VALUES (
    p_user_id,
    'data_cleanup',
    'other',
    'Old deleted data permanently removed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.hard_delete_user_data(UUID) IS 'Permanently deletes user data older than retention period';

-- =====================================================
-- 5. GET USER STATS
-- =====================================================
-- Returns user statistics for dashboard

CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_emails INTEGER,
  unread_emails INTEGER,
  total_events INTEGER,
  upcoming_events INTEGER,
  total_files INTEGER,
  total_tasks INTEGER,
  pending_tasks INTEGER,
  completed_tasks INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM public.gmail_messages WHERE user_id = p_user_id AND deleted_at IS NULL),
    (SELECT COUNT(*)::INTEGER FROM public.gmail_messages WHERE user_id = p_user_id AND is_read = FALSE AND deleted_at IS NULL),
    (SELECT COUNT(*)::INTEGER FROM public.calendar_events WHERE user_id = p_user_id AND deleted_at IS NULL),
    (SELECT COUNT(*)::INTEGER FROM public.calendar_events WHERE user_id = p_user_id AND start_time > NOW() AND deleted_at IS NULL),
    (SELECT COUNT(*)::INTEGER FROM public.drive_files WHERE user_id = p_user_id AND deleted_at IS NULL),
    (SELECT COUNT(*)::INTEGER FROM public.tasks WHERE user_id = p_user_id AND deleted_at IS NULL),
    (SELECT COUNT(*)::INTEGER FROM public.tasks WHERE user_id = p_user_id AND status IN ('todo', 'in_progress') AND deleted_at IS NULL),
    (SELECT COUNT(*)::INTEGER FROM public.tasks WHERE user_id = p_user_id AND status = 'completed' AND deleted_at IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_stats(UUID) IS 'Returns user statistics for dashboard';
