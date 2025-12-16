-- Migration: Remover coluna python_path da tabela app_settings
-- Data: 2024-12-14
-- Descrição: Remove python_path pois o Telegram Collector agora usa Node.js (gramjs) em vez de Python

-- Remover coluna python_path
ALTER TABLE app_settings DROP COLUMN IF EXISTS python_path;

-- Comentário atualizado
COMMENT ON TABLE app_settings IS 'Configurações gerais da aplicação migradas do .env. Telegram Collector agora usa Node.js (gramjs) em vez de Python.';



