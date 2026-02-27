-- Adicionar colunas para código de verificação de 6 dígitos
-- Migração: Sistema de recuperação de senha com código

-- Adicionar coluna para código de verificação
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);

-- Adicionar coluna para expiração do código
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_code_expiry TIMESTAMP;

-- Adicionar índice para melhorar performance de busca por código
CREATE INDEX IF NOT EXISTS idx_users_verification_code 
ON users(verification_code);

-- Comentários
COMMENT ON COLUMN users.verification_code IS 'Código de 6 dígitos para recuperação de senha';
COMMENT ON COLUMN users.verification_code_expiry IS 'Data/hora de expiração do código de verificação (15 minutos)';
