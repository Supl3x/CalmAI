-- =====================================================
-- CalmFlow AI / NEXUS - Google Drive Integration Schema
-- =====================================================
-- Description: Tables for Google Drive data caching
-- Note: This is a cache layer. Source of truth is Google Drive API
-- =====================================================

-- =====================================================
-- 1. DRIVE_FILES TABLE
-- =====================================================
-- Cache Drive files metadata
CREATE TABLE public.drive_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Google Drive identifiers
    google_file_id TEXT NOT NULL,
    google_parent_id TEXT, -- Parent folder ID
    
    -- File details
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    description TEXT,
    
    -- File type classification
    file_type TEXT CHECK (file_type IN ('document', 'spreadsheet', 'presentation', 'pdf', 'image', 'video', 'audio', 'archive', 'code', 'other')),
    
    -- Size
    size_bytes BIGINT,
    
    -- URLs
    web_view_link TEXT,
    web_content_link TEXT,
    thumbnail_link TEXT,
    icon_link TEXT,
    
    -- Ownership
    owner_email TEXT,
    owner_name TEXT,
    is_owned_by_user BOOLEAN DEFAULT TRUE,
    
    -- Sharing
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with_me BOOLEAN DEFAULT FALSE,
    permissions JSONB DEFAULT '[]', -- Array of {email, role, type}
    
    -- Status
    is_starred BOOLEAN DEFAULT FALSE,
    is_trashed BOOLEAN DEFAULT FALSE,
    is_viewed BOOLEAN DEFAULT FALSE,
    
    -- Versions
    version INTEGER DEFAULT 1,
    head_revision_id TEXT,
    
    -- AI Processing
    ai_summary TEXT,
    ai_category TEXT, -- 'work', 'personal', 'shared', 'important', 'archive'
    ai_priority_score INTEGER CHECK (ai_priority_score BETWEEN 0 AND 100),
    ai_tags JSONB DEFAULT '[]',
    ai_processed_at TIMESTAMPTZ,
    
    -- Timestamps
    google_created_at TIMESTAMPTZ,
    google_modified_at TIMESTAMPTZ,
    last_viewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    
    -- Unique constraint
    UNIQUE(user_id, google_file_id)
);

-- Indexes
CREATE INDEX idx_drive_files_user_id ON public.drive_files(user_id);
CREATE INDEX idx_drive_files_parent_id ON public.drive_files(google_parent_id);
CREATE INDEX idx_drive_files_mime_type ON public.drive_files(mime_type);
CREATE INDEX idx_drive_files_is_starred ON public.drive_files(is_starred) WHERE is_starred = TRUE;
CREATE INDEX idx_drive_files_is_trashed ON public.drive_files(is_trashed) WHERE is_trashed = FALSE;
CREATE INDEX idx_drive_files_modified_at ON public.drive_files(google_modified_at DESC);
CREATE INDEX idx_drive_files_deleted_at ON public.drive_files(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_drive_files_search ON public.drive_files USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- =====================================================
-- 2. DRIVE_FOLDERS TABLE
-- =====================================================
-- Separate table for folders for better organization
CREATE TABLE public.drive_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Google Drive identifiers
    google_folder_id TEXT NOT NULL,
    google_parent_id TEXT,
    
    -- Folder details
    name TEXT NOT NULL,
    description TEXT,
    
    -- Hierarchy
    path TEXT, -- Full path like /Work/Projects/2024
    depth INTEGER DEFAULT 0,
    
    -- Stats
    file_count INTEGER DEFAULT 0,
    subfolder_count INTEGER DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,
    
    -- Status
    is_starred BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    
    -- AI Processing
    ai_category TEXT,
    ai_importance TEXT CHECK (ai_importance IN ('high', 'medium', 'low')),
    
    -- Timestamps
    google_created_at TIMESTAMPTZ,
    google_modified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    
    -- Unique constraint
    UNIQUE(user_id, google_folder_id)
);

