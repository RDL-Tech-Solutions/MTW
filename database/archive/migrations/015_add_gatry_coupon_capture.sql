-- =====================================================
-- Migration: Adicionar suporte a captura de cupons do Gatry
-- Data: 2025-01-XX
-- Descrição: Adiciona configuração para captura de cupons do Gatry
-- =====================================================

-- Adicionar campo para habilitar captura do Gatry
ALTER TABLE coupon_settings
ADD COLUMN IF NOT EXISTS gatry_enabled BOOLEAN DEFAULT TRUE;

-- Comentário
COMMENT ON COLUMN coupon_settings.gatry_enabled IS 'Habilita captura automática de cupons do site Gatry';

-- Atualizar configuração padrão se necessário
UPDATE coupon_settings
SET gatry_enabled = TRUE
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND gatry_enabled IS NULL;

