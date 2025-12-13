-- =====================================================
-- Migration: Atualizar templates de bot com informações de aplicabilidade
-- Data: 2024-12-13
-- Descrição: Adiciona variáveis de aplicabilidade e compra mínima nos templates
-- =====================================================

-- Atualizar template de novo cupom
UPDATE bot_message_templates
SET 
  template = '🎟️ *NOVO CUPOM DISPONÍVEL!*

🏪 *Plataforma:* {platform_name}
💬 *Código:* `{coupon_code}`
💰 *Desconto:* {discount_value} OFF
{min_purchase}
{max_discount}
{usage_limit}
{applicability}

📝 *{coupon_title}*
{coupon_description}

📅 *Válido até:* {valid_until}

🔗 {affiliate_link}

⚡ Use agora e economize!',
  available_variables = '["platform_name", "coupon_code", "discount_value", "min_purchase", "max_discount", "usage_limit", "applicability", "coupon_title", "coupon_description", "valid_until", "affiliate_link"]'::jsonb,
  updated_at = NOW()
WHERE template_type = 'new_coupon';

-- Atualizar template de cupom expirado (manter simples)
UPDATE bot_message_templates
SET 
  template = '❌ *CUPOM EXPIROU* ❌

🏪 *Plataforma:* {platform_name}
💬 *Código:* `{coupon_code}`
📅 *Expirado em:* {expired_date}

😔 Infelizmente este cupom não está mais disponível.
🔔 Fique de olho para novos cupons!',
  available_variables = '["platform_name", "coupon_code", "expired_date"]'::jsonb,
  updated_at = NOW()
WHERE template_type = 'expired_coupon';

-- Atualizar template de nova promoção para incluir informações de cupom melhoradas
UPDATE bot_message_templates
SET 
  template = '🔥 *NOVA PROMOÇÃO!*

🛍 *{product_name}*

{old_price}💰 *Por: {current_price}* {discount_percentage}% OFF

🛒 *Loja:* {platform_name}
{coupon_section}
🔗 *Link:* {affiliate_link}

⚡ Aproveite antes que acabe!',
  available_variables = '["product_name", "old_price", "current_price", "discount_percentage", "platform_name", "coupon_section", "affiliate_link"]'::jsonb,
  updated_at = NOW()
WHERE template_type = 'new_promotion';

-- Verificar se as atualizações foram aplicadas
SELECT 
  template_type,
  LEFT(template, 50) as template_preview,
  available_variables
FROM bot_message_templates
ORDER BY template_type;

