-- Adicionar colunas para recuperação de senha
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP WITH TIME ZONE;

-- Criar índice para melhorar performance de busca por token
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;

-- Comentários
COMMENT ON COLUMN users.reset_token IS 'Hash SHA-256 do token de recuperação de senha';
COMMENT ON COLUMN users.reset_token_expiry IS 'Data/hora de expiração do token de recuperação';
