-- =====================================================
-- TABELA: bot_config
-- Configurações globais dos bots de notificação
-- =====================================================

CREATE TABLE IF NOT EXISTS bot_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Telegram
  telegram_enabled BOOLEAN DEFAULT FALSE,
  telegram_bot_token TEXT,
  telegram_bot_username VARCHAR(100),
  telegram_parse_mode VARCHAR(20) DEFAULT 'Markdown',
  telegram_disable_preview BOOLEAN DEFAULT FALSE,
  
  -- WhatsApp (Meta Business API)
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  whatsapp_api_url TEXT,
  whatsapp_api_token TEXT,
  whatsapp_phone_number_id VARCHAR(100),
  whatsapp_business_account_id VARCHAR(100),
  
  -- Configurações de Notificação
  notify_new_products BOOLEAN DEFAULT TRUE,
  notify_new_coupons BOOLEAN DEFAULT TRUE,
  notify_expired_coupons BOOLEAN DEFAULT FALSE,
  notify_price_drops BOOLEAN DEFAULT TRUE,
  min_discount_to_notify INTEGER DEFAULT 20,
  
  -- Templates de Mensagem
  message_template_product TEXT DEFAULT '🔥 *Nova Promoção!*

🛍 *{name}*

{old_price}💰 *R$ {price}* {discount}

🏪 Loja: {platform}

[🔗 Ver Oferta]({link})',
  
  message_template_coupon TEXT DEFAULT '🎟 *Novo Cupom!*

🏪 Loja: {platform}
💬 Código: `{code}`
💰 Desconto: {discount}
⏳ Válido até: {expires}',
  
  -- Rate Limiting
  rate_limit_per_minute INTEGER DEFAULT 20,
  delay_between_messages INTEGER DEFAULT 500,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca rápida (só terá 1 registro)
CREATE INDEX IF NOT EXISTS idx_bot_config_id ON bot_config(id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_bot_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bot_config_updated_at ON bot_config;
CREATE TRIGGER update_bot_config_updated_at
  BEFORE UPDATE ON bot_config
  FOR EACH ROW EXECUTE FUNCTION update_bot_config_updated_at();

-- Inserir configuração padrão se não existir
INSERT INTO bot_config (id)
SELECT uuid_generate_v4()
WHERE NOT EXISTS (SELECT 1 FROM bot_config);

-- Comentário na tabela
COMMENT ON TABLE bot_config IS 'Configurações globais dos bots de notificação (Telegram e WhatsApp)';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
SELECT 'Migration 003_create_bot_config executada com sucesso!' as status;

