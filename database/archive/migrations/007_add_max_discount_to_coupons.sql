-- =====================================================
-- Migration: Adicionar limite máximo de desconto aos cupons
-- Data: 2024-12-13
-- Descrição: Adiciona campo max_discount_value para cupons do Mercado Livre/Pago
-- =====================================================

-- Adicionar campo max_discount_value (limite máximo de desconto aplicável)
ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS max_discount_value DECIMAL(10,2) DEFAULT NULL;

-- Comentário
COMMENT ON COLUMN coupons.max_discount_value IS 'Valor máximo de desconto que pode ser aplicado (ex: R$ 60 máximo, mesmo que o desconto seja maior)';

-- Verificar se a migration foi aplicada
SELECT 'Migration 007 aplicada com sucesso! Campo max_discount_value adicionado.' as status;








