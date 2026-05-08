-- =====================================================
-- CalmFlow AI / NEXUS - Gmail Integration Schema
-- =====================================================
-- Description: Tables for Gmail data caching and management
-- Note: This is a cache layer. Source of truth is Gmail API
-- =====================================================

-- =====================================================
-- 1. GMAIL MESSAGES TABLE
-- =====================================================
-- Cache Gmail messages for offline access and AI processing
CREATE TABLE public.gmail_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Gmail identifiers
    gmail_message_id TEXT NOT NULL, -- Gmail's unique message ID
    gmail_thread_id TEXT NOT NULL,  -- Gmail's thread ID
    
    -- Message metadata
    subject TEXT,
    snippet TEXT, -- Gmail's auto-generated snippet
    from_email TEXT NOT NULL,
    from_name TEXT,
    to_emails TEXT[], -- Array of recipient emails
    cc_emails TEXT[],
    bcc_emails TEXT[],
    
    -- Content
    body_plain TEXT,
    body_html TEXT,
    
    -- Flags
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    is_important BOOLEAN DEFAULT FALSE,
    is_draft BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE,
    is_trash BOOLEAN DEFAULT FALSE,
    is_spam BOOLEAN DEFAULT FALSE,
    
    -- Labels
    label_ids TEXT[], -- Gmail label IDs
    labels JSONB DEFAULT '[]', -- Label names for display
    
    -- Attachments
    has_attachments BOOLEAN DEFAULT FALSE,
    attachment_count INTEGER DEFAULT 0,
    
    -- AI Processing
    ai_summary TEXT,
    ai_priority_score INTEGER CHECK (ai_priority_score BETWEEN 0 AND 100),
    ai_category TEXT, -- 'urgent', 'important', 'normal', 'low', 'spam'
    ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'neutral', 'negative', 'unknown')),
    ai_action_required BOOLEAN DEFAULT FALSE,
    ai_suggested_actions JSONB DEFAULT '[]',
    ai_processed_at TIMESTAMPTZ,
    
    -- Timestamps
    gmail_date TIMESTAMPTZ NOT NULL, -- When email was sent
    received_at TIMESTAMPTZ DEFAULT NOW(), -- When we fetched it
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    
    -- Unique constraint
    UNIQUE(user_id, gmail_message_id)
);

-- Indexes
CREATE INDEX idx_gmail_messages_user_id ON public.gmail_messages(user_id);
CREATE INDEX idx_gmail_messages_thread_id ON public.gmail_messages(gmail_thread_id);
CREATE INDEX idx_gmail_messages_gmail_date ON public.gmail_messages(gmail_date DESC);
CREATE INDEX idx_gmail_messages_is_read ON public.gmail_messages(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_gmail_messages_ai_priority ON public.gmail_messages(ai_priority_score DESC) WHERE ai_priority_score IS NOT NULL;
CREATE INDEX idx_gmail_messages_deleted_at ON public.gmail_messages(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX idx_gmail_messages_search ON public.gmail_messages USING gin(to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(body_plain, '')));

-- =====================================================
-- 2. GMAIL THREADS TABLE
-- =====================================================
-- Group messages into threads
CREATE TABLE public.gmail_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Gmail identifiers
    gmail_thread_id TEXT NOT NULL,
    
    -- Thread metadata
    subject TEXT,
    message_count INTEGER DEFAULT 1,
    unread_count INTEGER DEFAULT 0,
    
    -- Participants
    participants JSONB DEFAULT '[]', -- Array of {email, name}
    
    -- Flags
    is_starred BOOLEAN DEFAULT FALSE,
    is_important BOOLEAN DEFAULT FALSE,
    
    -- Labels
    label_ids TEXT[],
    labels JSONB DEFAULT '[]',
    
    -- AI Processing
    ai_summary TEXT,
    ai_priority_score INTEGER CHECK (ai_priority_score BETWEEN 0 AND 100),
    ai_category TEXT,
    
    -- Timestamps
    first_message_date TIMESTAMPTZ,
    last_message_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    
    -- Unique constraint
    UNIQUE(user_id, gmail_thread_id)
);

