-- Migration: Add scheduled_post_id to products table
-- Purpose: Link products to AI scheduled posts
-- Date: 2026-01-11

-- Add scheduled_post_id column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS scheduled_post_id UUID REFERENCES scheduled_posts(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_products_scheduled_post_id ON products(scheduled_post_id);

-- Add comment
COMMENT ON COLUMN products.scheduled_post_id IS 'ID do post agendado pela IA, se aplicável';
