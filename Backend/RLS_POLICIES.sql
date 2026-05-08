-- =====================================================
-- CalmFlow AI / NEXUS - Row Level Security (RLS) Policies
-- =====================================================
-- Description: Comprehensive RLS policies for all tables
-- Security Model: Users can only access their own data
-- =====================================================

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

-- Core tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Gmail tables
ALTER TABLE public.gmail_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_sync_status ENABLE ROW LEVEL SECURITY;

-- Calendar tables
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_time_blocks ENABLE ROW LEVEL SECURITY;

-- Drive tables
ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_alerts ENABLE ROW LEVEL SECURITY;

-- Tasks & Workflows tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_loops ENABLE ROW LEVEL SECURITY;

-- AI & Analytics tables
ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cognitive_load_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productivity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTION
-- =====================================================

-- Note: We use auth.uid() directly in policies instead of creating a helper function
-- auth.uid() is a built-in Supabase function that returns the current user's ID

-- =====================================================
-- CORE TABLES POLICIES
-- =====================================================

-- USER_PROFILES
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- USER_SETTINGS
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- USER_SESSIONS
CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ACTIVITY_LOG
CREATE POLICY "Users can view own activity log"
  ON public.activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity log"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- API_USAGE
CREATE POLICY "Users can view own API usage"
  ON public.api_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API usage"
  ON public.api_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- GMAIL TABLES POLICIES
-- =====================================================

-- GMAIL_MESSAGES
CREATE POLICY "Users can view own Gmail messages"
  ON public.gmail_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Gmail messages"
  ON public.gmail_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Gmail messages"
  ON public.gmail_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Gmail messages"
  ON public.gmail_messages FOR DELETE
  USING (auth.uid() = user_id);

-- GMAIL_THREADS
CREATE POLICY "Users can view own Gmail threads"
  ON public.gmail_threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Gmail threads"
  ON public.gmail_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Gmail threads"
  ON public.gmail_threads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Gmail threads"
  ON public.gmail_threads FOR DELETE
  USING (auth.uid() = user_id);

-- GMAIL_ATTACHMENTS
CREATE POLICY "Users can view own Gmail attachments"
  ON public.gmail_attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Gmail attachments"
  ON public.gmail_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- GMAIL_LABELS
CREATE POLICY "Users can view own Gmail labels"
  ON public.gmail_labels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Gmail labels"
  ON public.gmail_labels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Gmail labels"
  ON public.gmail_labels FOR UPDATE
  USING (auth.uid() = user_id);

-- GMAIL_DRAFTS
CREATE POLICY "Users can view own Gmail drafts"
  ON public.gmail_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Gmail drafts"
  ON public.gmail_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Gmail drafts"
  ON public.gmail_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Gmail drafts"
  ON public.gmail_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- GMAIL_SYNC_STATUS
CREATE POLICY "Users can view own Gmail sync status"
  ON public.gmail_sync_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Gmail sync status"
  ON public.gmail_sync_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Gmail sync status"
  ON public.gmail_sync_status FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- CALENDAR TABLES POLICIES
-- =====================================================

-- CALENDAR_EVENTS
CREATE POLICY "Users can view own calendar events"
  ON public.calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events"
  ON public.calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events"
  ON public.calendar_events FOR DELETE
  USING (auth.uid() = user_id);

-- CALENDARS
CREATE POLICY "Users can view own calendars"
  ON public.calendars FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendars"
  ON public.calendars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendars"
  ON public.calendars FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendars"
  ON public.calendars FOR DELETE
  USING (auth.uid() = user_id);

-- CALENDAR_SYNC_STATUS
CREATE POLICY "Users can view own calendar sync status"
  ON public.calendar_sync_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar sync status"
  ON public.calendar_sync_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar sync status"
  ON public.calendar_sync_status FOR UPDATE
  USING (auth.uid() = user_id);

-- CALENDAR_AVAILABILITY
CREATE POLICY "Users can view own calendar availability"
  ON public.calendar_availability FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar availability"
  ON public.calendar_availability FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar availability"
  ON public.calendar_availability FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar availability"
  ON public.calendar_availability FOR DELETE
  USING (auth.uid() = user_id);

-- CALENDAR_CONFLICTS
CREATE POLICY "Users can view own calendar conflicts"
  ON public.calendar_conflicts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar conflicts"
  ON public.calendar_conflicts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar conflicts"
  ON public.calendar_conflicts FOR UPDATE
  USING (auth.uid() = user_id);

-- FOCUS_TIME_BLOCKS
CREATE POLICY "Users can view own focus time blocks"
  ON public.focus_time_blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus time blocks"
  ON public.focus_time_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus time blocks"
  ON public.focus_time_blocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus time blocks"
  ON public.focus_time_blocks FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- DRIVE TABLES POLICIES
-- =====================================================

-- DRIVE_FILES
CREATE POLICY "Users can view own Drive files"
  ON public.drive_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Drive files"
  ON public.drive_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Drive files"
  ON public.drive_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Drive files"
  ON public.drive_files FOR DELETE
  USING (auth.uid() = user_id);

