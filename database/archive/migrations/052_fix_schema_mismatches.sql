-- Migração para corrigir discrepâncias entre o código e o banco de dados
-- Adiciona colunas faltantes e cria views necessárias

-- =============================================
-- 1. TABELA PRODUCTS
-- =============================================

-- Adicionar coluna 'status'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'status') THEN
        ALTER TABLE products ADD COLUMN status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('pending', 'approved', 'published', 'rejected'));
    END IF;
END $$;

-- Adicionar coluna 'original_link'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'original_link') THEN
        ALTER TABLE products ADD COLUMN original_link TEXT;
    END IF;
END $$;

-- =============================================
-- 2. TABELA COUPONS
-- =============================================

-- Adicionar coluna 'is_out_of_stock'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'is_out_of_stock') THEN
        ALTER TABLE coupons ADD COLUMN is_out_of_stock BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Adicionar coluna 'is_pending_approval'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'is_pending_approval') THEN
        ALTER TABLE coupons ADD COLUMN is_pending_approval BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Adicionar coluna 'is_exclusive'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'is_exclusive') THEN
        ALTER TABLE coupons ADD COLUMN is_exclusive BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Adicionar colunas de rastreamento de origem do Telegram
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'capture_source') THEN
        ALTER TABLE coupons ADD COLUMN capture_source VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'channel_origin') THEN
        ALTER TABLE coupons ADD COLUMN channel_origin VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'message_id') THEN
        ALTER TABLE coupons ADD COLUMN message_id VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'message_hash') THEN
        ALTER TABLE coupons ADD COLUMN message_hash VARCHAR(64);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'origem') THEN
        ALTER TABLE coupons ADD COLUMN origem VARCHAR(50);
    END IF;
END $$;

-- =============================================
-- 3. VIEWS
-- =============================================

-- Criar ou atualizar view products_full
-- Esta view é usada extensivamente no Product.js para buscas
CREATE OR REPLACE VIEW products_full AS
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

-- Permissões para a view (para usuários autenticados e anonimos se necessário)
GRANT SELECT ON products_full TO anon, authenticated, service_role;
