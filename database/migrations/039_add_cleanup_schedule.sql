-- Migration: Add cleanup schedule configuration
-- Description: Adds configurable hour for auto-deletion cleanup job
-- Date: 2026-01-10

-- Add cleanup_schedule_hour to app_settings
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS cleanup_schedule_hour INTEGER DEFAULT 3 CHECK (cleanup_schedule_hour >= 0 AND cleanup_schedule_hour <= 23);

-- Add cleanup_last_run to track last execution
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS cleanup_last_run TIMESTAMP WITH TIME ZONE;

-- Update existing record to have the default value
UPDATE app_settings 
SET cleanup_schedule_hour = 3 
WHERE id = '00000000-0000-0000-0000-000000000001' 
  AND cleanup_schedule_hour IS NULL;

-- Add comment
COMMENT ON COLUMN app_settings.cleanup_schedule_hour IS 'Hour (0-23) when automatic cleanup job runs daily';
COMMENT ON COLUMN app_settings.cleanup_last_run IS 'Timestamp of last cleanup execution';
