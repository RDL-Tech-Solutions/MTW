-- =====================================================
-- Migration: Adicionar suporte a cupons capturados pendentes de aprovação
-- Data: 2025-01-XX
-- Descrição: Adiciona campos para gerenciar cupons capturados de fontes externas
-- =====================================================

-- Adicionar campo para marcar cupons como pendentes de aprovação
ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS is_pending_approval BOOLEAN DEFAULT FALSE;

-- Adicionar campo para fonte de captura
ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS capture_source VARCHAR(50) DEFAULT NULL;

-- Adicionar campo para URL de origem
ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Criar índice para busca rápida de cupons pendentes
CREATE INDEX IF NOT EXISTS idx_coupons_pending_approval ON coupons(is_pending_approval) WHERE is_pending_approval = TRUE;
CREATE INDEX IF NOT EXISTS idx_coupons_capture_source ON coupons(capture_source);

-- Comentários
COMMENT ON COLUMN coupons.is_pending_approval IS 'Indica se o cupom está aguardando aprovação do administrador';
COMMENT ON COLUMN coupons.capture_source IS 'Fonte de captura do cupom (gatry, api, manual, etc)';
COMMENT ON COLUMN coupons.source_url IS 'URL de origem do cupom capturado';

