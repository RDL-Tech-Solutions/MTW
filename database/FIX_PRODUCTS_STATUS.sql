-- =====================================================
-- FIX: Corrigir coluna status na tabela products
-- Data: 18/12/2024
-- Descrição: Corrige problemas com a coluna status e original_link
-- =====================================================

-- 1. Remover constraint antiga se existir (caso tenha sido criada incorretamente)
DO $$ 
BEGIN
    -- Remover constraint de status se existir
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname LIKE '%products_status%' 
        AND conrelid = 'products'::regclass
    ) THEN
        ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
    END IF;
END $$;

-- 2. Adicionar coluna status se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
    END IF;
END $$;

-- 3. Adicionar constraint CHECK para status
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_status_check;

ALTER TABLE products 
ADD CONSTRAINT products_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'published'));

-- 4. Adicionar coluna original_link se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'original_link'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN original_link TEXT;
    END IF;
END $$;

-- 5. Atualizar valores NULL de status para 'published' (produtos existentes)
UPDATE products 
SET status = 'published' 
WHERE status IS NULL;

-- 6. Garantir que produtos existentes tenham status válido
UPDATE products 
SET status = 'published' 
WHERE status NOT IN ('pending', 'approved', 'rejected', 'published');

-- 7. Copiar affiliate_link para original_link nos produtos existentes (se original_link estiver NULL)
UPDATE products 
SET original_link = affiliate_link 
WHERE original_link IS NULL 
  AND affiliate_link IS NOT NULL;

-- 8. Criar índice para busca por status (se não existir)
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- 9. Recriar a view products_full para incluir os novos campos
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

-- 10. Adicionar comentários
COMMENT ON COLUMN products.status IS 'Status do produto: pending (aguardando aprovação), approved (aprovado), rejected (rejeitado), published (publicado)';
COMMENT ON COLUMN products.original_link IS 'Link original do produto antes da conversão para link de afiliado';

-- 11. Verificar se tudo foi criado corretamente
DO $$ 
DECLARE
    status_exists BOOLEAN;
    original_link_exists BOOLEAN;
    index_exists BOOLEAN;
BEGIN
    -- Verificar coluna status
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'status'
    ) INTO status_exists;
    
    -- Verificar coluna original_link
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'original_link'
    ) INTO original_link_exists;
    
    -- Verificar índice
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'products' 
        AND indexname = 'idx_products_status'
    ) INTO index_exists;
    
    RAISE NOTICE 'Status da migração:';
    RAISE NOTICE '  - Coluna status existe: %', status_exists;
    RAISE NOTICE '  - Coluna original_link existe: %', original_link_exists;
    RAISE NOTICE '  - Índice idx_products_status existe: %', index_exists;
END $$;





