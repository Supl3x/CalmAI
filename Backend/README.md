# CalmFlow AI / NEXUS - Database Schema

## Overview
This folder contains the complete database schema for the CalmFlow AI (NEXUS) project, designed for use with Supabase PostgreSQL and Google OAuth authentication.

## Structure

```
Database/
├── Schema/
│   ├── 01_core_tables.sql          # User profiles, settings, sessions, activity log
│   ├── 02_gmail_tables.sql         # Gmail messages, threads, attachments, labels
│   ├── 03_calendar_tables.sql      # Calendar events, availability, conflicts
│   ├── 04_drive_tables.sql         # Drive files, folders, activities, alerts
│   ├── 05_tasks_workflows.sql      # Tasks, workflows, dependencies, open loops
│   └── 06_ai_insights.sql          # AI briefings, insights, metrics, notifications
├── RLS_POLICIES.sql                # Row Level Security policies for all tables
└── README.md                       # This file
```

## Quick Start

### 1. Prerequisites
- Supabase project created
- PostgreSQL access (via Supabase SQL Editor or psql)
- Google OAuth configured in Supabase

### 2. Run Migrations

Execute SQL files in order:

```bash
# Option A: Using Supabase SQL Editor
# Copy and paste each file's contents into the SQL Editor and run

# Option B: Using psql
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f Database/Schema/01_core_tables.sql
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f Database/Schema/02_gmail_tables.sql
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f Database/Schema/03_calendar_tables.sql
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f Database/Schema/04_drive_tables.sql
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f Database/Schema/05_tasks_workflows.sql
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f Database/Schema/06_ai_insights.sql
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f Database/RLS_POLICIES.sql
```

### 3. Verify Installation

```sql
-- Check all tables created (should return 36 tables)
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;
-- Should return 0 rows
```

## Schema Overview

### Total Tables: 36

| Category | Count | Tables |
|----------|-------|--------|
| **Core** | 5 | user_profiles, user_settings, user_sessions, activity_log, api_usage |
| **Gmail** | 6 | gmail_messages, gmail_threads, gmail_attachments, gmail_labels, gmail_drafts, gmail_sync_status |
| **Calendar** | 6 | calendar_events, calendars, calendar_sync_status, calendar_availability, calendar_conflicts, focus_time_blocks |
| **Drive** | 6 | drive_files, drive_folders, drive_activities, drive_sync_status, drive_search_history, drive_alerts |
| **Tasks** | 6 | tasks, workflows, workflow_executions, task_comments, task_dependencies, open_loops |
| **AI** | 7 | daily_briefings, ai_insights, cognitive_load_history, productivity_metrics, pattern_analysis, ai_processing_queue, notifications |

## Key Features

### 🔒 Security
- **Row Level Security (RLS)** enabled on all tables
- Users can only access their own data
- Google OAuth tokens stored securely
- Comprehensive audit logging

### 🔍 Search
- Full-text search on emails, events, files, and tasks
- Optimized indexes for performance
- JSONB fields for flexible data structures

### 🤖 AI Integration
- AI processing queue for async operations
- Cognitive load tracking
- Pattern analysis and insights
- Daily briefings generation

### 🔄 Sync
- Incremental sync support (history IDs, sync tokens, page tokens)
- Sync status tracking per service
- Error tracking and retry logic

### 📊 Analytics
- Productivity metrics (daily, weekly, monthly)
- Time tracking
- Workflow completion rates
- AI efficiency scores

## Data Model

### Core Relationships

```
auth.users (Supabase)
    ↓
user_profiles
    ↓
    ├── gmail_messages → gmail_threads → gmail_attachments
    ├── calendar_events → calendars
    ├── drive_files → drive_folders
    ├── tasks → tasks (parent-child) → task_comments
    ├── workflows → workflow_executions
    ├── daily_briefings
    ├── ai_insights
    └── notifications
```

### Linked Resources

Tasks can link to:
- Gmail messages (`linked_email_id`)
- Calendar events (`linked_event_id`)
- Drive files (`linked_file_id`)

## Security Model

### RLS Policies
All tables have policies for:
- **SELECT**: Users can view their own data
- **INSERT**: Users can create their own data
- **UPDATE**: Users can update their own data
- **DELETE**: Users can delete their own data (where applicable)

### Special Cases
- `activity_log`: Append-only (no UPDATE/DELETE)
- `task_dependencies`: Access via task ownership
- Google tokens: Should be encrypted at application level

## JSONB Fields

Flexible data structures using JSONB:

| Table | Field | Purpose |
|-------|-------|---------|
| user_settings | dashboard_layout | Widget configuration |
| gmail_messages | ai_suggested_actions | AI-generated action items |
| calendar_events | attendees | Event participants |
| calendar_events | conference_data | Meeting platform details |
| drive_files | permissions | Sharing permissions |
| tasks | tags | Task categorization |
| workflows | steps | Workflow step definitions |
| daily_briefings | critical_priorities | Priority items |
| ai_insights | suggested_actions | AI recommendations |
| productivity_metrics | * | Various metric objects |

## Triggers

### Auto-Update Timestamps
Tables with `updated_at` column automatically update on modification:
- user_profiles
- user_settings
- gmail_messages
- gmail_threads
- gmail_labels
- gmail_drafts
- gmail_sync_status
- calendar_events
- calendars
- calendar_sync_status
- calendar_availability
- focus_time_blocks
- drive_files
- drive_folders
- drive_sync_status
- drive_alerts
- tasks
- workflows
- task_comments
- open_loops
- pattern_analysis

### User Creation
- `on_auth_user_created`: Automatically creates user_profiles and user_settings on signup

## Indexes

### Performance Indexes
- User ID on all tables (for RLS)
- Date ranges for time-based queries
- Status flags for filtering
- Priority scores for sorting
- Soft delete (deleted_at) for active records

### Full-Text Search Indexes
- gmail_messages: subject + body
- calendar_events: title + description
- drive_files: name + description
- tasks: title + description

## Maintenance

### Regular Tasks
- **Daily**: Monitor api_usage for rate limits
- **Weekly**: Review activity_log for anomalies
- **Monthly**: Analyze productivity_metrics trends
- **Quarterly**: Archive old data (respect data_retention_days)

### Data Cleanup
- Soft deletes: Set `deleted_at` timestamp
- Hard deletes: Respect user's `data_retention_days` setting
- Sync status: Clean up old error logs
- Activity log: Archive after retention period

## Migration Strategy

### Phase 1: Core (Required)
1. Run `01_core_tables.sql`
2. Run core RLS policies
3. Test user registration

### Phase 2: Google Services (Required)
1. Run `02_gmail_tables.sql`
2. Run `03_calendar_tables.sql`
3. Run `04_drive_tables.sql`
4. Run RLS policies for these tables
5. Test Google OAuth and sync

### Phase 3: Features (Required)
1. Run `05_tasks_workflows.sql`
2. Run `06_ai_insights.sql`
3. Run remaining RLS policies
4. Test task creation and AI processing

### Phase 4: Optimization (Optional)
1. Monitor query performance
2. Add additional indexes as needed
3. Optimize JSONB queries
4. Set up database backups

## Rollback

To remove all tables:

```sql
-- WARNING: This will delete all data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

## Support

For issues or questions:
1. Check the `_planning/` folder for detailed documentation
2. Review the integration guide: `_planning/03_INTEGRATION_GUIDE.md`
3. Check the schema summary: `_planning/02_DATABASE_SCHEMA_SUMMARY.md`

## License

This schema is part of the CalmFlow AI project.
