-- ============================================
-- EXECUTAR AGORA: Configurações de Captura Telegram
-- ============================================
-- Este arquivo adiciona os campos necessários para configurar
-- horários, modos e filtros de captura de mensagens do Telegram
--
-- INSTRUÇÕES:
-- 1. Copie TODO o conteúdo deste arquivo
-- 2. Cole no SQL Editor do Supabase
-- 3. Clique em "Run" ou pressione Ctrl+Enter
-- ============================================

-- Migration: Adicionar configurações de captura para canais Telegram
-- Data: 2024-12-17

-- Adicionar campos de configuração de captura
DO $$ 
BEGIN
    -- Horário de início da captura
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'telegram_channels' AND column_name = 'capture_schedule_start'
    ) THEN
        ALTER TABLE telegram_channels ADD COLUMN capture_schedule_start TIME;
    END IF;

    -- Horário de fim da captura
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'telegram_channels' AND column_name = 'capture_schedule_end'
    ) THEN
        ALTER TABLE telegram_channels ADD COLUMN capture_schedule_end TIME;
    END IF;

    -- Modo de captura: 'new_only', '1_day', '2_days'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'telegram_channels' AND column_name = 'capture_mode'
    ) THEN
        ALTER TABLE telegram_channels ADD COLUMN capture_mode VARCHAR(20) DEFAULT 'new_only';
    END IF;

    -- Filtro de plataforma: 'all' ou nome da plataforma específica
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'telegram_channels' AND column_name = 'platform_filter'
    ) THEN
        ALTER TABLE telegram_channels ADD COLUMN platform_filter VARCHAR(50) DEFAULT 'all';
    END IF;

    -- Campo channel_id (já pode existir)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'telegram_channels' AND column_name = 'channel_id'
    ) THEN
        ALTER TABLE telegram_channels ADD COLUMN channel_id VARCHAR(100);
    END IF;

    -- Campo last_message_id para rastrear última mensagem processada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'telegram_channels' AND column_name = 'last_message_id'
    ) THEN
        ALTER TABLE telegram_channels ADD COLUMN last_message_id BIGINT;
    END IF;

    -- Campo last_sync_at para rastrear última sincronização
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'telegram_channels' AND column_name = 'last_sync_at'
    ) THEN
        ALTER TABLE telegram_channels ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_telegram_channels_capture_mode ON telegram_channels(capture_mode);
CREATE INDEX IF NOT EXISTS idx_telegram_channels_platform_filter ON telegram_channels(platform_filter);
CREATE INDEX IF NOT EXISTS idx_telegram_channels_channel_id ON telegram_channels(channel_id);

-- Comentários
COMMENT ON COLUMN telegram_channels.capture_schedule_start IS 'Horário de início para captura de mensagens (formato HH:MM)';
COMMENT ON COLUMN telegram_channels.capture_schedule_end IS 'Horário de fim para captura de mensagens (formato HH:MM)';
COMMENT ON COLUMN telegram_channels.capture_mode IS 'Modo de captura: new_only (apenas novas), 1_day (até 1 dia atrás), 2_days (até 2 dias atrás)';
COMMENT ON COLUMN telegram_channels.platform_filter IS 'Filtro de plataforma: all (todas) ou nome específico (mercadolivre, amazon, shopee, etc)';
COMMENT ON COLUMN telegram_channels.channel_id IS 'ID do canal Telegram (formato -100XXXXXXXXX)';
COMMENT ON COLUMN telegram_channels.last_message_id IS 'ID da última mensagem processada';
COMMENT ON COLUMN telegram_channels.last_sync_at IS 'Data/hora da última sincronização de mensagens';

-- ============================================
-- ✅ Migration concluída!
-- ============================================
-- Agora você pode usar as configurações de captura
-- no painel admin /telegram-channels
-- ============================================

