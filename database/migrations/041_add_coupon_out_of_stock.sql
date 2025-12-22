-- =====================================================
-- Migration: Adicionar campo is_out_of_stock aos cupons
-- Data: 2024-12-20
-- Descrição: Adiciona campo para marcar cupons como esgotados
-- =====================================================

ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS is_out_of_stock BOOLEAN DEFAULT FALSE;

-- Criar índice para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_coupons_is_out_of_stock ON coupons(is_out_of_stock) WHERE is_out_of_stock = TRUE;

-- Comentário na coluna
COMMENT ON COLUMN coupons.is_out_of_stock IS 'Indica se o cupom está esgotado (não disponível mais)';

