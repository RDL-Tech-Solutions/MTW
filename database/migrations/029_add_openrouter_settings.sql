-- Migration: Adicionar configurações OpenRouter para módulo de IA
-- Data: 2024-12-XX
-- Descrição: Adiciona campos para configuração do OpenRouter no app_settings

-- Adicionar colunas na tabela app_settings
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS openrouter_api_key VARCHAR(255),
ADD COLUMN IF NOT EXISTS openrouter_model VARCHAR(100) DEFAULT 'mistralai/mistral-7b-instruct',
ADD COLUMN IF NOT EXISTS openrouter_enabled BOOLEAN DEFAULT false;

-- Comentários nas colunas
COMMENT ON COLUMN app_settings.openrouter_api_key IS 'API Key do OpenRouter para acesso aos modelos de IA';
COMMENT ON COLUMN app_settings.openrouter_model IS 'Modelo de IA a ser usado (ex: mistralai/mistral-7b-instruct, openchat/openchat-7b)';
COMMENT ON COLUMN app_settings.openrouter_enabled IS 'Flag para ativar/desativar o módulo de IA';

-- Índice para busca rápida (se necessário)
-- CREATE INDEX IF NOT EXISTS idx_app_settings_openrouter_enabled ON app_settings(openrouter_enabled) WHERE openrouter_enabled = true;




