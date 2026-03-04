-- =====================================================
-- Migração: Adicionar campos coupons_only e coupon_platforms
-- Data: 2026-03-04
-- Descrição: Adiciona campos para notificações apenas de cupons
--            e seleção de plataformas de cupons
-- =====================================================

-- Adicionar coluna coupons_only
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS coupons_only BOOLEAN DEFAULT FALSE;

-- Adicionar coluna coupon_platforms (array de strings)
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS coupon_platforms TEXT[] DEFAULT '{}';

-- Comentários
COMMENT ON COLUMN notification_preferences.coupons_only IS 'Se true, usuário recebe apenas notificações de cupons e produtos com palavras-chave';
COMMENT ON COLUMN notification_preferences.coupon_platforms IS 'Array de plataformas de cupons (amazon, mercadolivre, shopee, etc)';

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Campos coupons_only e coupon_platforms adicionados com sucesso';
  RAISE NOTICE '   - coupons_only: BOOLEAN (default: false)';
  RAISE NOTICE '   - coupon_platforms: TEXT[] (default: [])';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Funcionalidade:';
  RAISE NOTICE '   - coupons_only = true: usuário recebe apenas cupons + produtos com palavras-chave';
  RAISE NOTICE '   - coupon_platforms: filtrar cupons por plataforma (vazio = todas)';
END $$;
