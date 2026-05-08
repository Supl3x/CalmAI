# CalmFlow AI - Database Schema Documentation

## 📋 Overview

This directory contains the complete database schema for CalmFlow AI. The master schema includes all tables, indexes, RLS policies, and triggers needed for the application.

## 🚀 Quick Start

### Step 1: Run the Master Schema

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy the contents of `MASTER_SCHEMA.sql`
4. Run the query

This will:
- Drop all existing tables (⚠️ **WARNING: This deletes all data!**)
- Create all required tables with correct structure
- Set up indexes for performance
- Enable Row Level Security (RLS)
- Create RLS policies
- Set up triggers for auto-updating timestamps
- Create helper functions

### Step 2: Verify Installation

Run these queries in SQL Editor to verify:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check tasks table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tasks';

-- Check open_loops table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'open_loops';
```

## 📊 Database Tables

### Core Tables

#### 1. **profiles**
Stores user profile information and Google OAuth tokens.

**Key Fields:**
- `id` - User ID (references auth.users)
- `full_name` - User's full name
- `avatar_url` - Profile picture URL
- `google_access_token` - Google OAuth access token
- `google_refresh_token` - Google OAuth refresh token
- `google_token_expiry` - Token expiration timestamp
- `focus_duration` - Preferred focus session duration (default: 25 min)
- `onboarding_complete` - Whether user completed onboarding

#### 2. **tasks**
Stores user tasks and AI-generated subtasks.

**Key Fields:**
- `title` - Task name/title
- `description` - Task description or context
- `ai_generated` - Whether task was AI-generated
- `ai_source` - Source of AI generation ('decomposer', etc.)
- `ai_parent_prompt` - Original prompt that generated this task
- `ai_difficulty` - Difficulty level ('easy', 'medium', 'hard')
- `priority` - Priority level ('low', 'medium', 'high', 'urgent')
- `ai_priority_score` - Calculated priority score (0-100)
- `status` - Task status ('todo', 'in_progress', 'completed', 'cancelled')
- `is_complete` - **Generated column** for backward compatibility
- `priority_score` - **Generated column** (alias for ai_priority_score)

#### 3. **open_loops**
Tracks incomplete or pending items (mental loops).

**Key Fields:**
- `title` - Loop title/content
- `description` - Additional details or classification
- `source_type` - Source ('email', 'calendar', 'drive', 'manual')
- `status` - Loop status ('open', 'in_progress', 'closed', 'dismissed')
- `is_complete` - **Generated column** for backward compatibility
- `ai_detected` - Whether AI detected this loop
- `ai_confidence_score` - AI confidence (0-100)

#### 4. **daily_briefings**
Stores AI-generated daily briefings.

**Key Fields:**
- `briefing_date` - Date of briefing
- `content` - JSONB containing briefing data

#### 5. **focus_sessions**
Tracks focus/pomodoro sessions.

**Key Fields:**
- `duration_minutes` - Session duration
- `session_date` - Date of session

#### 6. **drafts**
Stores AI-generated drafts (emails, messages, etc.).

**Key Fields:**
- `draft_type` - Type of draft
- `context` - Context provided for generation
- `generated_text` - AI-generated text

#### 7. **summaries**
Stores text summaries.

**Key Fields:**
- `original_text` - Original text
- `summary_text` - AI-generated summary

#### 8. **analytics**
Stores weekly analytics and productivity metrics.

**Key Fields:**
- `week_start` - Start date of week
- `tasks_completed` - Number of tasks completed
- `loops_closed` - Number of loops closed
- `focus_minutes` - Total focus time
- `productivity_score` - Calculated productivity score
- `ai_insights` - AI-generated insights

## 🔒 Security

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- Data is isolated by `user_id` or `auth.uid()`

### Policies

Each table has a policy named "Users can manage own [table]" that:
- Allows SELECT, INSERT, UPDATE, DELETE
- Only for rows where `user_id = auth.uid()`

## ⚡ Performance

### Indexes

The schema includes indexes on:
- All `user_id` columns
- Status/completion fields
- Priority/score fields
- Date fields
- Frequently queried combinations

### Generated Columns

Some columns are automatically calculated:
- `tasks.is_complete` - Generated from `status = 'completed'`
- `tasks.priority_score` - Alias for `ai_priority_score`
- `open_loops.is_complete` - Generated from `status = 'closed'`

These provide backward compatibility without storing duplicate data.

## 🔄 Triggers

### Auto-Update Timestamps

Tables with `updated_at` columns automatically update on modification:
- `profiles`
- `tasks`
- `open_loops`

### Auto-Create Profile

When a new user signs up, a profile is automatically created with:
- User ID from auth.users
- Full name from user metadata
- Avatar URL from user metadata

## 🛠️ Maintenance

### Backup Before Running

⚠️ **IMPORTANT:** The master schema drops all existing tables. Always backup your data first!

```sql
-- Backup example
CREATE TABLE tasks_backup AS SELECT * FROM tasks;
CREATE TABLE open_loops_backup AS SELECT * FROM open_loops;
```

### Migration from Old Schema

If you have existing data, you'll need to:
1. Export data from old tables
2. Run the master schema
3. Transform and import data to match new structure

## 📝 Frontend Compatibility

The schema is designed to work with the current frontend code in:
- `src/pages/MicroTaskDecomposer.jsx`
- `src/pages/OpenLoopCleaner.jsx`
- `src/pages/PriorityEngine.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/WeeklyReport.jsx`
- `src/pages/DailyBriefing.jsx`
- `src/pages/CalmMode.jsx`
- `src/pages/AIDraft.jsx`

All frontend components have been updated to use the correct field names.

## 🐛 Troubleshooting

### Issue: Tables not appearing

**Solution:** Run `NOTIFY pgrst, 'reload schema';` in SQL Editor

### Issue: RLS blocking queries

**Solution:** Check that policies are created and user is authenticated

### Issue: Generated columns not working

**Solution:** Ensure PostgreSQL version supports `GENERATED ALWAYS AS`

## 📚 Additional Files

- `MASTER_SCHEMA.sql` - Complete schema (use this!)
- `WORKING_SCHEMA.sql` - Simplified version (deprecated)
- `SIMPLE_TASKS_SCHEMA.sql` - Minimal tasks table (deprecated)

## ✅ Verification Checklist

After running the schema:

- [ ] All 8 tables created
- [ ] RLS enabled on all tables
- [ ] Policies created for all tables
- [ ] Indexes created
- [ ] Triggers working
- [ ] Frontend can query tables
- [ ] Frontend can insert data
- [ ] Frontend can update data

## 🎯 Next Steps

1. Run `MASTER_SCHEMA.sql` in Supabase SQL Editor
2. Verify tables with verification queries
3. Test frontend functionality
4. Deploy updated Edge Functions if needed
5. Monitor for any errors in browser console

---

**Last Updated:** 2026-05-09  
**Schema Version:** 1.0.0  
**Compatible Frontend Version:** main branch (commit 3547b27)
