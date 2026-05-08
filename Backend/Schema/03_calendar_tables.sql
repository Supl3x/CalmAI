-- =====================================================
-- CalmFlow AI / NEXUS - Google Calendar Integration Schema
-- =====================================================
-- Description: Tables for Google Calendar data caching
-- Note: This is a cache layer. Source of truth is Google Calendar API
-- =====================================================

-- =====================================================
-- 1. CALENDAR_EVENTS TABLE
-- =====================================================
-- Cache calendar events for offline access and AI processing
CREATE TABLE public.calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Google Calendar identifiers
    google_event_id TEXT NOT NULL,
    google_calendar_id TEXT NOT NULL,
    
    -- Event details
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    
    -- Time
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone TEXT DEFAULT 'UTC',
    is_all_day BOOLEAN DEFAULT FALSE,
    
    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT, -- RRULE format
    recurring_event_id TEXT, -- Parent event ID for recurring instances
    
    -- Status
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
    visibility TEXT DEFAULT 'default' CHECK (visibility IN ('default', 'public', 'private', 'confidential')),
    
    -- Attendees
    attendees JSONB DEFAULT '[]', -- Array of {email, name, responseStatus, organizer}
    organizer_email TEXT,
    organizer_name TEXT,
    
    -- User response
    user_response_status TEXT CHECK (user_response_status IN ('accepted', 'declined', 'tentative', 'needsAction')),
    
    -- Meeting details
    meeting_url TEXT, -- Google Meet, Zoom, etc.
    conference_data JSONB,
    
    -- Reminders
    reminders JSONB DEFAULT '[]', -- Array of {method, minutes}
    
    -- AI Processing
    ai_summary TEXT,
    ai_priority_score INTEGER CHECK (ai_priority_score BETWEEN 0 AND 100),
    ai_category TEXT, -- 'meeting', 'focus_time', 'break', 'personal', 'travel'
    ai_preparation_needed BOOLEAN DEFAULT FALSE,
    ai_suggested_prep JSONB DEFAULT '[]',
    ai_conflict_detected BOOLEAN DEFAULT FALSE,
    ai_processed_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    google_created_at TIMESTAMPTZ,
    google_updated_at TIMESTAMPTZ,
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    
    -- Unique constraint
    UNIQUE(user_id, google_event_id)
);

-- Indexes
CREATE INDEX idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_end_time ON public.calendar_events(end_time);
CREATE INDEX idx_calendar_events_date_range ON public.calendar_events(user_id, start_time, end_time);
CREATE INDEX idx_calendar_events_status ON public.calendar_events(status) WHERE status != 'cancelled';
CREATE INDEX idx_calendar_events_ai_priority ON public.calendar_events(ai_priority_score DESC) WHERE ai_priority_score IS NOT NULL;
CREATE INDEX idx_calendar_events_deleted_at ON public.calendar_events(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_calendar_events_search ON public.calendar_events USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- =====================================================
-- 2. CALENDARS TABLE
-- =====================================================
-- Store user's calendar list
CREATE TABLE public.calendars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Google Calendar identifiers
    google_calendar_id TEXT NOT NULL,
    
    -- Calendar details
    name TEXT NOT NULL,
    description TEXT,
    timezone TEXT DEFAULT 'UTC',
    
    -- Access
    access_role TEXT CHECK (access_role IN ('owner', 'writer', 'reader', 'freeBusyReader')),
    is_primary BOOLEAN DEFAULT FALSE,
    is_selected BOOLEAN DEFAULT TRUE, -- Whether to sync this calendar
    
    -- Display
    background_color TEXT,
    foreground_color TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    
    -- Unique constraint
    UNIQUE(user_id, google_calendar_id)
);