-- DRIVE_FOLDERS
CREATE POLICY "Users can view own Drive folders"
  ON public.drive_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Drive folders"
  ON public.drive_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Drive folders"
  ON public.drive_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Drive folders"
  ON public.drive_folders FOR DELETE
  USING (auth.uid() = user_id);

-- DRIVE_ACTIVITIES
CREATE POLICY "Users can view own Drive activities"
  ON public.drive_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Drive activities"
  ON public.drive_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DRIVE_SYNC_STATUS
CREATE POLICY "Users can view own Drive sync status"
  ON public.drive_sync_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Drive sync status"
  ON public.drive_sync_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Drive sync status"
  ON public.drive_sync_status FOR UPDATE
  USING (auth.uid() = user_id);

-- DRIVE_SEARCH_HISTORY
CREATE POLICY "Users can view own Drive search history"
  ON public.drive_search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Drive search history"
  ON public.drive_search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DRIVE_ALERTS
CREATE POLICY "Users can view own Drive alerts"
  ON public.drive_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Drive alerts"
  ON public.drive_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Drive alerts"
  ON public.drive_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- TASKS & WORKFLOWS POLICIES
-- =====================================================

-- TASKS
CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- WORKFLOWS
CREATE POLICY "Users can view own workflows"
  ON public.workflows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflows"
  ON public.workflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflows"
  ON public.workflows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workflows"
  ON public.workflows FOR DELETE
  USING (auth.uid() = user_id);

-- WORKFLOW_EXECUTIONS
CREATE POLICY "Users can view own workflow executions"
  ON public.workflow_executions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflow executions"
  ON public.workflow_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflow executions"
  ON public.workflow_executions FOR UPDATE
  USING (auth.uid() = user_id);

-- TASK_COMMENTS
CREATE POLICY "Users can view own task comments"
  ON public.task_comments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task comments"
  ON public.task_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own task comments"
  ON public.task_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own task comments"
  ON public.task_comments FOR DELETE
  USING (auth.uid() = user_id);

-- TASK_DEPENDENCIES
CREATE POLICY "Users can view task dependencies"
  ON public.task_dependencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_dependencies.task_id
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert task dependencies"
  ON public.task_dependencies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_dependencies.task_id
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete task dependencies"
  ON public.task_dependencies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_dependencies.task_id
      AND tasks.user_id = auth.uid()
    )
  );

-- OPEN_LOOPS
CREATE POLICY "Users can view own open loops"
  ON public.open_loops FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own open loops"
  ON public.open_loops FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own open loops"
  ON public.open_loops FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own open loops"
  ON public.open_loops FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- AI & ANALYTICS POLICIES
-- =====================================================

-- DAILY_BRIEFINGS
CREATE POLICY "Users can view own daily briefings"
  ON public.daily_briefings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily briefings"
  ON public.daily_briefings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily briefings"
  ON public.daily_briefings FOR UPDATE
  USING (auth.uid() = user_id);

-- AI_INSIGHTS
CREATE POLICY "Users can view own AI insights"
  ON public.ai_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI insights"
  ON public.ai_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI insights"
  ON public.ai_insights FOR UPDATE
  USING (auth.uid() = user_id);

-- COGNITIVE_LOAD_HISTORY
CREATE POLICY "Users can view own cognitive load history"
  ON public.cognitive_load_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cognitive load history"
  ON public.cognitive_load_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- PRODUCTIVITY_METRICS
CREATE POLICY "Users can view own productivity metrics"
  ON public.productivity_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own productivity metrics"
  ON public.productivity_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own productivity metrics"
  ON public.productivity_metrics FOR UPDATE
  USING (auth.uid() = user_id);

-- PATTERN_ANALYSIS
CREATE POLICY "Users can view own pattern analysis"
  ON public.pattern_analysis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pattern analysis"
  ON public.pattern_analysis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pattern analysis"
  ON public.pattern_analysis FOR UPDATE
  USING (auth.uid() = user_id);

-- AI_PROCESSING_QUEUE
CREATE POLICY "Users can view own AI processing queue"
  ON public.ai_processing_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI processing queue"
  ON public.ai_processing_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI processing queue"
  ON public.ai_processing_queue FOR UPDATE
  USING (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "Users can view own profile" ON public.user_profiles IS 'Users can only view their own profile data';
COMMENT ON POLICY "Users can view own Gmail messages" ON public.gmail_messages IS 'Users can only access their own Gmail messages';
COMMENT ON POLICY "Users can view own calendar events" ON public.calendar_events IS 'Users can only access their own calendar events';
COMMENT ON POLICY "Users can view own Drive files" ON public.drive_files IS 'Users can only access their own Drive files';
COMMENT ON POLICY "Users can view own tasks" ON public.tasks IS 'Users can only access their own tasks';
COMMENT ON POLICY "Users can view own AI insights" ON public.ai_insights IS 'Users can only access their own AI insights';
