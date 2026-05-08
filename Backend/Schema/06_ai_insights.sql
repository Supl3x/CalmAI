-- =====================================================
-- CalmFlow AI / NEXUS - AI Insights & Analytics Schema
-- =====================================================
-- Description: Tables for AI-generated insights, briefings, and analytics
-- =====================================================

-- =====================================================
-- 1. DAILY_BRIEFINGS TABLE
-- =====================================================
-- AI-generated daily briefings
CREATE TABLE public.daily_briefings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Briefing date
    briefing_date DATE NOT NULL,
    
    -- Content
    greeting TEXT,
    summary TEXT NOT NULL,
    
    -- Sections
    critical_priorities JSONB DEFAULT '[]', -- Array of {title, description, time, priority}
    smart_schedule JSONB DEFAULT '[]', -- Array of {time, activity, type}
    ai_suggestions JSONB DEFAULT '[]', -- Array of {type, message, action}
    
    -- Metrics
    cognitive_load_score INTEGER CHECK (cognitive_load_score BETWEEN 0 AND 100),
    flow_state_percentage INTEGER CHECK (flow_state_percentage BETWEEN 0 AND 100),
    optimization_level INTEGER CHECK (optimization_level BETWEEN 0 AND 100),
    
    -- Status
    is_viewed BOOLEAN DEFAULT FALSE,
    viewed_at TIMESTAMPTZ,
    
    -- AI model info
    ai_model TEXT DEFAULT 'llama-3.3-70b-versatile',
    ai_generation_time_ms INTEGER,
    
    -- Metadata
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(user_id, briefing_date)
);

-- Indexes
CREATE INDEX idx_daily_briefings_user_id ON public.daily_briefings(user_id);
CREATE INDEX idx_daily_briefings_date ON public.daily_briefings(briefing_date DESC);
CREATE INDEX idx_daily_briefings_unviewed ON public.daily_briefings(is_viewed) WHERE is_viewed = FALSE;

