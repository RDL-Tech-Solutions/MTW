-- =====================================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- Adiciona templates padrão completos para 'promotion_with_coupon'
-- Data: 2025-12-29
-- =====================================================

-- =====================================================
-- 1. GARANTIR QUE A CONSTRAINT ESTÁ ATUALIZADA
-- =====================================================

-- Remover constraint antiga se existir
ALTER TABLE bot_message_templates 
DROP CONSTRAINT IF EXISTS bot_message_templates_template_type_check;

-- Adicionar nova constraint com todos os tipos
ALTER TABLE bot_message_templates 
ADD CONSTRAINT bot_message_templates_template_type_check 
CHECK (template_type IN ('new_promotion', 'promotion_with_coupon', 'new_coupon', 'expired_coupon'));

-- =====================================================
-- 2. LIMPAR TEMPLATES ANTIGOS DE promotion_with_coupon (OPCIONAL)
-- =====================================================
-- Descomente a linha abaixo se quiser remover templates antigos antes de inserir
-- DELETE FROM bot_message_templates WHERE template_type = 'promotion_with_coupon';

-- =====================================================
-- 3. INSERIR TEMPLATES PADRÃO PARA 'promotion_with_coupon'
-- =====================================================

-- ===================================================
-- Modelo 1: Simples e Direto (ATIVO POR PADRÃO)
-- ===================================================
INSERT INTO bot_message_templates (
  template_type, 
  platform, 
  template, 
  description, 
  is_active, 
  available_variables
) VALUES (
  'promotion_with_coupon', 
  'all', 
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
  '["product_name", "current_price", "original_price", "final_price", "price_with_coupon", "old_price", "discount_percentage", "platform_name", "coupon_section", "coupon_code", "coupon_discount", "affiliate_link"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ===================================================
-- Modelo 2: Detalhado e Informativo
-- ===================================================
INSERT INTO bot_message_templates (
  template_type, 
  platform, 
  template, 
  description, 
  is_active, 
  available_variables
) VALUES (
  'promotion_with_coupon', 
  'all', 
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
  '["product_name", "current_price", "original_price", "final_price", "price_with_coupon", "old_price", "discount_percentage", "platform_name", "coupon_section", "coupon_code", "coupon_discount", "affiliate_link"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ===================================================
-- Modelo 3: Urgente e Ação
-- ===================================================
INSERT INTO bot_message_templates (
  template_type, 
  platform, 
  template, 
  description, 
  is_active, 
  available_variables
) VALUES (
  'promotion_with_coupon', 
  'all', 
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
  '["product_name", "current_price", "original_price", "final_price", "price_with_coupon", "old_price", "discount_percentage", "platform_name", "coupon_section", "coupon_code", "coupon_discount", "affiliate_link"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- ✅ MIGRATION CONCLUÍDA COM SUCESSO
-- =====================================================

-- O sistema agora possui templates padrão completos para todos os tipos:
-- 
-- 1. new_promotion (SEM cupom vinculado)
--    - 3 modelos disponíveis
--
-- 2. promotion_with_coupon (COM cupom vinculado) ✅ NOVO
--    - 3 modelos disponíveis
--    - Modelo 1 ativo por padrão
--
-- 3. new_coupon
--    - 3 modelos disponíveis
--
-- 4. expired_coupon
--    - 3 modelos disponíveis
--
-- =====================================================
-- VARIÁVEIS DISPONÍVEIS PARA promotion_with_coupon:
-- =====================================================
-- 
-- Informações do Produto:
--   {product_name}          - Nome do produto
--   {current_price}         - Preço atual do produto (antes do cupom)
--   {original_price}        - Preço original (igual a current_price)
--   {old_price}             - Preço antigo riscado (se existir)
--   {discount_percentage}   - Porcentagem de desconto do produto
--   {platform_name}         - Nome da plataforma (Mercado Livre, Shopee, etc)
--   {affiliate_link}        - Link de afiliado
--
-- Informações do Cupom:
--   {coupon_code}           - Código do cupom
--   {coupon_discount}       - Desconto do cupom (ex: "10%" ou "R$ 20,00")
--   {coupon_section}        - Seção formatada com todos os detalhes do cupom
--   {price_with_coupon}     - Preço final COM o cupom aplicado
--   {final_price}           - Igual a price_with_coupon
--
-- =====================================================
-- COMO O SISTEMA ESCOLHE O TEMPLATE:
-- =====================================================
--
-- O sistema escolhe automaticamente baseado em product.coupon_id:
--
-- 1. Se product.coupon_id EXISTE:
--    → Usa template 'promotion_with_coupon' ✅
--    → Mostra informações do produto + cupom
--
-- 2. Se product.coupon_id NÃO EXISTE (null):
--    → Usa template 'new_promotion'
--    → Mostra apenas informações do produto
--
-- =====================================================
-- PRÓXIMOS PASSOS:
-- =====================================================
--
-- 1. Execute este SQL no Supabase SQL Editor
-- 2. Verifique no Painel Admin > Configurações > Templates de Mensagem
-- 3. Teste aprovando um produto COM cupom vinculado
-- 4. Verifique se o bot usa o template correto
-- 5. Personalize os templates conforme necessário no painel admin
--
-- =====================================================
