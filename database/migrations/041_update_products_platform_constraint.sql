-- Migration: Update products table constraint to allow new platforms
-- Date: 2026-01-13
-- Description: Add kabum, magazineluiza, and terabyteshop to allowed platforms in products table

-- Drop existing constraint
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_platform_check;

-- Add new constraint with all 7 platforms
ALTER TABLE products 
ADD CONSTRAINT products_platform_check 
CHECK (platform IN (
  'mercadolivre', 
  'shopee', 
  'amazon', 
  'aliexpress', 
  'kabum', 
  'magazineluiza', 
  'terabyteshop',
  'general'
));

-- Comment
COMMENT ON CONSTRAINT products_platform_check ON products IS 'Ensures platform field contains only valid e-commerce platform values';
