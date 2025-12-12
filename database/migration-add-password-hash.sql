-- ============================================
-- MIGRATION: Adicionar coluna password_hash
-- MTW Promo - Correção da coluna de senha
-- ============================================

-- 1. Adicionar nova coluna password_hash
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 2. Copiar dados da coluna password para password_hash (se existirem)
UPDATE users 
SET password_hash = password 
WHERE password_hash IS NULL AND password IS NOT NULL;

-- 3. Remover coluna antiga password (opcional - comentado por segurança)
-- ALTER TABLE users DROP COLUMN IF EXISTS password;

-- 4. Tornar password_hash obrigatória
ALTER TABLE users 
ALTER COLUMN password_hash SET NOT NULL;

-- 5. Adicionar coluna vip_expires_at se não existir
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS vip_expires_at TIMESTAMP WITH TIME ZONE;

-- 6. Adicionar coluna description se não existir
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- INSTRUÇÕES
-- ============================================
-- 1. Execute este SQL no Supabase SQL Editor
-- 2. Verifique se a coluna password_hash foi criada
-- 3. Depois execute o seed-admin.sql
-- ============================================
