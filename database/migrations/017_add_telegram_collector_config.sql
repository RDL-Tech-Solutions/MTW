-- Migration: Adicionar tabela de configurações do Telegram Collector
-- Data: 2024-12-13

-- Tabela para armazenar configurações do Telegram Collector
CREATE TABLE IF NOT EXISTS telegram_collector_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_id VARCHAR(50),
    api_hash VARCHAR(100),
    phone VARCHAR(20),
    session_path VARCHAR(255) DEFAULT 'telegram_session.session',
    is_authenticated BOOLEAN DEFAULT false,
    listener_status VARCHAR(20) DEFAULT 'stopped', -- stopped, running, error
    listener_pid INTEGER,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_config CHECK (id = '00000000-0000-0000-0000-000000000001')
);

-- Inserir registro único (ou atualizar se já existir)
INSERT INTO telegram_collector_config (id, api_id, api_hash, phone, session_path, is_authenticated, listener_status)
VALUES ('00000000-0000-0000-0000-000000000001', NULL, NULL, NULL, 'telegram_session.session', false, 'stopped')
ON CONFLICT (id) DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_telegram_collector_config_id ON telegram_collector_config(id);

-- Comentários
COMMENT ON TABLE telegram_collector_config IS 'Configurações do Telegram Collector (MTProto)';
COMMENT ON COLUMN telegram_collector_config.api_id IS 'API ID do Telegram (obtido em my.telegram.org/apps)';
COMMENT ON COLUMN telegram_collector_config.api_hash IS 'API Hash do Telegram';
COMMENT ON COLUMN telegram_collector_config.phone IS 'Número de telefone para autenticação';
COMMENT ON COLUMN telegram_collector_config.is_authenticated IS 'Indica se a conta está autenticada';
COMMENT ON COLUMN telegram_collector_config.listener_status IS 'Status do listener: stopped, running, error';
COMMENT ON COLUMN telegram_collector_config.listener_pid IS 'PID do processo do listener (se estiver rodando)';



