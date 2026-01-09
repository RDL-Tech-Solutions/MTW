-- Add use_ai_keywords column to sync_config table
ALTER TABLE sync_config
ADD COLUMN IF NOT EXISTS use_ai_keywords BOOLEAN DEFAULT FALSE;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
