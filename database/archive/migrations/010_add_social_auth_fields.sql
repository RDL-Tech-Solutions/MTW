-- Adicionar campos para autenticação social (Google/Facebook)
-- Migration: 010_add_social_auth_fields.sql

-- Adicionar colunas para autenticação social
ALTER TABLE users
ADD COLUMN IF NOT EXISTS provider TEXT,
ADD COLUMN IF NOT EXISTS provider_id TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Criar índice para busca rápida por provider_id
CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider, provider_id);

-- Comentários
COMMENT ON COLUMN users.provider IS 'Provedor de autenticação social: google, facebook, etc.';
COMMENT ON COLUMN users.provider_id IS 'ID do usuário no provedor de autenticação';
COMMENT ON COLUMN users.avatar_url IS 'URL do avatar do usuário (do provedor social)';

