-- =====================================================
-- TEMPLATES DE MENSAGEM PADRÃO (COMPLETO)
-- Execute após o schema principal para popular os templates
-- Data: 2025-12-29
-- =====================================================

-- Garantir constraint atualizada
ALTER TABLE bot_message_templates 
DROP CONSTRAINT IF EXISTS bot_message_templates_template_type_check;

ALTER TABLE bot_message_templates 
ADD CONSTRAINT bot_message_templates_template_type_check 
CHECK (template_type IN ('new_promotion', 'promotion_with_coupon', 'new_coupon', 'expired_coupon'));

-- =====================================================
-- MODELOS PARA: NOVA PROMOÇÃO (new_promotion)
-- =====================================================

-- Modelo 1: Simples e Direto (ATIVO)
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('new_promotion', 'all', 
'🔥 **PROMOÇÃO IMPERDÍVEL!**

📦 {product_name}

💰 **{current_price}**{old_price}
🏷️ **{discount_percentage}% OFF**

🛒 {platform_name}

{coupon_section}

🔗 {affiliate_link}

⚡ Corre que está acabando!',
'Modelo Padrão 1: Simples e Direto',
true,
'["product_name", "current_price", "old_price", "discount_percentage", "platform_name", "coupon_section", "affiliate_link"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Modelo 2: Detalhado e Informativo
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('new_promotion', 'all', 
'🎯 **OFERTA ESPECIAL ENCONTRADA!**

━━━━━━━━━━━━━━━━━━━━
📦 **PRODUTO**
{product_name}
━━━━━━━━━━━━━━━━━━━━

💰 **PREÇO ATUAL:** {current_price}{old_price}
🎁 **DESCONTO:** {discount_percentage}% OFF

🏪 **LOJA:** {platform_name}

{coupon_section}

🔗 **COMPRAR AGORA:**
{affiliate_link}

⏰ **Oferta limitada! Não perca!**',
'Modelo Padrão 2: Detalhado e Informativo',
false,
'["product_name", "current_price", "old_price", "discount_percentage", "platform_name", "coupon_section", "affiliate_link"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Modelo 3: Urgente e Ação
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('new_promotion', 'all', 
'⚡ **ALERTA DE OFERTA!** ⚡

🎁 {product_name}

💸 De {old_price} por apenas **{current_price}**
🔥 **ECONOMIZE {discount_percentage}%!**

{coupon_section}

🛒 {platform_name}
🔗 {affiliate_link}

⏰ **ÚLTIMAS HORAS! Aproveite agora!**',
'Modelo Padrão 3: Urgente e Ação',
false,
'["product_name", "current_price", "old_price", "discount_percentage", "platform_name", "coupon_section", "affiliate_link"]'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- MODELOS PARA: PROMOÇÃO + CUPOM (promotion_with_coupon)
-- =====================================================

-- Modelo 1: Simples e Direto (ATIVO)
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('promotion_with_coupon', 'all', 
'🔥 **PROMOÇÃO + CUPOM!**

📦 {product_name}

💰 **Preço Original:** {current_price}
🎟️ **Com Cupom:** {price_with_coupon}
{old_price}
🏷️ **{discount_percentage}% OFF**

{coupon_section}

🛒 {platform_name}

🔗 {affiliate_link}

⚡ Economia dupla! Corre que está acabando!',
'Modelo Padrão 1: Promoção com Cupom - Simples e Direto',
true,
'["product_name", "current_price", "original_price", "final_price", "price_with_coupon", "old_price", "discount_percentage", "platform_name", "coupon_section", "coupon_code", "coupon_discount", "affiliate_link"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Modelo 2: Detalhado e Informativo  
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('promotion_with_coupon', 'all', 
'🎯 **OFERTA ESPECIAL + CUPOM EXCLUSIVO!**

━━━━━━━━━━━━━━━━━━━━
📦 **PRODUTO**
{product_name}
━━━━━━━━━━━━━━━━━━━━

💰 **PREÇO NORMAL:** {current_price}
🎟️ **PREÇO COM CUPOM:** {price_with_coupon}
{old_price}
🎁 **DESCONTO DO PRODUTO:** {discount_percentage}% OFF

{coupon_section}

━━━━━━━━━━━━━━━━━━━━
🏪 **LOJA:** {platform_name}
━━━━━━━━━━━━━━━━━━━━

🔗 **COMPRAR AGORA:**
{affiliate_link}

⏰ **Oferta limitada com cupom! Não perca!**',
'Modelo Padrão 2: Promoção com Cupom - Detalhado e Informativo',
false,
'["product_name", "current_price", "original_price", "final_price", "price_with_coupon", "old_price", "discount_percentage", "platform_name", "coupon_section", "coupon_code", "coupon_discount", "affiliate_link"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Modelo 3: Urgente e Ação
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('promotion_with_coupon', 'all', 
'⚡ **ECONOMIA DUPLA!** ⚡

🎁 {product_name}

💸 De {old_price}
💰 Por {current_price}
🎟️ **COM CUPOM: {price_with_coupon}**
🔥 **ECONOMIZE {discount_percentage}% + CUPOM EXTRA!**

{coupon_section}

🛒 {platform_name}
🔗 {affiliate_link}

⏰ **ÚLTIMA CHANCE! Use o cupom agora antes que acabe!**',
'Modelo Padrão 3: Promoção com Cupom - Urgente e Ação',
false,
'["product_name", "current_price", "original_price", "final_price", "price_with_coupon", "old_price", "discount_percentage", "platform_name", "coupon_section", "coupon_code", "coupon_discount", "affiliate_link"]'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- MODELOS PARA: NOVO CUPOM (new_coupon)
-- =====================================================

-- Modelo 1: Simples e Direto (ATIVO)
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('new_coupon', 'all', 
'🎟️ **NOVO CUPOM DISPONÍVEL!**

🏪 {platform_name}

💬 **CÓDIGO:**
`{coupon_code}`

💰 **DESCONTO:** {discount_value} OFF
{min_purchase}
{applicability}

📝 {coupon_title}
{coupon_description}

🔗 {affiliate_link}

⚡ Use agora e economize!',
'Modelo Padrão 1: Simples e Direto',
true,
'["platform_name", "coupon_code", "discount_value", "min_purchase", "applicability", "coupon_title", "coupon_description", "affiliate_link"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Modelo 2: Detalhado e Informativo
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('new_coupon', 'all', 
'🎁 **CUPOM DE DESCONTO ATIVO!**

━━━━━━━━━━━━━━━━━━━━
🏪 **PLATAFORMA:** {platform_name}
━━━━━━━━━━━━━━━━━━━━

💬 **COPIE O CÓDIGO:**
`{coupon_code}`

💰 **VALOR DO DESCONTO:** {discount_value} OFF
{min_purchase}
{applicability}

📋 **DETALHES:**
{coupon_title}
{coupon_description}

🔗 **LINK PARA USAR:**
{affiliate_link}

✅ **Cupom pronto para uso!**',
'Modelo Padrão 2: Detalhado e Informativo',
false,
'["platform_name", "coupon_code", "discount_value", "min_purchase", "applicability", "coupon_title", "coupon_description", "affiliate_link"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Modelo 3: Urgente e Ação
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('new_coupon', 'all', 
'⚡ **CUPOM LIBERADO!** ⚡

🎟️ **CÓDIGO EXCLUSIVO:**
`{coupon_code}`

🏪 {platform_name}
💰 {discount_value} OFF
{min_purchase}
{applicability}

{coupon_title}
{coupon_description}

🔗 {affiliate_link}

⏰ **Use antes que expire!**',
'Modelo Padrão 3: Urgente e Ação',
false,
'["platform_name", "coupon_code", "discount_value", "min_purchase", "applicability", "coupon_title", "coupon_description", "affiliate_link"]'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- MODELOS PARA: CUPOM EXPIRADO (expired_coupon)
-- =====================================================

-- Modelo 1: Simples e Direto (ATIVO)
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('expired_coupon', 'all', 
'⚠️ **CUPOM EXPIROU**

🏪 {platform_name}
💬 Código: `{coupon_code}`
📅 Expirado em: {expired_date}

😔 Este cupom não está mais disponível.
🔔 Fique atento às próximas promoções!',
'Modelo Padrão 1: Simples e Direto',
true,
'["platform_name", "coupon_code", "expired_date"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Modelo 2: Informativo
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('expired_coupon', 'all', 
'📢 **AVISO: CUPOM EXPIRADO**

━━━━━━━━━━━━━━━━━━━━
🏪 **Plataforma:** {platform_name}
💬 **Código:** `{coupon_code}`
📅 **Data de Expiração:** {expired_date}
━━━━━━━━━━━━━━━━━━━━

ℹ️ Este cupom de desconto não está mais válido.

🔔 **Não se preocupe!** Novos cupons são adicionados regularmente. Fique de olho!',
'Modelo Padrão 2: Informativo',
false,
'["platform_name", "coupon_code", "expired_date"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Modelo 3: Motivacional
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('expired_coupon', 'all', 
'⏰ **CUPOM EXPIRADO**

🏪 {platform_name}
💬 `{coupon_code}`
📅 {expired_date}

😢 Infelizmente este cupom expirou.

✨ Mas não desanime! Novas oportunidades estão chegando. Continue acompanhando para não perder as próximas ofertas! 🎁',
'Modelo Padrão 3: Motivacional',
false,
'["platform_name", "coupon_code", "expired_date"]'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- FINALIZAÇÃO
-- =====================================================
SELECT 'Templates padrão inseridos com sucesso! (12 templates: 3 para cada tipo)' as status;

-- =====================================================
-- RESUMO DOS TEMPLATES
-- =====================================================
-- new_promotion: 3 modelos (Simples, Detalhado, Urgente)
-- promotion_with_coupon: 3 modelos (Simples, Detalhado, Urgente)
-- new_coupon: 3 modelos (Simples, Detalhado, Urgente)
-- expired_coupon: 3 modelos (Simples, Informativo, Motivacional)
--
-- Apenas o "Modelo 1" de cada tipo está ativo por padrão.
-- Os outros modelos podem ser ativados pelo painel admin.
