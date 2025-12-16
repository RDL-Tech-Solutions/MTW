-- Migration: Adicionar coluna channel_id à tabela telegram_channels
-- Data: 2025-12-15
-- Descrição: Adiciona campo para armazenar o ID do canal do Telegram (obtido via API)

-- Adicionar coluna channel_id se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'telegram_channels' AND column_name = 'channel_id'
    ) THEN
        ALTER TABLE telegram_channels 
        ADD COLUMN channel_id VARCHAR(50);
        
        COMMENT ON COLUMN telegram_channels.channel_id IS 'ID do canal no Telegram (ex: -1001234567890). Obtido automaticamente ao resolver o username.';
    END IF;
END $$;

-- Adicionar índice para channel_id
CREATE INDEX IF NOT EXISTS idx_telegram_channels_channel_id ON telegram_channels(channel_id);

-- Adicionar campos adicionais úteis para o listener
DO $$ 
BEGIN
    -- Campo last_message_id para rastrear última mensagem processada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'telegram_channels' AND column_name = 'last_message_id'
    ) THEN
        ALTER TABLE telegram_channels 
        ADD COLUMN last_message_id BIGINT;
    END IF;

    -- Campo last_sync_at para rastrear última sincronização
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'telegram_channels' AND column_name = 'last_sync_at'
    ) THEN
        ALTER TABLE telegram_channels 
        ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Comentários
COMMENT ON COLUMN telegram_channels.channel_id IS 'ID do canal no Telegram (ex: -1001234567890). Obtido automaticamente ao resolver o username.';
COMMENT ON COLUMN telegram_channels.last_message_id IS 'ID da última mensagem processada deste canal';
COMMENT ON COLUMN telegram_channels.last_sync_at IS 'Timestamp da última sincronização/processamento de mensagens';

