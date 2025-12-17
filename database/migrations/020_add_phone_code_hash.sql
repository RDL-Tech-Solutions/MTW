-- Migration: Adicionar campo phone_code_hash para autenticação Telegram
-- Data: 2024-12-13

-- Adicionar campo para armazenar phoneCodeHash temporariamente durante autenticação
ALTER TABLE telegram_collector_config 
ADD COLUMN IF NOT EXISTS phone_code_hash VARCHAR(255);

-- Comentário
COMMENT ON COLUMN telegram_collector_config.phone_code_hash IS 'Hash temporário do código de verificação (expira após alguns minutos)';




