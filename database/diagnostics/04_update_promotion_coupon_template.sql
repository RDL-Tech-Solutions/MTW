-- =====================================================
-- LIMPAR E ATUALIZAR TEMPLATE: PROMOÇÃO + CUPOM
-- Data: 2026-01-08
-- Objetivo: Remover duplicados e manter apenas 1 template ativo
-- =====================================================

-- PASSO 1: Deletar TODOS os templates de promotion_with_coupon
DELETE FROM bot_message_templates 
WHERE template_type = 'promotion_with_coupon';

-- PASSO 2: Inserir APENAS UM novo template padrão
INSERT INTO bot_message_templates (
  template_type, 
  platform, 
  template, 
  description, 
  is_active, 
  is_system,
  available_variables
) VALUES (
  'promotion_with_coupon', 
  'all', 
  '📦 {product_name}

💰 Preço: {original_price}
🎟️ Com Cupom: {final_price}
🏷️ {discount_percentage}% OFF

🎟️ CUPOM: `{coupon_code}`

🛒 Plataforma: {platform_name}

🔗 {affiliate_link}

⚡ Economia dupla! Aproveite agora!',
  'Template Padrão: Promoção + Cupom',
  true,
  true,
  '["product_name", "original_price", "final_price", "discount_percentage", "coupon_code", "platform_name", "affiliate_link"]'::jsonb
);

-- PASSO 3: Verificar resultado (deve mostrar apenas 1 template)
SELECT 
  id,
  template_type,
  description,
  is_active,
  is_system,
  LEFT(template, 60) as template_preview,
  created_at
FROM bot_message_templates
WHERE template_type = 'promotion_with_coupon'
ORDER BY created_at DESC;

-- =====================================================
-- ✅ Template atualizado com sucesso!
-- ✅ Duplicados removidos!
-- =====================================================
