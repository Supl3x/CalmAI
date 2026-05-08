-- Add missing columns to profiles table for sync tracking

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_gmail_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_calendar_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_drive_sync TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_gmail_sync ON profiles(last_gmail_sync);
CREATE INDEX IF NOT EXISTS idx_profiles_last_calendar_sync ON profiles(last_calendar_sync);

COMMENT ON COLUMN profiles.last_gmail_sync IS 'Last time Gmail data was synced';
COMMENT ON COLUMN profiles.last_calendar_sync IS 'Last time Calendar data was synced';
COMMENT ON COLUMN profiles.last_drive_sync IS 'Last time Drive data was synced';
