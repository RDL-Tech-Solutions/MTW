-- =====================================================
-- FIX SIMPLES: Adicionar coluna status
-- Copie e cole este SQL no Supabase SQL Editor
-- =====================================================

-- Adicionar coluna status
ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Adicionar constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'published'));

-- Adicionar coluna original_link
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_link TEXT;

-- Atualizar produtos existentes
UPDATE products SET status = 'published' WHERE status IS NULL;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Recriar view
DROP VIEW IF EXISTS products_full;
CREATE VIEW products_full AS
SELECT p.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon,
       cp.code as coupon_code, cp.discount_type as coupon_discount_type,
       cp.discount_value as coupon_discount_value, cp.valid_until as coupon_valid_until,
       cp.is_vip as coupon_is_vip
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN coupons cp ON p.coupon_id = cp.id;







