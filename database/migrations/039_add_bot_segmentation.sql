-- =====================================================
-- Migration: Segmentação Inteligente de Bots
-- Data: 2024-12-20
-- Descrição: Adiciona campos para segmentação por categoria, horários e controle de duplicação
-- =====================================================

-- Adicionar campos de segmentação aos bot_channels
ALTER TABLE bot_channels
ADD COLUMN IF NOT EXISTS category_filter JSONB DEFAULT '[]'::jsonb; -- Array de category_ids permitidos (vazio = todas)

ALTER TABLE bot_channels
ADD COLUMN IF NOT EXISTS platform_filter JSONB DEFAULT '[]'::jsonb; -- Array de plataformas permitidas (vazio = todas)

ALTER TABLE bot_channels
ADD COLUMN IF NOT EXISTS schedule_start TIME; -- Horário de início (ex: '09:00')
ALTER TABLE bot_channels
ADD COLUMN IF NOT EXISTS schedule_end TIME; -- Horário de fim (ex: '22:00')

ALTER TABLE bot_channels
ADD COLUMN IF NOT EXISTS min_offer_score DECIMAL(5,2) DEFAULT 0.0; -- Score mínimo para enviar (0-100)

ALTER TABLE bot_channels
ADD COLUMN IF NOT EXISTS avoid_duplicates_hours INTEGER DEFAULT 24; -- Não enviar mesma oferta por X horas

-- Índices
CREATE INDEX IF NOT EXISTS idx_bot_channels_category_filter ON bot_channels USING GIN (category_filter);
CREATE INDEX IF NOT EXISTS idx_bot_channels_platform_filter ON bot_channels USING GIN (platform_filter);

-- =====================================================
-- TABELA: bot_send_logs (Controle de Duplicação)
-- =====================================================

CREATE TABLE IF NOT EXISTS bot_send_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES bot_channels(id) ON DELETE CASCADE,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('product', 'coupon')),
  entity_id UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_id, entity_type, entity_id)
);

-- Índices para logs de envio
CREATE INDEX IF NOT EXISTS idx_bot_send_logs_channel ON bot_send_logs(channel_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_bot_send_logs_entity ON bot_send_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_bot_send_logs_sent_at ON bot_send_logs(sent_at);

-- Função para limpar logs antigos (manter apenas últimos 30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_bot_send_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM bot_send_logs
  WHERE sent_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;



