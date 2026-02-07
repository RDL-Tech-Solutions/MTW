-- =====================================================
-- MTW Promo - Adicionar coluna no_coupons em bot_channels
-- Data: 2026-01-07
-- =====================================================
-- 
-- Esta migration adiciona a coluna no_coupons para permitir
-- que canais não recebam notificações de cupons
--
-- =====================================================

-- 1. Adicionar coluna no_coupons (canais que não recebem cupons)
ALTER TABLE bot_channels 
ADD COLUMN IF NOT EXISTS no_coupons BOOLEAN DEFAULT FALSE;

-- 2. Criar índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_bot_channels_no_coupons 
ON bot_channels(no_coupons) 
WHERE no_coupons = true;

-- 3. Comentário para documentação
COMMENT ON COLUMN bot_channels.no_coupons IS 'Se true, este canal não receberá notificações de cupons (apenas produtos)';

-- 4. Verificar estrutura atualizada
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bot_channels' 
AND column_name IN ('only_coupons', 'no_coupons', 'category_filter')
ORDER BY column_name;
