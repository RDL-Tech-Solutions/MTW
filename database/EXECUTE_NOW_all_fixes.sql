-- =====================================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- CORREÇÕES COMPLETAS PARA O SISTEMA DE BOTS
-- =====================================================

-- =====================================================
-- 1. CRIAR TABELA bot_config
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

-- Inserir configuração padrão inicial se não existir
INSERT INTO bot_config (id)
SELECT uuid_generate_v4()
WHERE NOT EXISTS (SELECT 1 FROM bot_config LIMIT 1);

-- Desabilitar RLS
ALTER TABLE bot_config DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CORRIGIR notification_logs - event_type constraint
-- =====================================================
ALTER TABLE notification_logs 
DROP CONSTRAINT IF EXISTS notification_logs_event_type_check;

ALTER TABLE notification_logs 
ADD CONSTRAINT notification_logs_event_type_check 
CHECK (event_type IN ('promotion_new', 'coupon_new', 'coupon_expired', 'test', 'price_drop'));

-- =====================================================
-- 3. ADICIONAR COLUNAS EXTRAS EM notification_logs
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notification_logs' AND column_name = 'channel_name') THEN
    ALTER TABLE notification_logs ADD COLUMN channel_name VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notification_logs' AND column_name = 'success') THEN
    ALTER TABLE notification_logs ADD COLUMN success BOOLEAN DEFAULT TRUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notification_logs' AND column_name = 'message_id') THEN
    ALTER TABLE notification_logs ADD COLUMN message_id VARCHAR(255);
  END IF;
END $$;

-- =====================================================
-- 4. VERIFICAR TABELAS
-- =====================================================
SELECT 'bot_config' as tabela, COUNT(*) as registros FROM bot_config
UNION ALL
SELECT 'bot_channels' as tabela, COUNT(*) as registros FROM bot_channels
UNION ALL
SELECT 'notification_logs' as tabela, COUNT(*) as registros FROM notification_logs;

SELECT '✅ TODAS AS CORREÇÕES APLICADAS COM SUCESSO!' as status;

