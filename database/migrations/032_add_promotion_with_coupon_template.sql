-- =====================================================
-- MIGRATION: 032_add_promotion_with_coupon_template
-- Data: 2025-01-XX
-- Descrição: Adiciona suporte ao novo tipo de template 'promotion_with_coupon'
--            e atualiza templates de 'new_promotion' para remover coupon_section
-- =====================================================

-- =====================================================
-- 1. ATUALIZAR CONSTRAINT DO template_type
-- =====================================================

-- Remover constraint antiga
ALTER TABLE bot_message_templates 
DROP CONSTRAINT IF EXISTS bot_message_templates_template_type_check;

-- Adicionar nova constraint com 'promotion_with_coupon'
ALTER TABLE bot_message_templates 
ADD CONSTRAINT bot_message_templates_template_type_check 
CHECK (template_type IN ('new_promotion', 'promotion_with_coupon', 'new_coupon', 'expired_coupon'));

-- =====================================================
-- 2. ATUALIZAR TEMPLATES EXISTENTES DE new_promotion
--    Remover {coupon_section} e atualizar variáveis disponíveis
-- =====================================================

-- Atualizar Modelo Padrão 1: Simples e Direto (SEM CUPOM)
UPDATE bot_message_templates 
SET 
  template = '🔥 **PROMOÇÃO IMPERDÍVEL!**

📦 {product_name}

💰 **{current_price}**{old_price}
🏷️ **{discount_percentage}% OFF**

🛒 {platform_name}

🔗 {affiliate_link}

⚡ Corre que está acabando!',
  description = 'Modelo Padrão 1: Simples e Direto - Todas as plataformas (SEM CUPOM)',
  available_variables = '["product_name", "current_price", "old_price", "discount_percentage", "platform_name", "affiliate_link"]'::jsonb,
  updated_at = NOW()
WHERE template_type = 'new_promotion' 
  AND platform = 'all'
  AND description = 'Modelo Padrão 1: Simples e Direto - Todas as plataformas';

-- Atualizar Modelo Padrão 2: Detalhado e Informativo (SEM CUPOM)
UPDATE bot_message_templates 
SET 
  template = '🎯 **OFERTA ESPECIAL ENCONTRADA!**

━━━━━━━━━━━━━━━━━━━━
📦 **PRODUTO**
{product_name}
━━━━━━━━━━━━━━━━━━━━

💰 **PREÇO ATUAL:** {current_price}{old_price}
🎁 **DESCONTO:** {discount_percentage}% OFF

🏪 **LOJA:** {platform_name}

🔗 **COMPRAR AGORA:**
{affiliate_link}

⏰ **Oferta limitada! Não perca!**',
  description = 'Modelo Padrão 2: Detalhado e Informativo - Todas as plataformas (SEM CUPOM)',
  available_variables = '["product_name", "current_price", "old_price", "discount_percentage", "platform_name", "affiliate_link"]'::jsonb,
  updated_at = NOW()
WHERE template_type = 'new_promotion' 
  AND platform = 'all'
  AND description = 'Modelo Padrão 2: Detalhado e Informativo - Todas as plataformas';

-- Atualizar Modelo Padrão 3: Urgente e Ação (SEM CUPOM)
UPDATE bot_message_templates 
SET 
  template = '⚡ **ALERTA DE OFERTA!** ⚡

🎁 {product_name}

💸 De {old_price} por apenas **{current_price}**
🔥 **ECONOMIZE {discount_percentage}%!**

🛒 {platform_name}
🔗 {affiliate_link}

⏰ **ÚLTIMAS HORAS! Aproveite agora!**',
  description = 'Modelo Padrão 3: Urgente e Ação - Todas as plataformas (SEM CUPOM)',
  available_variables = '["product_name", "current_price", "old_price", "discount_percentage", "platform_name", "affiliate_link"]'::jsonb,
  updated_at = NOW()
WHERE template_type = 'new_promotion' 
  AND platform = 'all'
  AND description = 'Modelo Padrão 3: Urgente e Ação - Todas as plataformas';

-- =====================================================
-- 3. INSERIR TEMPLATES PADRÃO PARA promotion_with_coupon
-- =====================================================

-- Modelo 1: Simples e Direto (COM CUPOM)
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('promotion_with_coupon', 'all', 
'🔥 **PROMOÇÃO + CUPOM!**

📦 {product_name}

💰 **Preço:** {original_price}
🎟️ **Com Cupom:** {final_price}
{old_price}
🏷️ **{discount_percentage}% OFF**

{coupon_section}

🛒 {platform_name}

🔗 {affiliate_link}

⚡ Economia dupla! Corre que está acabando!',
'Modelo Padrão 1: Promoção com Cupom - Simples e Direto',
true,
'["product_name", "current_price", "original_price", "final_price", "old_price", "discount_percentage", "platform_name", "coupon_section", "coupon_code", "coupon_discount", "affiliate_link", "price_with_coupon"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Modelo 2: Detalhado e Informativo (COM CUPOM)
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('promotion_with_coupon', 'all', 
'🎯 **OFERTA ESPECIAL + CUPOM!**

━━━━━━━━━━━━━━━━━━━━
📦 **PRODUTO**
{product_name}
━━━━━━━━━━━━━━━━━━━━

💰 **PREÇO ORIGINAL:** {original_price}
🎟️ **PREÇO COM CUPOM:** {final_price}
{old_price}
🎁 **DESCONTO DO PRODUTO:** {discount_percentage}% OFF

{coupon_section}

🏪 **LOJA:** {platform_name}

🔗 **COMPRAR AGORA:**
{affiliate_link}

⏰ **Oferta limitada! Não perca!**',
'Modelo Padrão 2: Promoção com Cupom - Detalhado',
false,
'["product_name", "current_price", "original_price", "final_price", "old_price", "discount_percentage", "platform_name", "coupon_section", "coupon_code", "coupon_discount", "affiliate_link", "price_with_coupon"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Modelo 3: Urgente e Ação (COM CUPOM)
INSERT INTO bot_message_templates (template_type, platform, template, description, is_active, available_variables) VALUES
('promotion_with_coupon', 'all', 
'⚡ **ECONOMIA DUPLA!** ⚡

🎁 {product_name}

💸 De {old_price}
💰 Por {original_price}
🎟️ **COM CUPOM: {final_price}**
🔥 **ECONOMIZE {discount_percentage}% + CUPOM!**

{coupon_section}

🛒 {platform_name}
🔗 {affiliate_link}

⏰ **ÚLTIMA CHANCE! Use o cupom agora!**',
'Modelo Padrão 3: Promoção com Cupom - Urgente',
false,
'["product_name", "current_price", "original_price", "final_price", "old_price", "discount_percentage", "platform_name", "coupon_section", "coupon_code", "coupon_discount", "affiliate_link", "price_with_coupon"]'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. COMENTÁRIOS E NOTAS
-- =====================================================
-- Esta migration:
-- 1. Adiciona suporte ao novo tipo 'promotion_with_coupon' no constraint
-- 2. Atualiza templates existentes de 'new_promotion' para remover {coupon_section}
-- 3. Cria 3 templates padrão para 'promotion_with_coupon'
--
-- O sistema agora escolhe automaticamente:
-- - 'new_promotion' quando produto NÃO tem cupom vinculado
-- - 'promotion_with_coupon' quando produto TEM cupom vinculado
--
-- Variáveis disponíveis para promotion_with_coupon:
-- - product_name, current_price, original_price, final_price, old_price
-- - discount_percentage, platform_name, affiliate_link
-- - coupon_section, coupon_code, coupon_discount, price_with_coupon







