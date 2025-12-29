-- =====================================================
-- TEMPLATES DE MENSAGEM PADRÃO
-- Execute após o schema principal para popular os templates
-- =====================================================

-- 1. new_promotion (Apenas Promoção)
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('new_promotion', 'all', 
'🔥 *NOVA OFERTA!*

📦 {product_name}

💰 *{current_price}* {old_price}
🏷️ *{discount_percentage}% OFF*

🛒 {platform_name}
🔗 {affiliate_link}', 
'Promoção Simples', true, '["product_name", "current_price", "old_price", "discount_percentage", "platform_name", "affiliate_link"]'::jsonb)
ON CONFLICT DO NOTHING;

-- 2. promotion_with_coupon (Promoção + Cupom)
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES (
  'promotion_with_coupon', 'all', 
  '🔥 **PROMOÇÃO + CUPOM!**

📦 {product_name}

💰 **Preço Original:** {current_price}
🎟️ **Com Cupom:** {price_with_coupon}
{old_price}
🏷️ **{discount_percentage}% OFF**

{coupon_section}

🛒 {platform_name}
🔗 {affiliate_link}

⚡ Economia dupla! Corre!',
  'Promoção com Cupom Padrão', true,
  '["product_name", "current_price", "price_with_coupon", "old_price", "discount_percentage", "platform_name", "coupon_section", "affiliate_link"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 3. new_coupon (Apenas Cupom)
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('new_coupon', 'all',
'🎟️ *NOVO CUPOM DISPONÍVEL*

🛒 Loja: {platform_name}
💬 Código: `{coupon_code}`

💰 Desconto: {discount_value} OFF
📅 Válido até: {valid_until}
{min_purchase}

🔗 {affiliate_link}',
'Novo Cupom Padrão', true, '["platform_name", "coupon_code", "discount_value", "valid_until", "min_purchase", "affiliate_link"]'::jsonb)
ON CONFLICT DO NOTHING;

-- 4. expired_coupon (Cupom Expirado)
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('expired_coupon', 'all',
'⚠️ *CUPOM EXPIROU*

🛒 Loja: {platform_name}
💬 Código: `{coupon_code}`
📅 Expirado em: {expired_date}

😔 Este cupom não está mais disponível.',
'Cupom Expirado Padrão', true, '["platform_name", "coupon_code", "expired_date"]'::jsonb)
ON CONFLICT DO NOTHING;

SELECT 'Templates padrão inseridos com sucesso!' as status;
