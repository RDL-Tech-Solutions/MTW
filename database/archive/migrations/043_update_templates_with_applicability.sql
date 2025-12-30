-- =====================================================
-- Migration: Atualizar templates com informação de aplicabilidade
-- Data: 2024-12-XX
-- Descrição: Atualiza todos os templates (padrão, customizado) para incluir {applicability}
-- A variável {applicability} será substituída apenas se houver informação (geral ou produtos selecionados)
-- Se não houver produtos selecionados e não for geral, a variável será removida automaticamente
-- =====================================================

-- Atualizar templates de novo cupom para incluir {applicability}
-- Adicionar {applicability} após o código do cupom ou após compra mínima
UPDATE bot_message_templates
SET 
  template = CASE 
    -- Se o template já tem {applicability}, manter
    WHEN template LIKE '%{applicability}%' THEN template
    -- Se tem {min_purchase}, adicionar após
    WHEN template LIKE '%{min_purchase}%' THEN 
      REPLACE(template, '{min_purchase}', '{min_purchase}\n{applicability}')
    -- Se tem {max_discount}, adicionar após
    WHEN template LIKE '%{max_discount}%' THEN 
      REPLACE(template, '{max_discount}', '{max_discount}\n{applicability}')
    -- Se tem {usage_limit}, adicionar após
    WHEN template LIKE '%{usage_limit}%' THEN 
      REPLACE(template, '{usage_limit}', '{usage_limit}\n{applicability}')
    -- Se tem {discount_value}, adicionar após
    WHEN template LIKE '%{discount_value}%' THEN 
      REPLACE(template, '{discount_value}', '{discount_value}\n{applicability}')
    -- Caso padrão: adicionar após o código do cupom
    ELSE 
      REPLACE(template, '{coupon_code}', '{coupon_code}\n{applicability}')
  END,
  available_variables = CASE 
    WHEN available_variables::text LIKE '%applicability%' THEN available_variables
    ELSE available_variables || '["applicability"]'::jsonb
  END,
  updated_at = NOW()
WHERE template_type = 'new_coupon'
  AND (template NOT LIKE '%{applicability}%' OR available_variables::text NOT LIKE '%applicability%');

-- Verificar se as atualizações foram aplicadas
SELECT 
  template_type,
  LEFT(template, 150) as template_preview,
  available_variables
FROM bot_message_templates
WHERE template_type = 'new_coupon'
ORDER BY created_at DESC
LIMIT 5;

