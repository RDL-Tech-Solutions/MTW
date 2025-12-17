-- Migration: Adicionar campo last_code_sent_at para rastrear tentativas de envio de código
-- Data: 2024-12-14

-- Adicionar campo para rastrear última tentativa de envio de código
ALTER TABLE telegram_collector_config
ADD COLUMN IF NOT EXISTS last_code_sent_at TIMESTAMP;

-- Comentário
COMMENT ON COLUMN telegram_collector_config.last_code_sent_at IS 'Timestamp da última tentativa de envio de código de verificação (para evitar rate limiting)';




