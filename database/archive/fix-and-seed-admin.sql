-- ============================================
-- FIX E SEED ADMIN USER
-- MTW Promo - Correção completa + Criar Admin
-- ============================================

-- PASSO 1: Adicionar coluna password_hash se não existir
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- PASSO 2: Adicionar coluna vip_expires_at se não existir
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS vip_expires_at TIMESTAMP WITH TIME ZONE;

-- PASSO 3: Remover constraint NOT NULL da coluna password
ALTER TABLE users 
ALTER COLUMN password DROP NOT NULL;

-- PASSO 4: Inserir usuário admin com AMBAS as colunas preenchidas
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
  '$2a$10$39YioAKycwb9ZaSpwTWKmOceKd7iCpcxjP3.uG0XXu/EMcKW/W5/O', -- para compatibilidade
  '$2a$10$39YioAKycwb9ZaSpwTWKmOceKd7iCpcxjP3.uG0XXu/EMcKW/W5/O', -- admin123
  'Administrador',
  'admin',
  true,
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_vip = EXCLUDED.is_vip,
  updated_at = NOW();

-- PASSO 5: Verificar se foi criado
SELECT 
  id,
  email,
  name,
  role,
  is_vip,
  CASE WHEN password IS NOT NULL THEN '✓ Preenchido' ELSE '✗ Vazio' END as password_status,
  CASE WHEN password_hash IS NOT NULL THEN '✓ Preenchido' ELSE '✗ Vazio' END as password_hash_status,
  created_at
FROM users
WHERE email = 'admin@mtwpromo.com';

-- ============================================
-- RESULTADO ESPERADO:
-- ✅ Success
-- email: admin@mtwpromo.com
-- password_status: ✓ Preenchido
-- password_hash_status: ✓ Preenchido
-- 
-- CREDENCIAIS:
-- Email: admin@mtwpromo.com
-- Senha: admin123
-- ============================================
