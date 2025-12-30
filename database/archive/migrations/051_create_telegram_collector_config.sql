-- Tabela para Configurações do Coletor Telegram
CREATE TABLE IF NOT EXISTS telegram_collector_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_id VARCHAR(50),
    api_hash VARCHAR(100),
    phone VARCHAR(30),
    password VARCHAR(100),
    session_path VARCHAR(255) DEFAULT 'telegram_session.session',
    is_authenticated BOOLEAN DEFAULT FALSE,
    listener_status VARCHAR(20) DEFAULT 'stopped' CHECK (listener_status IN ('running', 'stopped', 'error')),
    listener_pid INTEGER,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_collector_config CHECK (id = '00000000-0000-0000-0000-000000000001')
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_telegram_collector_config_updated_at BEFORE UPDATE ON telegram_collector_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas de segurança
ALTER TABLE telegram_collector_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin Full Access Telegram Config" ON telegram_collector_config FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Criar configuração padrão se não existir
INSERT INTO telegram_collector_config (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;
