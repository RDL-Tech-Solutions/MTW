-- =====================================================
-- FIX RÁPIDO: Corrigir coluna status na tabela products
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Passo 1: Adicionar coluna status se não existir
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Passo 2: Remover constraint antiga se existir
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_status_check;

-- Passo 3: Adicionar constraint CHECK
ALTER TABLE products 
ADD CONSTRAINT products_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'published'));

-- Passo 4: Adicionar coluna original_link se não existir
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS original_link TEXT;

-- Passo 5: Atualizar produtos existentes (se status for NULL, definir como 'published')
UPDATE products 
SET status = 'published'
WHERE status IS NULL;

-- Passo 6: Garantir que todos os produtos tenham status válido
UPDATE products 
SET status = 'published'
WHERE status NOT IN ('pending', 'approved', 'rejected', 'published');

-- Passo 7: Criar índice
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Passo 8: Recriar view
DROP VIEW IF EXISTS products_full;

CREATE VIEW products_full AS
SELECT 
  p.*,
  c.name as category_name,
  c.slug as category_slug,
  c.icon as category_icon,
  cp.code as coupon_code,
  cp.discount_type as coupon_discount_type,
  cp.discount_value as coupon_discount_value,
  cp.valid_until as coupon_valid_until,
  cp.is_vip as coupon_is_vip
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN coupons cp ON p.coupon_id = cp.id;

-- Verificação final - deve mostrar as colunas status e original_link
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN ('status', 'original_link')
ORDER BY column_name;