-- Indexes
CREATE INDEX idx_drive_folders_user_id ON public.drive_folders(user_id);
CREATE INDEX idx_drive_folders_parent_id ON public.drive_folders(google_parent_id);
CREATE INDEX idx_drive_folders_path ON public.drive_folders(path);

-- =====================================================
-- 3. DRIVE_ACTIVITIES TABLE
-- =====================================================
-- Track file activities (views, edits, shares)
CREATE TABLE public.drive_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.drive_files(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type TEXT NOT NULL CHECK (activity_type IN ('view', 'edit', 'comment', 'share', 'download', 'upload', 'delete', 'restore', 'rename', 'move')),
    actor_email TEXT,
    actor_name TEXT,
    
    -- Context
    details JSONB DEFAULT '{}',
    
    -- Timestamp
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_drive_activities_user_id ON public.drive_activities(user_id);
CREATE INDEX idx_drive_activities_file_id ON public.drive_activities(file_id);
CREATE INDEX idx_drive_activities_occurred_at ON public.drive_activities(occurred_at DESC);
CREATE INDEX idx_drive_activities_type ON public.drive_activities(activity_type);

-- =====================================================
-- 4. DRIVE_SYNC_STATUS TABLE
-- =====================================================
-- Track sync status for Drive
CREATE TABLE public.drive_sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Sync details
    last_sync_at TIMESTAMPTZ,
    next_sync_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error', 'paused')),
    
    -- History
    page_token TEXT, -- Google Drive page token for incremental sync
    start_page_token TEXT,
    
    -- Stats
    total_files_synced INTEGER DEFAULT 0,
    total_folders_synced INTEGER DEFAULT 0,
    last_sync_file_count INTEGER DEFAULT 0,
    
    -- Error tracking
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    last_error_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(user_id)
);

-- Index
CREATE INDEX idx_drive_sync_status_user_id ON public.drive_sync_status(user_id);

-- =====================================================
-- 5. DRIVE_SEARCH_HISTORY TABLE
-- =====================================================
-- Track user's Drive search history for AI learning
CREATE TABLE public.drive_search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Search details
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}', -- {mimeType, owner, modifiedTime, etc.}
    
    -- Results
    result_count INTEGER DEFAULT 0,
    clicked_file_ids TEXT[], -- Which files user clicked
    
    -- Metadata
    searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_drive_search_history_user_id ON public.drive_search_history(user_id);
CREATE INDEX idx_drive_search_history_searched_at ON public.drive_search_history(searched_at DESC);

-- =====================================================
-- 6. DRIVE_ALERTS TABLE
-- =====================================================
-- AI-generated alerts for Drive files
CREATE TABLE public.drive_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.drive_files(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_type TEXT NOT NULL CHECK (alert_type IN ('expiring_access', 'large_file', 'duplicate_detected', 'unused_file', 'permission_change', 'version_conflict')),
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Message
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- AI suggestions
    ai_suggested_actions JSONB DEFAULT '[]',
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_drive_alerts_user_id ON public.drive_alerts(user_id);
CREATE INDEX idx_drive_alerts_file_id ON public.drive_alerts(file_id);
CREATE INDEX idx_drive_alerts_unread ON public.drive_alerts(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_drive_alerts_severity ON public.drive_alerts(severity);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_drive_files_updated_at
    BEFORE UPDATE ON public.drive_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drive_folders_updated_at
    BEFORE UPDATE ON public.drive_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drive_sync_status_updated_at
    BEFORE UPDATE ON public.drive_sync_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drive_alerts_updated_at
    BEFORE UPDATE ON public.drive_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.drive_files IS 'Cached Google Drive files with AI processing';
COMMENT ON TABLE public.drive_folders IS 'Google Drive folder structure';
COMMENT ON TABLE public.drive_activities IS 'File activity tracking';
COMMENT ON TABLE public.drive_sync_status IS 'Drive sync status tracking';
COMMENT ON TABLE public.drive_search_history IS 'User Drive search history for AI learning';
COMMENT ON TABLE public.drive_alerts IS 'AI-generated Drive alerts and suggestions';
