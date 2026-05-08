-- =====================================================
-- CalmFlow AI / NEXUS - Core Database Schema
-- =====================================================
-- Description: Core tables for user management, profiles, and settings
-- Auth: Uses Supabase Auth with Google OAuth
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USER PROFILES TABLE
-- =====================================================
-- Extends Supabase auth.users with additional profile data
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    
    -- Google OAuth tokens (encrypted)
    google_access_token TEXT,
    google_refresh_token TEXT,
    google_token_expires_at TIMESTAMPTZ,
    
    -- User preferences
    timezone TEXT DEFAULT 'UTC',
    preferred_language TEXT DEFAULT 'en',
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    
    -- Feature flags
    calm_mode_enabled BOOLEAN DEFAULT FALSE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    ai_suggestions_enabled BOOLEAN DEFAULT TRUE,
    
    -- Onboarding
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_step INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    
    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Index for performance
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_deleted_at ON public.user_profiles(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- 2. USER SETTINGS TABLE
-- =====================================================
-- Granular user settings and preferences
CREATE TABLE public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Dashboard settings
    dashboard_layout JSONB DEFAULT '{"widgets": ["briefing", "stats", "workflows"]}',
    default_view TEXT DEFAULT 'dashboard' CHECK (default_view IN ('dashboard', 'tasks', 'calendar', 'analytics')),
    
    -- AI settings
    ai_model_preference TEXT DEFAULT 'llama-3.3-70b-versatile',
    ai_creativity_level INTEGER DEFAULT 5 CHECK (ai_creativity_level BETWEEN 1 AND 10),
    ai_verbosity TEXT DEFAULT 'balanced' CHECK (ai_verbosity IN ('concise', 'balanced', 'detailed')),
    
    -- Notification settings
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    notification_frequency TEXT DEFAULT 'realtime' CHECK (notification_frequency IN ('realtime', 'hourly', 'daily', 'never')),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    
    -- Sync settings
    gmail_sync_enabled BOOLEAN DEFAULT TRUE,
    gmail_sync_frequency INTEGER DEFAULT 15, -- minutes
    calendar_sync_enabled BOOLEAN DEFAULT TRUE,
    calendar_sync_frequency INTEGER DEFAULT 30, -- minutes
    drive_sync_enabled BOOLEAN DEFAULT TRUE,
    drive_sync_frequency INTEGER DEFAULT 60, -- minutes
    
    -- Privacy settings
    data_retention_days INTEGER DEFAULT 90,
    analytics_enabled BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

-- =====================================================
-- 3. USER SESSIONS TABLE
-- =====================================================
-- Track user sessions for analytics and security
CREATE TABLE public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Session data
    session_token TEXT NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
    browser TEXT,
    os TEXT,
    
    -- Location (optional)
    country TEXT,
    city TEXT,
    
    -- Session lifecycle
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);

-- =====================================================
-- 4. ACTIVITY LOG TABLE
-- =====================================================
-- Audit trail for user actions
CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Activity details
    action_type TEXT NOT NULL, -- 'login', 'logout', 'task_created', 'email_sent', etc.
    action_category TEXT NOT NULL CHECK (action_category IN ('auth', 'task', 'email', 'calendar', 'drive', 'ai', 'settings', 'other')),
    description TEXT,
    
    -- Context
    resource_type TEXT, -- 'task', 'email', 'event', etc.
    resource_id UUID,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_log_action_type ON public.activity_log(action_type);
CREATE INDEX idx_activity_log_category ON public.activity_log(action_category);

-- =====================================================
-- 5. API USAGE TABLE
-- =====================================================
-- Track API calls for rate limiting and analytics
CREATE TABLE public.api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- API details
    api_provider TEXT NOT NULL CHECK (api_provider IN ('google_gmail', 'google_calendar', 'google_drive', 'groq', 'supabase')),
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
    
    -- Request/Response
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    
    -- Rate limiting
    quota_used INTEGER DEFAULT 1,
    
    -- Error tracking
    error_message TEXT,
    error_code TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX idx_api_usage_provider ON public.api_usage(api_provider);
CREATE INDEX idx_api_usage_created_at ON public.api_usage(created_at DESC);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.user_profiles IS 'Extended user profile data linked to Supabase auth.users';
COMMENT ON TABLE public.user_settings IS 'Granular user preferences and settings';
COMMENT ON TABLE public.user_sessions IS 'User session tracking for analytics and security';
COMMENT ON TABLE public.activity_log IS 'Audit trail of all user actions';
COMMENT ON TABLE public.api_usage IS 'API call tracking for rate limiting and analytics';
