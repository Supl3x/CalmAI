-- =====================================================
-- CALMFLOW AI - MASTER DATABASE SCHEMA
-- =====================================================
-- Complete schema for all tables used in the application
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: DROP ALL EXISTING TABLES
-- =====================================================
DROP TABLE IF EXISTS public.drafts CASCADE;
DROP TABLE IF EXISTS public.focus_sessions CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.open_loops CASCADE;
DROP TABLE IF EXISTS public.daily_briefings CASCADE;
DROP TABLE IF EXISTS public.summaries CASCADE;
DROP TABLE IF EXISTS public.analytics CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =====================================================
-- STEP 2: CREATE CORE TABLES
-- =====================================================

-- PROFILES TABLE
-- Stores user profile information and Google OAuth tokens
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User info
  full_name TEXT,
  avatar_url TEXT,
  
  -- Google OAuth tokens
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TIMESTAMPTZ,
  
  -- User preferences
  focus_duration INTEGER DEFAULT 25,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASKS TABLE
-- Stores user tasks and AI-generated subtasks
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  
  -- AI metadata
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_source TEXT DEFAULT 'decomposer',
  ai_parent_prompt TEXT,
  ai_difficulty TEXT CHECK (ai_difficulty IN ('easy', 'medium', 'hard')),
  
  -- Priority
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  ai_priority_score INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')),
  is_complete BOOLEAN GENERATED ALWAYS AS (status = 'completed') STORED,
  
  -- Legacy fields for backward compatibility
  priority_score INTEGER GENERATED ALWAYS AS (ai_priority_score) STORED,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- OPEN_LOOPS TABLE
-- Tracks incomplete or pending items (mental loops)
CREATE TABLE public.open_loops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Loop details
  title TEXT NOT NULL,
  description TEXT,
  
  -- Source
  source_type TEXT CHECK (source_type IN ('email', 'task', 'calendar', 'drive', 'manual')),
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'dismissed')),
  is_complete BOOLEAN GENERATED ALWAYS AS (status = 'closed') STORED,
  
  -- AI detection
  ai_detected BOOLEAN DEFAULT FALSE,
  ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 0 AND 100),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- DAILY_BRIEFINGS TABLE
-- Stores AI-generated daily briefings
CREATE TABLE public.daily_briefings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  briefing_date DATE DEFAULT CURRENT_DATE,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, briefing_date)
);

-- FOCUS_SESSIONS TABLE
-- Tracks focus/pomodoro sessions
CREATE TABLE public.focus_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  session_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DRAFTS TABLE
-- Stores AI-generated drafts (emails, messages, etc.)
CREATE TABLE public.drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  draft_type TEXT NOT NULL,
  context TEXT,
  generated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUMMARIES TABLE
-- Stores text summaries
CREATE TABLE public.summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_text TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ANALYTICS TABLE
-- Stores weekly analytics and productivity metrics
CREATE TABLE public.analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  loops_closed INTEGER DEFAULT 0,
  focus_minutes INTEGER DEFAULT 0,
  productivity_score INTEGER DEFAULT 0,
  ai_insights TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- =====================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_id ON public.profiles(id);

-- Tasks indexes
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_is_complete ON public.tasks(is_complete);
CREATE INDEX idx_tasks_priority_score ON public.tasks(ai_priority_score DESC);
CREATE INDEX idx_tasks_created_at ON public.tasks(created_at DESC);

-- Open loops indexes
CREATE INDEX idx_open_loops_user_id ON public.open_loops(user_id);
CREATE INDEX idx_open_loops_status ON public.open_loops(status);
CREATE INDEX idx_open_loops_is_complete ON public.open_loops(is_complete);
CREATE INDEX idx_open_loops_created_at ON public.open_loops(created_at DESC);

-- Daily briefings indexes
CREATE INDEX idx_daily_briefings_user_id ON public.daily_briefings(user_id);
CREATE INDEX idx_daily_briefings_date ON public.daily_briefings(briefing_date DESC);

-- Focus sessions indexes
CREATE INDEX idx_focus_sessions_user_id ON public.focus_sessions(user_id);
CREATE INDEX idx_focus_sessions_date ON public.focus_sessions(session_date DESC);

-- Drafts indexes
CREATE INDEX idx_drafts_user_id ON public.drafts(user_id);
CREATE INDEX idx_drafts_created_at ON public.drafts(created_at DESC);

-- Analytics indexes
CREATE INDEX idx_analytics_user_id ON public.analytics(user_id);
CREATE INDEX idx_analytics_week_start ON public.analytics(week_start DESC);

-- =====================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_loops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Tasks policies
CREATE POLICY "Users can manage own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);

-- Open loops policies
CREATE POLICY "Users can manage own loops" ON public.open_loops FOR ALL USING (auth.uid() = user_id);

-- Daily briefings policies
CREATE POLICY "Users can manage own briefings" ON public.daily_briefings FOR ALL USING (auth.uid() = user_id);

-- Focus sessions policies
CREATE POLICY "Users can manage own sessions" ON public.focus_sessions FOR ALL USING (auth.uid() = user_id);

-- Drafts policies
CREATE POLICY "Users can manage own drafts" ON public.drafts FOR ALL USING (auth.uid() = user_id);

-- Summaries policies
CREATE POLICY "Users can manage own summaries" ON public.summaries FOR ALL USING (auth.uid() = user_id);

-- Analytics policies
CREATE POLICY "Users can manage own analytics" ON public.analytics FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- STEP 6: CREATE TRIGGERS FOR UPDATED_AT
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
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_open_loops_updated_at
    BEFORE UPDATE ON public.open_loops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 7: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 8: REFRESH SCHEMA CACHE
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the schema was created correctly:
-- 
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT * FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks';
-- SELECT * FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'open_loops';
-- =====================================================