-- Indexes
CREATE INDEX idx_gmail_threads_user_id ON public.gmail_threads(user_id);
CREATE INDEX idx_gmail_threads_last_message ON public.gmail_threads(last_message_date DESC);
CREATE INDEX idx_gmail_threads_unread ON public.gmail_threads(unread_count) WHERE unread_count > 0;

-- =====================================================
-- 3. GMAIL ATTACHMENTS TABLE
-- =====================================================
-- Track email attachments
CREATE TABLE public.gmail_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES public.gmail_messages(id) ON DELETE CASCADE,
    
    -- Gmail identifiers
    gmail_attachment_id TEXT NOT NULL,
    
    -- File metadata
    filename TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER,
    
    -- Storage
    storage_url TEXT, -- If we cache the file
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(user_id, gmail_attachment_id)
);

-- Indexes
CREATE INDEX idx_gmail_attachments_user_id ON public.gmail_attachments(user_id);
CREATE INDEX idx_gmail_attachments_message_id ON public.gmail_attachments(message_id);

-- =====================================================
-- 4. GMAIL LABELS TABLE
-- =====================================================
-- Cache Gmail labels
CREATE TABLE public.gmail_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Gmail identifiers
    gmail_label_id TEXT NOT NULL,
    
    -- Label details
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('system', 'user')),
    message_list_visibility TEXT,
    label_list_visibility TEXT,
    
    -- Color
    background_color TEXT,
    text_color TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(user_id, gmail_label_id)
);

-- Indexes
CREATE INDEX idx_gmail_labels_user_id ON public.gmail_labels(user_id);

-- =====================================================
-- 5. GMAIL DRAFTS TABLE
-- =====================================================
-- Store draft emails
CREATE TABLE public.gmail_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Gmail identifiers
    gmail_draft_id TEXT,
    
    -- Draft content
    to_emails TEXT[] NOT NULL,
    cc_emails TEXT[],
    bcc_emails TEXT[],
    subject TEXT,
    body_plain TEXT,
    body_html TEXT,
    
    -- AI assistance
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_prompt TEXT,
    ai_tone TEXT, -- 'professional', 'casual', 'friendly', 'formal'
    
    -- Status
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_gmail_drafts_user_id ON public.gmail_drafts(user_id);
CREATE INDEX idx_gmail_drafts_is_sent ON public.gmail_drafts(is_sent) WHERE is_sent = FALSE;

-- =====================================================
-- 6. GMAIL SYNC STATUS TABLE
-- =====================================================
-- Track sync status for each user
CREATE TABLE public.gmail_sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Sync details
    last_sync_at TIMESTAMPTZ,
    next_sync_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error', 'paused')),
    
    -- History
    history_id TEXT, -- Gmail's history ID for incremental sync
    
    -- Stats
    total_messages_synced INTEGER DEFAULT 0,
    last_sync_message_count INTEGER DEFAULT 0,
    
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
CREATE INDEX idx_gmail_sync_status_user_id ON public.gmail_sync_status(user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_gmail_messages_updated_at
    BEFORE UPDATE ON public.gmail_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gmail_threads_updated_at
    BEFORE UPDATE ON public.gmail_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gmail_labels_updated_at
    BEFORE UPDATE ON public.gmail_labels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gmail_drafts_updated_at
    BEFORE UPDATE ON public.gmail_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gmail_sync_status_updated_at
    BEFORE UPDATE ON public.gmail_sync_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.gmail_messages IS 'Cached Gmail messages with AI processing results';
COMMENT ON TABLE public.gmail_threads IS 'Gmail conversation threads';
COMMENT ON TABLE public.gmail_attachments IS 'Email attachment metadata';
COMMENT ON TABLE public.gmail_labels IS 'Gmail labels (system and user-created)';
COMMENT ON TABLE public.gmail_drafts IS 'Draft emails with AI assistance';
COMMENT ON TABLE public.gmail_sync_status IS 'Gmail sync status tracking per user';
