-- Migration: Add new platforms (Kabum, Magazine Luiza, Terabyteshop) to sync_config
-- Date: 2026-01-13

-- Add columns for Kabum
ALTER TABLE sync_config
ADD COLUMN IF NOT EXISTS kabum_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS kabum_auto_publish BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS kabum_shorten_link BOOLEAN DEFAULT FALSE;

-- Add columns for Magazine Luiza (Magalu)
ALTER TABLE sync_config
ADD COLUMN IF NOT EXISTS magazineluiza_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS magazineluiza_auto_publish BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS magazineluiza_shorten_link BOOLEAN DEFAULT FALSE;

-- Add columns for Terabyteshop
ALTER TABLE sync_config
ADD COLUMN IF NOT EXISTS terabyteshop_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terabyteshop_auto_publish BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terabyteshop_shorten_link BOOLEAN DEFAULT FALSE;

-- Comment
COMMENT ON COLUMN sync_config.kabum_enabled IS 'Enable Kabum product sync (web scraping)';
COMMENT ON COLUMN sync_config.magazineluiza_enabled IS 'Enable Magazine Luiza product sync (web scraping)';
COMMENT ON COLUMN sync_config.terabyteshop_enabled IS 'Enable Terabyteshop product sync (web scraping)';
