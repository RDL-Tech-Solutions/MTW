-- =====================================================
-- Migration: Filtro de Conteúdo por Canal
-- Data: 2024-12-XX
-- Descrição: Adiciona campo para canais que só recebem cupons e melhorar filtro de categorias
-- =====================================================

-- Adicionar campo para canais que só recebem cupons (não recebem produtos)
ALTER TABLE bot_channels
ADD COLUMN IF NOT EXISTS only_coupons BOOLEAN DEFAULT FALSE;

-- Comentários
COMMENT ON COLUMN bot_channels.only_coupons IS 'Se TRUE, o canal só recebe notificações de cupons (coupon_new, coupon_expired), nunca produtos (promotion_new)';
COMMENT ON COLUMN bot_channels.category_filter IS 'Array de category_ids permitidos. Se vazio, aceita todas as categorias. Máximo 10 categorias recomendado.';

-- Índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_bot_channels_only_coupons ON bot_channels(only_coupons) WHERE only_coupons = TRUE;

-- =====================================================
-- Verificar se tudo foi criado corretamente
-- =====================================================
SELECT 'Migration 040 executada com sucesso!' as status;