-- Indexes
CREATE INDEX idx_calendars_user_id ON public.calendars(user_id);
CREATE INDEX idx_calendars_is_primary ON public.calendars(is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_calendars_is_selected ON public.calendars(is_selected) WHERE is_selected = TRUE;

-- =====================================================
-- 3. CALENDAR_SYNC_STATUS TABLE
-- =====================================================
-- Track sync status for each calendar
CREATE TABLE public.calendar_sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE,
    
    -- Sync details
    last_sync_at TIMESTAMPTZ,
    next_sync_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error', 'paused')),
    
    -- History
    sync_token TEXT, -- Google Calendar sync token for incremental sync
    
    -- Stats
    total_events_synced INTEGER DEFAULT 0,
    last_sync_event_count INTEGER DEFAULT 0,
    
    -- Error tracking
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    last_error_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(user_id, calendar_id)
);

-- Index
CREATE INDEX idx_calendar_sync_status_user_id ON public.calendar_sync_status(user_id);
CREATE INDEX idx_calendar_sync_status_calendar_id ON public.calendar_sync_status(calendar_id);

-- =====================================================
-- 4. CALENDAR_AVAILABILITY TABLE
-- =====================================================
-- Track user availability patterns for AI scheduling
CREATE TABLE public.calendar_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Day of week (0 = Sunday, 6 = Saturday)
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    
    -- Time slots
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Availability type
    availability_type TEXT DEFAULT 'available' CHECK (availability_type IN ('available', 'busy', 'focus_time', 'break')),
    
    -- Preferences
    is_preferred_meeting_time BOOLEAN DEFAULT FALSE,
    is_deep_work_time BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calendar_availability_user_id ON public.calendar_availability(user_id);
CREATE INDEX idx_calendar_availability_day ON public.calendar_availability(day_of_week);

-- =====================================================
-- 5. CALENDAR_CONFLICTS TABLE
-- =====================================================
-- Track detected scheduling conflicts
CREATE TABLE public.calendar_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Conflicting events
    event_id_1 UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
    event_id_2 UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
    
    -- Conflict details
    conflict_type TEXT CHECK (conflict_type IN ('overlap', 'back_to_back', 'travel_time', 'overbooked')),
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- AI suggestions
    ai_resolution_suggestions JSONB DEFAULT '[]',
    
    -- Status
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolution_action TEXT,
    
    -- Metadata
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calendar_conflicts_user_id ON public.calendar_conflicts(user_id);
CREATE INDEX idx_calendar_conflicts_unresolved ON public.calendar_conflicts(is_resolved) WHERE is_resolved = FALSE;

-- =====================================================
-- 6. FOCUS_TIME_BLOCKS TABLE
-- =====================================================
-- AI-suggested focus time blocks
CREATE TABLE public.focus_time_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Time block
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    -- Details
    title TEXT DEFAULT 'Focus Time',
    description TEXT,
    
    -- AI reasoning
    ai_reason TEXT,
    ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 0 AND 100),
    
    -- Status
    status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested', 'accepted', 'declined', 'completed')),
    
    -- Linked to calendar
    calendar_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_focus_time_blocks_user_id ON public.focus_time_blocks(user_id);
CREATE INDEX idx_focus_time_blocks_status ON public.focus_time_blocks(status);
CREATE INDEX idx_focus_time_blocks_time_range ON public.focus_time_blocks(start_time, end_time);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendars_updated_at
    BEFORE UPDATE ON public.calendars
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_sync_status_updated_at
    BEFORE UPDATE ON public.calendar_sync_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_availability_updated_at
    BEFORE UPDATE ON public.calendar_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_focus_time_blocks_updated_at
    BEFORE UPDATE ON public.focus_time_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.calendar_events IS 'Cached Google Calendar events with AI processing';
COMMENT ON TABLE public.calendars IS 'User calendar list from Google Calendar';
COMMENT ON TABLE public.calendar_sync_status IS 'Calendar sync status tracking';
COMMENT ON TABLE public.calendar_availability IS 'User availability patterns for AI scheduling';
COMMENT ON TABLE public.calendar_conflicts IS 'Detected scheduling conflicts';
COMMENT ON TABLE public.focus_time_blocks IS 'AI-suggested focus time blocks';
