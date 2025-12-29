-- =====================================================
-- MIGRATION: 033_add_template_mode_settings
-- Data: 2025-01-XX
-- Descrição: Adiciona configurações para modo de template
--            (padrão, customizado, IA ADVANCED)
-- =====================================================

-- Adicionar colunas em app_settings para configuração de template mode
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS template_mode_promotion VARCHAR(20) DEFAULT 'custom' CHECK (template_mode_promotion IN ('default', 'custom', 'ai_advanced')),
ADD COLUMN IF NOT EXISTS template_mode_promotion_coupon VARCHAR(20) DEFAULT 'custom' CHECK (template_mode_promotion_coupon IN ('default', 'custom', 'ai_advanced')),
ADD COLUMN IF NOT EXISTS template_mode_coupon VARCHAR(20) DEFAULT 'custom' CHECK (template_mode_coupon IN ('default', 'custom', 'ai_advanced')),
ADD COLUMN IF NOT EXISTS template_mode_expired_coupon VARCHAR(20) DEFAULT 'custom' CHECK (template_mode_expired_coupon IN ('default', 'custom', 'ai_advanced'));

-- Comentários
COMMENT ON COLUMN app_settings.template_mode_promotion IS 'Modo de template para promoções: default (padrão do sistema), custom (template salvo), ai_advanced (IA gera automaticamente)';
COMMENT ON COLUMN app_settings.template_mode_promotion_coupon IS 'Modo de template para promoções com cupom: default, custom, ai_advanced';
COMMENT ON COLUMN app_settings.template_mode_coupon IS 'Modo de template para cupons: default, custom, ai_advanced';
COMMENT ON COLUMN app_settings.template_mode_expired_coupon IS 'Modo de template para cupons expirados: default, custom, ai_advanced';

-- Atualizar registro existente com valores padrão
UPDATE app_settings 
SET 
  template_mode_promotion = 'custom',
  template_mode_promotion_coupon = 'custom',
  template_mode_coupon = 'custom',
  template_mode_expired_coupon = 'custom'
WHERE id = '00000000-0000-0000-0000-000000000001';







