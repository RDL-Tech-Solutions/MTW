-- =====================================================
-- Migration: 027_add_system_templates_protection
-- Data: 2024-12-XX
-- Descrição: Adiciona proteção para templates padrão do sistema
-- =====================================================

-- Adicionar coluna is_system para marcar templates do sistema
ALTER TABLE bot_message_templates 
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_bot_message_templates_system ON bot_message_templates(is_system);

-- Marcar os 3 templates padrão ativos como templates do sistema
-- Template 1: new_promotion (Modelo Padrão 1 - Simples e Direto)
UPDATE bot_message_templates 
SET is_system = TRUE
WHERE template_type = 'new_promotion' 
  AND platform = 'all'
  AND description = 'Modelo Padrão 1: Simples e Direto - Todas as plataformas'
  AND is_active = TRUE;

-- Template 2: new_coupon (Modelo Padrão 1 - Simples e Direto)
UPDATE bot_message_templates 
SET is_system = TRUE
WHERE template_type = 'new_coupon' 
  AND platform = 'all'
  AND description = 'Modelo Padrão 1: Simples e Direto - Todas as plataformas'
  AND is_active = TRUE;

-- Template 3: expired_coupon (Modelo Padrão 1 - Simples e Direto)
UPDATE bot_message_templates 
SET is_system = TRUE
WHERE template_type = 'expired_coupon' 
  AND platform = 'all'
  AND description = 'Modelo Padrão 1: Simples e Direto - Todas as plataformas'
  AND is_active = TRUE;

-- Se não encontrou os templates acima, tentar marcar os primeiros ativos de cada tipo
-- (para casos onde os templates já existiam antes desta migração)
DO $$
DECLARE
  promotion_id UUID;
  coupon_id UUID;
  expired_id UUID;
BEGIN
  -- Se não há template de promoção marcado como sistema, marcar o primeiro ativo
  IF NOT EXISTS (SELECT 1 FROM bot_message_templates WHERE template_type = 'new_promotion' AND is_system = TRUE) THEN
    SELECT id INTO promotion_id
    FROM bot_message_templates
    WHERE template_type = 'new_promotion' 
      AND platform = 'all'
      AND is_active = TRUE
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF promotion_id IS NOT NULL THEN
      UPDATE bot_message_templates SET is_system = TRUE WHERE id = promotion_id;
    END IF;
  END IF;

  -- Se não há template de cupom marcado como sistema, marcar o primeiro ativo
  IF NOT EXISTS (SELECT 1 FROM bot_message_templates WHERE template_type = 'new_coupon' AND is_system = TRUE) THEN
    SELECT id INTO coupon_id
    FROM bot_message_templates
    WHERE template_type = 'new_coupon' 
      AND platform = 'all'
      AND is_active = TRUE
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF coupon_id IS NOT NULL THEN
      UPDATE bot_message_templates SET is_system = TRUE WHERE id = coupon_id;
    END IF;
  END IF;

  -- Se não há template de cupom expirado marcado como sistema, marcar o primeiro ativo
  IF NOT EXISTS (SELECT 1 FROM bot_message_templates WHERE template_type = 'expired_coupon' AND is_system = TRUE) THEN
    SELECT id INTO expired_id
    FROM bot_message_templates
    WHERE template_type = 'expired_coupon' 
      AND platform = 'all'
      AND is_active = TRUE
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF expired_id IS NOT NULL THEN
      UPDATE bot_message_templates SET is_system = TRUE WHERE id = expired_id;
    END IF;
  END IF;
END $$;

-- Comentário explicativo
COMMENT ON COLUMN bot_message_templates.is_system IS 'Indica se o template é do sistema e não pode ser deletado. Templates do sistema são os 3 modelos padrão (um de cada tipo) que sempre devem existir.';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
SELECT 'Migration 027_add_system_templates_protection executada com sucesso!' as status;


