-- Adicionar campo para ativar/desativar republicação automática
-- Executar este SQL no Supabase SQL Editor

-- Adicionar coluna na tabela app_settings
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS auto_republish_enabled BOOLEAN DEFAULT false;

-- Comentário
COMMENT ON COLUMN app_settings.auto_republish_enabled IS 'Ativa/desativa republicação automática de produtos com IA';
