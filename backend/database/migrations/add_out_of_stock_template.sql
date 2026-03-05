-- Adicionar template de cupom esgotado
-- Data: 2026-03-05

-- Primeiro, alterar a constraint para permitir o novo tipo
DO $$
BEGIN
  -- Remover constraint antiga se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bot_message_templates_template_type_check' 
    AND table_name = 'bot_message_templates'
  ) THEN
    ALTER TABLE bot_message_templates DROP CONSTRAINT bot_message_templates_template_type_check;
    RAISE NOTICE 'Constraint antiga removida';
  END IF;

  -- Adicionar nova constraint com out_of_stock_coupon
  ALTER TABLE bot_message_templates 
  ADD CONSTRAINT bot_message_templates_template_type_check 
  CHECK (template_type IN (
    'new_promotion', 
    'promotion_with_coupon', 
    'new_coupon', 
    'expired_coupon',
    'out_of_stock_coupon'
  ));
  RAISE NOTICE 'Nova constraint adicionada com out_of_stock_coupon';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao alterar constraint: %', SQLERRM;
END $$;

-- Agora criar os templates
DO $$
BEGIN
  -- Template para Telegram
  IF NOT EXISTS (
    SELECT 1 FROM bot_message_templates 
    WHERE template_type = 'out_of_stock_coupon' AND platform = 'telegram'
  ) THEN
    INSERT INTO bot_message_templates (template_type, platform, template, is_active, is_system, description, created_at, updated_at)
    VALUES (
      'out_of_stock_coupon',
      'telegram',
      '⚠️ *CUPOM ESGOTADO* ⚠️

{{platform_emoji}} *Plataforma:* {{platform_name}}
🎟️ *Cupom:* <code>{{coupon_code}}</code>

😢 Este cupom esgotou! Mas não se preocupe, novos cupons estão chegando.
Fique de olho para não perder as próximas ofertas!',
      true,
      true,
      'Template para notificação de cupom esgotado no Telegram',
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Template out_of_stock_coupon para Telegram criado';
  ELSE
    RAISE NOTICE 'Template out_of_stock_coupon para Telegram já existe';
  END IF;

  -- Template para WhatsApp
  IF NOT EXISTS (
    SELECT 1 FROM bot_message_templates 
    WHERE template_type = 'out_of_stock_coupon' AND platform = 'whatsapp'
  ) THEN
    INSERT INTO bot_message_templates (template_type, platform, template, is_active, is_system, description, created_at, updated_at)
    VALUES (
      'out_of_stock_coupon',
      'whatsapp',
      '⚠️ *CUPOM ESGOTADO* ⚠️

{{platform_emoji}} *Plataforma:* {{platform_name}}
🎟️ *Cupom:* {{coupon_code}}

😢 Este cupom esgotou! Mas não se preocupe, novos cupons estão chegando.
Fique de olho para não perder as próximas ofertas!',
      true,
      true,
      'Template para notificação de cupom esgotado no WhatsApp',
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Template out_of_stock_coupon para WhatsApp criado';
  ELSE
    RAISE NOTICE 'Template out_of_stock_coupon para WhatsApp já existe';
  END IF;
END $$;
