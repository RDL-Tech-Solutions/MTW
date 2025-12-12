-- ============================================
-- CRIAR USUÁRIO ADMIN - VERSÃO FINAL
-- MTW Promo - Hash REAL da senha admin123
-- ============================================

-- PASSO 1: Garantir que as colunas existem
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS vip_expires_at TIMESTAMP WITH TIME ZONE;

-- PASSO 2: Remover constraint NOT NULL da coluna password (se existir)
ALTER TABLE users 
ALTER COLUMN password DROP NOT NULL;

-- PASSO 3: Deletar usuário admin se já existir (para recriar do zero)
DELETE FROM users WHERE email = 'admin@mtwpromo.com';

-- PASSO 4: Criar usuário admin com hash REAL
-- Hash gerado com bcrypt para senha: admin123
INSERT INTO users (
  email,
  password,
  password_hash,
  name,
  role,
  is_vip,
  vip_expires_at,
  created_at,
  updated_at
) VALUES (
  'admin@mtwpromo.com',
  '$2a$10$ZWV.s0DRPqDH.k0ppAWdteq1Elg0OQL5Pk.8tFF5AyMwNra5XDMVO',
  '$2a$10$ZWV.s0DRPqDH.k0ppAWdteq1Elg0OQL5Pk.8tFF5AyMwNra5XDMVO',
  'Administrador',
  'admin',
  true,
  NULL,
  NOW(),
  NOW()
);

-- PASSO 5: Verificar se foi criado corretamente
SELECT 
  id,
  email,
  name,
  role,
  is_vip,
  LEFT(password, 20) || '...' as password_preview,
  LEFT(password_hash, 20) || '...' as password_hash_preview,
  created_at
FROM users
WHERE email = 'admin@mtwpromo.com';

-- ============================================
-- RESULTADO ESPERADO:
-- ✅ Success
-- 
-- email: admin@mtwpromo.com
-- name: Administrador
-- role: admin
-- is_vip: true
-- password_preview: $2a$10$ZWV.s0DRPqDH...
-- password_hash_preview: $2a$10$ZWV.s0DRPqDH...
-- 
-- ============================================
-- CREDENCIAIS DE LOGIN:
-- Email: admin@mtwpromo.com
-- Senha: admin123
-- 
-- ⚠️ TESTADO E FUNCIONANDO!
-- ============================================
