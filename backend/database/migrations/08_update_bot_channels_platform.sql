-- Migration to update bot_channels platform check constraint
-- Created to allow 'whatsapp_web' platform

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find and drop the check constraint on platform column
    FOR r IN (
        SELECT cc.constraint_name
        FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage ccu
        ON cc.constraint_name = ccu.constraint_name
        WHERE ccu.table_name = 'bot_channels'
        AND ccu.column_name = 'platform'
    ) LOOP
        EXECUTE 'ALTER TABLE bot_channels DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- Add new constraint
ALTER TABLE bot_channels 
ADD CONSTRAINT bot_channels_platform_check 
CHECK (platform IN ('whatsapp', 'telegram', 'whatsapp_web'));
