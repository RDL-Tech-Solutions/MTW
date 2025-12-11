-- Migration: Adicionar tabelas para sistema de bots
-- Execute este script no SQL Editor do Supabase

-- =====================================================
-- TABELA: bot_channels
-- Armazena configurações dos canais de bot (WhatsApp e Telegram)
-- =====================================================
CREATE TABLE IF NOT EXISTS bot_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'telegram')),
  identifier VARCHAR(255) NOT NULL, -- ID do grupo/canal
  name VARCHAR(255), -- Nome descritivo do canal
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(platform, identifier)
);

-- Índices para bot_channels
CREATE INDEX idx_bot_channels_platform ON bot_channels(platform);
CREATE INDEX idx_bot_channels_is_active ON bot_channels(is_active);

-- =====================================================
-- TABELA: notification_logs
-- Registra todas as notificações enviadas pelos bots
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('promotion_new', 'coupon_new', 'coupon_expired')),
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'telegram')),
  channel_id UUID REFERENCES bot_channels(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para notification_logs
CREATE INDEX idx_notification_logs_event_type ON notification_logs(event_type);
CREATE INDEX idx_notification_logs_platform ON notification_logs(platform);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX idx_notification_logs_channel_id ON notification_logs(channel_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at em bot_channels
CREATE TRIGGER update_bot_channels_updated_at BEFORE UPDATE ON bot_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE bot_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para bot_channels (apenas admin pode gerenciar)
CREATE POLICY "Admins can view bot channels" ON bot_channels FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

CREATE POLICY "Admins can manage bot channels" ON bot_channels FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Políticas para notification_logs (apenas admin pode visualizar)
CREATE POLICY "Admins can view notification logs" ON notification_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

CREATE POLICY "System can insert notification logs" ON notification_logs FOR INSERT WITH CHECK (TRUE);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE bot_channels IS 'Configurações dos canais de bot (WhatsApp e Telegram)';
COMMENT ON TABLE notification_logs IS 'Log de todas as notificações enviadas pelos bots';

-- Verificar se tudo foi criado corretamente
SELECT 'Migration 001 executada com sucesso!' as status;
