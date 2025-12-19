-- =====================================================
-- MIGRATION: Adicionar 3 modelos padrão de templates
-- para cada tipo (produto, cupom, cupom expirado)
-- =====================================================

-- Limpar templates padrão antigos (opcional - comentado para não perder dados)
-- DELETE FROM bot_message_templates WHERE description LIKE '%Modelo Padrão%';

-- =====================================================
-- MODELOS PARA: NOVA PROMOÇÃO (new_promotion)
-- =====================================================

-- Modelo 1: Simples e Direto
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
'Modelo Padrão 1: Simples e Direto - Todas as plataformas',
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
'Modelo Padrão 2: Detalhado e Informativo - Todas as plataformas',
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
'Modelo Padrão 3: Urgente e Ação - Todas as plataformas',
false,
'["product_name", "current_price", "old_price", "discount_percentage", "platform_name", "coupon_section", "affiliate_link"]'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- MODELOS PARA: NOVO CUPOM (new_coupon)
-- =====================================================

-- Modelo 1: Simples e Direto
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('new_coupon', 'all', 
'🎟️ **NOVO CUPOM DISPONÍVEL!**

🏪 {platform_name}

💬 **CÓDIGO:**
`{coupon_code}`

💰 **DESCONTO:** {discount_value} OFF
📅 **VÁLIDO ATÉ:** {valid_until}
{min_purchase}

📝 {coupon_title}
{coupon_description}

🔗 {affiliate_link}

⚡ Use agora e economize!',
'Modelo Padrão 1: Simples e Direto - Todas as plataformas',
true,
'["platform_name", "coupon_code", "discount_value", "valid_until", "min_purchase", "coupon_title", "coupon_description", "affiliate_link"]'::jsonb)
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
📅 **VALIDADE:** {valid_until}
{min_purchase}

📋 **DETALHES:**
{coupon_title}
{coupon_description}

🔗 **LINK PARA USAR:**
{affiliate_link}

✅ **Cupom pronto para uso!**',
'Modelo Padrão 2: Detalhado e Informativo - Todas as plataformas',
false,
'["platform_name", "coupon_code", "discount_value", "valid_until", "min_purchase", "coupon_title", "coupon_description", "affiliate_link"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Modelo 3: Urgente e Ação
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('new_coupon', 'all', 
'⚡ **CUPOM LIBERADO!** ⚡

🎟️ **CÓDIGO EXCLUSIVO:**
`{coupon_code}`

🏪 {platform_name}
💰 {discount_value} OFF
📅 Válido até {valid_until}
{min_purchase}

{coupon_title}
{coupon_description}

🔗 {affiliate_link}

⏰ **Use antes que expire!**',
'Modelo Padrão 3: Urgente e Ação - Todas as plataformas',
false,
'["platform_name", "coupon_code", "discount_value", "valid_until", "min_purchase", "coupon_title", "coupon_description", "affiliate_link"]'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- MODELOS PARA: CUPOM EXPIrado (expired_coupon)
-- =====================================================

-- Modelo 1: Simples e Direto
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('expired_coupon', 'all', 
'⚠️ **CUPOM EXPIROU**

🏪 {platform_name}
💬 Código: `{coupon_code}`
📅 Expirado em: {expired_date}

😔 Este cupom não está mais disponível.
🔔 Fique atento às próximas promoções!',
'Modelo Padrão 1: Simples e Direto - Todas as plataformas',
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
'Modelo Padrão 2: Informativo - Todas as plataformas',
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
'Modelo Padrão 3: Motivacional - Todas as plataformas',
false,
'["platform_name", "coupon_code", "expired_date"]'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
-- Esta migration adiciona 3 modelos padrão para cada tipo de template:
-- - new_promotion: 3 modelos (Simples, Detalhado, Urgente)
-- - new_coupon: 3 modelos (Simples, Detalhado, Urgente)
-- - expired_coupon: 3 modelos (Simples, Informativo, Motivacional)
--
-- Apenas o "Modelo 1" de cada tipo está ativo por padrão.
-- Os outros modelos podem ser ativados pelo painel admin.
--
-- Todos os modelos são criados com platform='all' para funcionar
-- em todas as plataformas. Templates específicos por plataforma
-- podem ser criados pelo painel admin.




