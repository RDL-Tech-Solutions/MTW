-- =====================================================
-- Migration: Add Forced DC (Data Center) to Telegram Collector Config
-- Data: 2026-01-08
-- Descrição: Permite ao usuário forçar um Data Center específico
--            para melhorar a estabilidade da conexão Telegram
-- =====================================================

-- Adicionar colunas para forçar Data Center
ALTER TABLE telegram_collector_config
ADD COLUMN IF NOT EXISTS forced_dc_id INTEGER,
ADD COLUMN IF NOT EXISTS forced_dc_ip VARCHAR(50),
ADD COLUMN IF NOT EXISTS forced_dc_port INTEGER DEFAULT 443;

-- Comentários explicativos
COMMENT ON COLUMN telegram_collector_config.forced_dc_id IS 'ID do Data Center forçado (1-5). NULL = automático';
COMMENT ON COLUMN telegram_collector_config.forced_dc_ip IS 'IP do servidor Telegram para conexão forçada';
COMMENT ON COLUMN telegram_collector_config.forced_dc_port IS 'Porta do servidor (padrão: 443)';

-- Verificar se a migração foi aplicada
SELECT 'Migration 039_add_forced_dc_to_telegram_config.sql aplicada com sucesso!' as status;