-- =====================================================
-- 2. AI_INSIGHTS TABLE
-- =====================================================
-- General AI-generated insights
CREATE TABLE public.ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Insight details
    insight_type TEXT NOT NULL CHECK (insight_type IN ('productivity', 'time_management', 'priority', 'pattern', 'suggestion', 'warning', 'celebration')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    
    -- Context
    context_type TEXT, -- 'email', 'calendar', 'task', 'drive', 'general'
    context_id UUID,
    
    -- Importance
    importance TEXT DEFAULT 'medium' CHECK (importance IN ('low', 'medium', 'high', 'critical')),
    confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
    
    -- Actions
    suggested_actions JSONB DEFAULT '[]',
    action_taken TEXT,
    action_taken_at TIMESTAMPTZ,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    is_acted_upon BOOLEAN DEFAULT FALSE,
    
    -- AI model info
    ai_model TEXT DEFAULT 'llama-3.3-70b-versatile',
    ai_reasoning TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_ai_insights_user_id ON public.ai_insights(user_id);
CREATE INDEX idx_ai_insights_type ON public.ai_insights(insight_type);
CREATE INDEX idx_ai_insights_importance ON public.ai_insights(importance);
CREATE INDEX idx_ai_insights_unread ON public.ai_insights(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_ai_insights_created_at ON public.ai_insights(created_at DESC);

-- =====================================================
-- 3. COGNITIVE_LOAD_HISTORY TABLE
-- =====================================================
-- Track cognitive load over time
CREATE TABLE public.cognitive_load_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Measurement
    load_score INTEGER NOT NULL CHECK (load_score BETWEEN 0 AND 100),
    load_level TEXT CHECK (load_level IN ('low', 'medium', 'high', 'overload')),
    
    -- Contributing factors
    factors JSONB DEFAULT '{}', -- {emails: 20, meetings: 30, tasks: 25, deadlines: 25}
    
    -- Context
    time_of_day TIME,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    
    -- Recommendations
    ai_recommendations JSONB DEFAULT '[]',
    
    -- Metadata
    measured_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cognitive_load_user_id ON public.cognitive_load_history(user_id);
CREATE INDEX idx_cognitive_load_measured_at ON public.cognitive_load_history(measured_at DESC);
CREATE INDEX idx_cognitive_load_level ON public.cognitive_load_history(load_level);

-- =====================================================
-- 4. PRODUCTIVITY_METRICS TABLE
-- =====================================================
-- Track productivity metrics
CREATE TABLE public.productivity_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Time period
    metric_date DATE NOT NULL,
    metric_period TEXT DEFAULT 'daily' CHECK (metric_period IN ('daily', 'weekly', 'monthly')),
    
    -- Task metrics
    tasks_completed INTEGER DEFAULT 0,
    tasks_created INTEGER DEFAULT 0,
    tasks_overdue INTEGER DEFAULT 0,
    avg_task_completion_time_minutes INTEGER,
    
    -- Email metrics
    emails_processed INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    avg_email_response_time_hours INTEGER,
    inbox_zero_achieved BOOLEAN DEFAULT FALSE,
    
    -- Calendar metrics
    meetings_attended INTEGER DEFAULT 0,
    meeting_hours DECIMAL(5,2) DEFAULT 0,
    focus_time_hours DECIMAL(5,2) DEFAULT 0,
    
    -- Workflow metrics
    workflows_completed INTEGER DEFAULT 0,
    workflows_failed INTEGER DEFAULT 0,
    
    -- AI efficiency
    ai_suggestions_accepted INTEGER DEFAULT 0,
    ai_suggestions_dismissed INTEGER DEFAULT 0,
    ai_efficiency_score INTEGER CHECK (ai_efficiency_score BETWEEN 0 AND 100),
    
    -- Overall scores
    productivity_score INTEGER CHECK (productivity_score BETWEEN 0 AND 100),
    flow_state_percentage INTEGER CHECK (flow_state_percentage BETWEEN 0 AND 100),
    
    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(user_id, metric_date, metric_period)
);

-- Indexes
CREATE INDEX idx_productivity_metrics_user_id ON public.productivity_metrics(user_id);
CREATE INDEX idx_productivity_metrics_date ON public.productivity_metrics(metric_date DESC);
CREATE INDEX idx_productivity_metrics_period ON public.productivity_metrics(metric_period);

-- =====================================================
-- 5. PATTERN_ANALYSIS TABLE
-- =====================================================
-- AI-detected patterns in user behavior
CREATE TABLE public.pattern_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Pattern details
    pattern_type TEXT NOT NULL CHECK (pattern_type IN ('time_preference', 'productivity_peak', 'meeting_pattern', 'email_pattern', 'task_pattern', 'break_pattern')),
    pattern_name TEXT NOT NULL,
    description TEXT,
    
    -- Pattern data
    pattern_data JSONB NOT NULL, -- Flexible structure for different pattern types
    
    -- Confidence
    confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
    sample_size INTEGER, -- Number of data points used
    
    -- Time range
    analysis_start_date DATE,
    analysis_end_date DATE,
    
    -- Recommendations
    ai_recommendations JSONB DEFAULT '[]',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_applied BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pattern_analysis_user_id ON public.pattern_analysis(user_id);
CREATE INDEX idx_pattern_analysis_type ON public.pattern_analysis(pattern_type);
CREATE INDEX idx_pattern_analysis_active ON public.pattern_analysis(is_active) WHERE is_active = TRUE;

-- =====================================================
-- 6. AI_PROCESSING_QUEUE TABLE
-- =====================================================
-- Queue for AI processing tasks
CREATE TABLE public.ai_processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Task details
    task_type TEXT NOT NULL CHECK (task_type IN ('email_summary', 'task_decompose', 'priority_rank', 'briefing_generate', 'pattern_detect', 'insight_generate')),
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest
    
    -- Input data
    input_data JSONB NOT NULL,
    
    -- Processing
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Output
    output_data JSONB,
    error_message TEXT,
    
    -- Timing
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    processing_time_ms INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_processing_queue_user_id ON public.ai_processing_queue(user_id);
CREATE INDEX idx_ai_processing_queue_status ON public.ai_processing_queue(status);
CREATE INDEX idx_ai_processing_queue_priority ON public.ai_processing_queue(priority, queued_at);
CREATE INDEX idx_ai_processing_queue_type ON public.ai_processing_queue(task_type);

-- =====================================================
-- 7. NOTIFICATIONS TABLE
-- =====================================================
-- System and AI-generated notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type TEXT NOT NULL CHECK (notification_type IN ('info', 'success', 'warning', 'error', 'ai_insight', 'reminder', 'alert')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Context
    context_type TEXT, -- 'email', 'calendar', 'task', 'drive', 'system'
    context_id UUID,
    
    -- Actions
    action_url TEXT,
    action_label TEXT,
    actions JSONB DEFAULT '[]', -- Array of {label, url, type}
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- Priority
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Delivery
    delivery_method TEXT[] DEFAULT ARRAY['in_app'], -- 'in_app', 'email', 'push'
    delivered_at TIMESTAMPTZ,
    
    -- Expiration
    expires_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_type ON public.notifications(notification_type);
CREATE INDEX idx_notifications_unread ON public.notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_priority ON public.notifications(priority);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_pattern_analysis_updated_at
    BEFORE UPDATE ON public.pattern_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.daily_briefings IS 'AI-generated daily briefings for users';
COMMENT ON TABLE public.ai_insights IS 'AI-generated insights and suggestions';
COMMENT ON TABLE public.cognitive_load_history IS 'Historical cognitive load measurements';
COMMENT ON TABLE public.productivity_metrics IS 'Productivity metrics and analytics';
COMMENT ON TABLE public.pattern_analysis IS 'AI-detected behavioral patterns';
COMMENT ON TABLE public.ai_processing_queue IS 'Queue for AI processing tasks';
COMMENT ON TABLE public.notifications IS 'System and AI-generated notifications';
