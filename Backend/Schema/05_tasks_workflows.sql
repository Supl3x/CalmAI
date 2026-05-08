-- =====================================================
-- CalmFlow AI / NEXUS - Tasks & Workflows Schema
-- =====================================================
-- Description: Tables for task management and workflow automation
-- =====================================================

-- =====================================================
-- 1. TASKS TABLE
-- =====================================================
-- User tasks and AI-generated tasks
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Task details
    title TEXT NOT NULL,
    description TEXT,
    
    -- Hierarchy
    parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    is_subtask BOOLEAN DEFAULT FALSE,
    subtask_order INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'completed', 'cancelled')),
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    
    -- Priority
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    ai_priority_score INTEGER CHECK (ai_priority_score BETWEEN 0 AND 100),
    
    -- Categorization
    category TEXT, -- 'work', 'personal', 'health', 'learning', etc.
    tags JSONB DEFAULT '[]',
    
    -- Time estimates
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    
    -- Deadlines
    due_date TIMESTAMPTZ,
    reminder_at TIMESTAMPTZ,
    
    -- Dependencies
    depends_on_task_ids UUID[], -- Array of task IDs this task depends on
    blocks_task_ids UUID[], -- Array of task IDs this task blocks
    
    -- AI Generation
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_source TEXT, -- 'decomposer', 'priority_engine', 'briefing', 'manual'
    ai_parent_prompt TEXT,
    ai_difficulty TEXT CHECK (ai_difficulty IN ('easy', 'medium', 'hard')),
    ai_suggested_time_slot TIMESTAMPTZ,
    
    -- Linked resources
    linked_email_id UUID REFERENCES public.gmail_messages(id) ON DELETE SET NULL,
    linked_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
    linked_file_id UUID REFERENCES public.drive_files(id) ON DELETE SET NULL,
    
    -- Completion
    completed_at TIMESTAMPTZ,
    completed_by_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_parent_id ON public.tasks(parent_task_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_ai_priority ON public.tasks(ai_priority_score DESC) WHERE ai_priority_score IS NOT NULL;
CREATE INDEX idx_tasks_deleted_at ON public.tasks(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_tasks_search ON public.tasks USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- =====================================================
-- 2. WORKFLOWS TABLE
-- =====================================================
-- Automated workflows and processes
CREATE TABLE public.workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Workflow details
    name TEXT NOT NULL,
    description TEXT,
    
    -- Type
    workflow_type TEXT CHECK (workflow_type IN ('manual', 'automated', 'scheduled', 'triggered')),
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'failed', 'cancelled')),
    
    -- Progress
    total_steps INTEGER DEFAULT 0,
    completed_steps INTEGER DEFAULT 0,
    current_step INTEGER DEFAULT 0,
    
    -- Steps definition
    steps JSONB DEFAULT '[]', -- Array of {order, title, description, status, assignee}
    
    -- Trigger
    trigger_type TEXT CHECK (trigger_type IN ('manual', 'time', 'event', 'condition')),
    trigger_config JSONB DEFAULT '{}',
    
    -- Schedule
    schedule_cron TEXT, -- Cron expression for scheduled workflows
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    
    -- AI assistance
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_optimization_suggestions JSONB DEFAULT '[]',
    
    -- Linked resources
    linked_task_ids UUID[], -- Tasks associated with this workflow
    
    -- Completion
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX idx_workflows_status ON public.workflows(status);
CREATE INDEX idx_workflows_next_run ON public.workflows(next_run_at) WHERE next_run_at IS NOT NULL;

-- =====================================================
-- 3. WORKFLOW_EXECUTIONS TABLE
-- =====================================================
-- Track workflow execution history
CREATE TABLE public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Execution details
    execution_status TEXT DEFAULT 'running' CHECK (execution_status IN ('running', 'completed', 'failed', 'cancelled')),
    
    -- Progress
    steps_completed INTEGER DEFAULT 0,
    current_step_index INTEGER DEFAULT 0,
    
    -- Results
    execution_log JSONB DEFAULT '[]', -- Array of {step, timestamp, status, message}
    error_message TEXT,
    error_stack TEXT,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_user_id ON public.workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(execution_status);
CREATE INDEX idx_workflow_executions_started_at ON public.workflow_executions(started_at DESC);

-- =====================================================
-- 4. TASK_COMMENTS TABLE
-- =====================================================
-- Comments and notes on tasks
CREATE TABLE public.task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Comment content
    content TEXT NOT NULL,
    
    -- AI generated
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_type TEXT CHECK (ai_type IN ('suggestion', 'reminder', 'insight', 'user')),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON public.task_comments(user_id);
CREATE INDEX idx_task_comments_created_at ON public.task_comments(created_at DESC);

-- =====================================================
-- 5. TASK_DEPENDENCIES TABLE
-- =====================================================
-- Explicit task dependency tracking
CREATE TABLE public.task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dependency relationship
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    
    -- Dependency type
    dependency_type TEXT DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
    
    -- Status
    is_blocking BOOLEAN DEFAULT TRUE,
    is_resolved BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(task_id, depends_on_task_id)
);

-- Indexes
CREATE INDEX idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);
CREATE INDEX idx_task_dependencies_blocking ON public.task_dependencies(is_blocking) WHERE is_blocking = TRUE;

-- =====================================================
-- 6. OPEN_LOOPS TABLE
-- =====================================================
-- Track "open loops" - incomplete or pending items
CREATE TABLE public.open_loops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Loop details
    title TEXT NOT NULL,
    description TEXT,
    
    -- Source
    source_type TEXT CHECK (source_type IN ('email', 'task', 'calendar', 'drive', 'manual')),
    source_id UUID, -- ID of the source entity
    
    -- Status
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'dismissed')),
    
    -- AI detection
    ai_detected BOOLEAN DEFAULT FALSE,
    ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 0 AND 100),
    ai_suggested_actions JSONB DEFAULT '[]',
    
    -- Closure
    closed_at TIMESTAMPTZ,
    closure_action TEXT,
    
    -- Metadata
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_open_loops_user_id ON public.open_loops(user_id);
CREATE INDEX idx_open_loops_status ON public.open_loops(status);
CREATE INDEX idx_open_loops_source_type ON public.open_loops(source_type);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON public.workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON public.task_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_open_loops_updated_at
    BEFORE UPDATE ON public.open_loops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.tasks IS 'User tasks and AI-generated subtasks';
COMMENT ON TABLE public.workflows IS 'Automated workflows and processes';
COMMENT ON TABLE public.workflow_executions IS 'Workflow execution history and logs';
COMMENT ON TABLE public.task_comments IS 'Comments and notes on tasks';
COMMENT ON TABLE public.task_dependencies IS 'Task dependency relationships';
COMMENT ON TABLE public.open_loops IS 'Incomplete or pending items detected by AI';
