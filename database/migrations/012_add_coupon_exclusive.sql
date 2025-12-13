-- Migration: 012_add_coupon_exclusive.sql
-- Adicionar campo is_exclusive para cupons exclusivos

-- Adicionar coluna is_exclusive
ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT FALSE;

-- Criar índice para busca rápida de cupons exclusivos
CREATE INDEX IF NOT EXISTS idx_coupons_is_exclusive ON coupons(is_exclusive) WHERE is_exclusive = TRUE;

-- Comentário
COMMENT ON COLUMN coupons.is_exclusive IS 'Cupom exclusivo - aparece primeiro e destacado no app mobile';

