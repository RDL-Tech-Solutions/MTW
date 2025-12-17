-- Migration: Adicionar tabela de canais Telegram e campos relacionados
-- Data: 2024-12-13

-- Tabela para armazenar canais Telegram monitorados
CREATE TABLE IF NOT EXISTS telegram_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    coupons_captured INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_telegram_channels_username ON telegram_channels(username);
CREATE INDEX IF NOT EXISTS idx_telegram_channels_active ON telegram_channels(is_active);
CREATE INDEX IF NOT EXISTS idx_telegram_channels_created_at ON telegram_channels(created_at);

-- Adicionar campos na tabela coupons se não existirem
DO $$ 
BEGIN
    -- Campo origem (já pode existir, então verificamos)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' AND column_name = 'origem'
    ) THEN
        ALTER TABLE coupons ADD COLUMN origem VARCHAR(50);
    END IF;

    -- Campo channel_origin para Telegram
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' AND column_name = 'channel_origin'
    ) THEN
        ALTER TABLE coupons ADD COLUMN channel_origin VARCHAR(255);
    END IF;

    -- Campo message_id para referência à mensagem do Telegram
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' AND column_name = 'message_id'
    ) THEN
        ALTER TABLE coupons ADD COLUMN message_id BIGINT;
    END IF;

    -- Campo message_hash para anti-duplicação
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' AND column_name = 'message_hash'
    ) THEN
        ALTER TABLE coupons ADD COLUMN message_hash VARCHAR(64);
    END IF;
END $$;

-- Índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_coupons_origem ON coupons(origem);
CREATE INDEX IF NOT EXISTS idx_coupons_channel_origin ON coupons(channel_origin);
CREATE INDEX IF NOT EXISTS idx_coupons_message_hash ON coupons(message_hash);

-- Comentários
COMMENT ON TABLE telegram_channels IS 'Canais públicos do Telegram monitorados para captura de cupons';
COMMENT ON COLUMN telegram_channels.username IS 'Username do canal (sem @)';
COMMENT ON COLUMN telegram_channels.coupons_captured IS 'Contador de cupons capturados deste canal';
COMMENT ON COLUMN coupons.origem IS 'Origem do cupom: telegram, gatry, manual, etc';
COMMENT ON COLUMN coupons.channel_origin IS 'Canal do Telegram de origem (username)';
COMMENT ON COLUMN coupons.message_id IS 'ID da mensagem do Telegram';
COMMENT ON COLUMN coupons.message_hash IS 'Hash SHA-256 para anti-duplicação';





