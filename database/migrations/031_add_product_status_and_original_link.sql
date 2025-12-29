-- =====================================================
-- Migration: Adicionar status e original_link aos produtos
-- Data: 18/12/2024
-- =====================================================

-- Adicionar coluna status na tabela products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected', 'published'));

-- Adicionar coluna original_link para armazenar o link original do produto
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS original_link TEXT;

-- Se já existirem produtos, marcar como 'published' (já foram publicados)
UPDATE products 
SET status = 'published' 
WHERE status IS NULL OR status = 'pending';

-- Copiar affiliate_link para original_link nos produtos existentes
UPDATE products 
SET original_link = affiliate_link 
WHERE original_link IS NULL AND affiliate_link IS NOT NULL;

-- Criar índice para busca por status
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Atualizar view products_full para incluir os novos campos
-- IMPORTANTE: Dropar a view primeiro para evitar conflitos de colunas
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

-- Comentários
COMMENT ON COLUMN products.status IS 'Status do produto: pending (aguardando aprovação), approved (aprovado), rejected (rejeitado), published (publicado)';
COMMENT ON COLUMN products.original_link IS 'Link original do produto antes da conversão para link de afiliado';








