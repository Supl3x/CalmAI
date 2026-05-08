# CalmFlow AI / NEXUS - Database Functions

## Overview
This folder contains PostgreSQL functions for the CalmFlow AI project. These functions handle user management, Google OAuth, and sync operations.

## Files

### 1. `01_user_management.sql`
Functions for user profile creation and management:
- `handle_new_user()` - Trigger function that creates profile and settings on signup
- `update_last_login()` - Updates last login timestamp
- `soft_delete_user(user_id)` - Soft deletes user and all their data
- `hard_delete_user_data(user_id)` - Permanently deletes old data (respects retention policy)
- `get_user_stats(user_id)` - Returns user statistics for dashboard

### 2. `02_google_oauth.sql`
Functions for managing Google OAuth tokens:
- `store_google_tokens(user_id, access_token, refresh_token, expires_at)` - Stores OAuth tokens
- `get_google_access_token(user_id)` - Retrieves token and checks if expired
- `revoke_google_access(user_id)` - Removes tokens when user disconnects
- `get_expiring_tokens(minutes_before)` - Returns users whose tokens are about to expire

### 3. `03_sync_helpers.sql`
Functions to help with Gmail, Calendar, and Drive sync:
- `update_gmail_sync_status(user_id, status, message_count, error)` - Updates Gmail sync status
- `update_calendar_sync_status(user_id, calendar_id, status, event_count, error)` - Updates Calendar sync status
- `update_drive_sync_status(user_id, status, file_count, error)` - Updates Drive sync status
- `get_users_needing_sync(service)` - Returns users who need to sync based on frequency

## Installation

Run these files in order after running the schema files:

```bash
# Using Supabase SQL Editor or psql
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f Database/Functions/01_user_management.sql
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f Database/Functions/02_google_oauth.sql
psql -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f Database/Functions/03_sync_helpers.sql
```

Or copy and paste each file's contents into the Supabase SQL Editor.

## Usage Examples

### User Management

```sql
-- Get user statistics
SELECT * FROM public.get_user_stats('user-uuid-here');

-- Soft delete a user
SELECT public.soft_delete_user('user-uuid-here');

-- Clean up old deleted data
SELECT public.hard_delete_user_data('user-uuid-here');
```

### Google OAuth

```sql
-- Store Google tokens (called from application after OAuth)
SELECT public.store_google_tokens(
  'user-uuid-here',
  'access-token',
  'refresh-token',
  NOW() + INTERVAL '1 hour'
);

-- Get access token and check if expired
SELECT * FROM public.get_google_access_token('user-uuid-here');

-- Revoke Google access
SELECT public.revoke_google_access('user-uuid-here');

-- Get users with expiring tokens (for background job)
SELECT * FROM public.get_expiring_tokens(10); -- 10 minutes before expiry
```

### Sync Helpers

```sql
-- Update Gmail sync status after sync
SELECT public.update_gmail_sync_status(
  'user-uuid-here',
  'idle',
  25, -- message count
  NULL -- no error
);

-- Update with error
SELECT public.update_gmail_sync_status(
  'user-uuid-here',
  'error',
  0,
  'Rate limit exceeded'
);

-- Get users needing Gmail sync
SELECT * FROM public.get_users_needing_sync('gmail');

-- Get users needing Calendar sync
SELECT * FROM public.get_users_needing_sync('calendar');

-- Get users needing Drive sync
SELECT * FROM public.get_users_needing_sync('drive');
```

## Triggers

### Automatic User Profile Creation
When a new user signs up via Google OAuth, the `on_auth_user_created` trigger automatically:
1. Creates a user profile in `user_profiles`
2. Creates default settings in `user_settings`
3. Logs the signup in `activity_log`

This happens automatically - no application code needed!

## Security

All functions are created with `SECURITY DEFINER`, which means they run with the privileges of the user who created them (the database owner). This allows them to:
- Access the `auth.users` table
- Perform operations that might be restricted by RLS
- Ensure data consistency across related tables

However, RLS policies still apply to the calling user, so users can only access their own data.

## Background Jobs

These functions are designed to be called by background jobs:

1. **Token Refresh Job** (every 5 minutes)
   ```sql
   SELECT * FROM public.get_expiring_tokens(10);
   -- For each user, refresh their token
   ```

2. **Sync Job** (every 15 minutes for Gmail, 30 for Calendar, 60 for Drive)
   ```sql
   SELECT * FROM public.get_users_needing_sync('gmail');
   -- For each user, trigger sync
   ```

3. **Data Cleanup Job** (daily)
   ```sql
   SELECT public.hard_delete_user_data(id) FROM public.user_profiles;
   ```

## Testing

After installation, test the functions:

```sql
-- Test user stats (should return zeros for new user)
SELECT * FROM public.get_user_stats(auth.uid());

-- Test sync status functions
SELECT public.update_gmail_sync_status(auth.uid(), 'idle', 0, NULL);
SELECT public.update_calendar_sync_status(auth.uid(), NULL, 'idle', 0, NULL);
SELECT public.update_drive_sync_status(auth.uid(), 'idle', 0, NULL);

-- Verify sync status created
SELECT * FROM public.gmail_sync_status WHERE user_id = auth.uid();
SELECT * FROM public.calendar_sync_status WHERE user_id = auth.uid();
SELECT * FROM public.drive_sync_status WHERE user_id = auth.uid();
```

## Notes

- Functions use `SECURITY DEFINER` to bypass RLS when needed
- All functions log important actions to `activity_log`
- Error handling is built into sync status functions
- Token expiry checking helps prevent API failures
- Soft delete preserves data for retention period
- Hard delete respects user's data retention settings

## Support

For issues or questions, refer to:
- Main database README: `../README.md`
- Integration guide: `../../_planning/03_INTEGRATION_GUIDE.md`
