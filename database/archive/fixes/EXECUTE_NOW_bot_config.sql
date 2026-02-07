-- =====================================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- Cria a tabela de configuração dos bots
-- =====================================================

-- Criar tabela bot_config
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
  whatsapp_api_url TEXT DEFAULT 'https://graph.facebook.com/v18.0',
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
  message_template_product TEXT,
  message_template_coupon TEXT,
  
  -- Rate Limiting
  rate_limit_per_minute INTEGER DEFAULT 20,
  delay_between_messages INTEGER DEFAULT 500,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configuração padrão inicial
INSERT INTO bot_config (
  id,
  telegram_enabled,
  whatsapp_enabled,
  notify_new_products,
  notify_new_coupons,
  notify_expired_coupons,
  notify_price_drops,
  min_discount_to_notify
)
SELECT 
  uuid_generate_v4(),
  FALSE,
  FALSE,
  TRUE,
  TRUE,
  FALSE,
  TRUE,
  20
WHERE NOT EXISTS (SELECT 1 FROM bot_config LIMIT 1);

-- Desabilitar RLS para permitir operações do backend
ALTER TABLE bot_config DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT 'Tabela bot_config criada com sucesso!' as status;
SELECT * FROM bot_config;

