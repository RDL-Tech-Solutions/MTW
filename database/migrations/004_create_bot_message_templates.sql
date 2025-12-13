-- =====================================================
-- TABELA: bot_message_templates
-- Templates customizáveis de mensagens para bots
-- =====================================================

CREATE TABLE IF NOT EXISTS bot_message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Tipo de template
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('new_promotion', 'new_coupon', 'expired_coupon')),
  
  -- Plataforma (telegram, whatsapp, ou 'all' para ambas)
  platform VARCHAR(20) DEFAULT 'all' CHECK (platform IN ('telegram', 'whatsapp', 'all')),
  
  -- Template da mensagem (suporta variáveis {name}, {price}, etc)
  template TEXT NOT NULL,
  
  -- Se está ativo
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Descrição do template
  description TEXT,
  
  -- Variáveis disponíveis (JSON)
  available_variables JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bot_message_templates_type ON bot_message_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_bot_message_templates_platform ON bot_message_templates(platform);
CREATE INDEX IF NOT EXISTS idx_bot_message_templates_active ON bot_message_templates(is_active);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_bot_message_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bot_message_templates_updated_at
  BEFORE UPDATE ON bot_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_bot_message_templates_updated_at();

-- Inserir templates padrão
INSERT INTO bot_message_templates (template_type, platform, template, description, available_variables) VALUES
('new_promotion', 'all', 
'🔥 *NOVA PROMOÇÃO AUTOMÁTICA*

📦 {product_name}

💰 *{current_price}*{old_price}
🏷️ *{discount_percentage}% OFF*

🛒 Plataforma: {platform_name}

{coupon_section}

🔗 {affiliate_link}

⚡ Aproveite antes que acabe!',
'Template para nova promoção de produto',
'["product_name", "current_price", "old_price", "discount_percentage", "platform_name", "affiliate_link", "coupon_section"]'::jsonb),

('new_coupon', 'all',
'🎟️ *NOVO CUPOM DISPONÍVEL*

🏪 Plataforma: {platform_name}
💬 *Código do Cupom:*
`{coupon_code}`

💰 Desconto: {discount_value} OFF
📅 Válido até: {valid_until}
{min_purchase}

📝 {coupon_title}
{coupon_description}

🔗 {affiliate_link}

⚡ Use agora e economize!',
'Template para novo cupom',
'["platform_name", "coupon_code", "discount_value", "valid_until", "min_purchase", "coupon_title", "coupon_description", "affiliate_link"]'::jsonb),

('expired_coupon', 'all',
'⚠️ *CUPOM EXPIROU*

🏪 Plataforma: {platform_name}
💬 Código: `{coupon_code}`
📅 Expirado em: {expired_date}

😔 Infelizmente este cupom não está mais disponível.
🔔 Fique atento às próximas promoções!',
'Template para cupom expirado',
'["platform_name", "coupon_code", "expired_date"]'::jsonb)
ON CONFLICT DO NOTHING;

