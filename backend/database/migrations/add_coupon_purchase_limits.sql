-- ============================================================================
-- Migration: Adicionar campos de limites de compra e desconto para cupons
-- Data: 2026-02-28
-- Descrição: Adiciona campos min_purchase e max_discount_value para todas as plataformas
-- ============================================================================

-- Verificar se as colunas já existem antes de adicionar
DO $$ 
BEGIN
    -- Adicionar min_purchase se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' AND column_name = 'min_purchase'
    ) THEN
        ALTER TABLE coupons 
        ADD COLUMN min_purchase DECIMAL(10, 2) DEFAULT 0 NOT NULL;
        
        COMMENT ON COLUMN coupons.min_purchase IS 'Valor mínimo de compra para usar o cupom (R$)';
    END IF;

    -- Adicionar max_discount_value se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' AND column_name = 'max_discount_value'
    ) THEN
        ALTER TABLE coupons 
        ADD COLUMN max_discount_value DECIMAL(10, 2) DEFAULT NULL;
        
        COMMENT ON COLUMN coupons.max_discount_value IS 'Valor máximo de desconto que pode ser aplicado (R$)';
    END IF;
END $$;

-- Criar índices para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_coupons_min_purchase ON coupons(min_purchase);
CREATE INDEX IF NOT EXISTS idx_coupons_max_discount ON coupons(max_discount_value);

-- Atualizar cupons existentes do Mercado Livre e Shopee que já podem ter esses valores
-- (caso já existam dados nesses campos de outra forma)
UPDATE coupons 
SET min_purchase = COALESCE(min_purchase, 0)
WHERE min_purchase IS NULL;

COMMENT ON TABLE coupons IS 'Tabela de cupons de desconto com suporte a limites de compra e desconto máximo para todas as plataformas';
