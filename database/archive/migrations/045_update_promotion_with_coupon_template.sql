-- =====================================================
-- MIGRATION: 045_update_promotion_with_coupon_template
-- Data: 2025-01-XX
-- Descrição: Atualiza template padrão de promotion_with_coupon para novo formato
-- =====================================================

-- Atualizar Modelo Padrão 1: Simples e Direto (COM CUPOM)
UPDATE bot_message_templates 
SET 
  template = '📦 {product_name}

💰 Preço: {original_price}
🎟️ Com Cupom: {final_price}
🏷️ {discount_percentage}% OFF

🎟️ CUPOM: `{coupon_code}`

🛒 Plataforma: {platform_name}

🔗 {affiliate_link}

⚡ Economia dupla! Aproveite agora!',
  description = 'Modelo Padrão 1: Promoção com Cupom - Simples e Direto',
  available_variables = '["product_name", "original_price", "final_price", "discount_percentage", "coupon_code", "platform_name", "affiliate_link"]'::jsonb,
  updated_at = NOW()
WHERE template_type = 'promotion_with_coupon' 
  AND platform = 'all'
  AND description = 'Modelo Padrão 1: Promoção com Cupom - Simples e Direto';

-- Atualizar também outros templates de promotion_with_coupon que possam existir
UPDATE bot_message_templates 
SET 
  template = '📦 {product_name}

💰 Preço: {original_price}
🎟️ Com Cupom: {final_price}
🏷️ {discount_percentage}% OFF

🎟️ CUPOM: `{coupon_code}`

🛒 Plataforma: {platform_name}

🔗 {affiliate_link}

⚡ Economia dupla! Aproveite agora!',
  available_variables = '["product_name", "original_price", "final_price", "discount_percentage", "coupon_code", "platform_name", "affiliate_link"]'::jsonb,
  updated_at = NOW()
WHERE template_type = 'promotion_with_coupon' 
  AND is_active = true;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
-- Esta migration atualiza o template padrão ativo de promotion_with_coupon
-- para seguir o novo formato solicitado:
-- - Formato mais limpo e direto
-- - Código do cupom destacado com backticks (`{coupon_code}`) para conversão em <code> no Telegram
-- - Informações de preço claras: original_price (antes do cupom) e final_price (com cupom)
-- - Mensagem de economia dupla
-- 
-- Variáveis disponíveis:
-- - {product_name}: Nome do produto
-- - {original_price}: Preço antes do cupom (ou preço atual se não houver cupom)
-- - {final_price}: Preço final com cupom aplicado (ou preço atual se não houver cupom)
-- - {discount_percentage}: Percentual de desconto
-- - {coupon_code}: Código do cupom (formatado com backticks)
-- - {platform_name}: Nome da plataforma
-- - {affiliate_link}: Link de afiliado

