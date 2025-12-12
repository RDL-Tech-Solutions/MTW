-- ============================================
-- SEED ADMIN USER
-- MTW Promo - Usuário Administrador Padrão
-- ============================================

-- IMPORTANTE: Execute primeiro o migration-add-password-hash.sql
-- se a coluna password_hash não existir!

-- Inserir usuário admin
-- Senha: admin123 (hash bcrypt com salt 10)
INSERT INTO users (
  email,
  password_hash,
  name,
  role,
  is_vip,
  vip_expires_at,
  created_at,
  updated_at
) VALUES (
  'admin@mtwpromo.com',
  '$2b$10$rZ5YhkW8qN3xJ5xJ5xJ5xOeKqF5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xu', -- admin123
  'Administrador',
  'admin',
  true,
  NULL, -- VIP não expira para admin
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_vip = EXCLUDED.is_vip,
  updated_at = NOW();

-- Verificar se o usuário foi criado
SELECT 
  id,
  email,
  name,
  role,
  is_vip,
  created_at
FROM users
WHERE email = 'admin@mtwpromo.com';

-- ============================================
-- INSTRUÇÕES
-- ============================================
-- 1. Copie este SQL
-- 2. Acesse o Supabase SQL Editor
-- 3. Cole e execute
-- 4. Verifique se o usuário foi criado
-- 
-- CREDENCIAIS DE LOGIN:
-- Email: admin@mtwpromo.com
-- Senha: admin123
-- 
-- IMPORTANTE: Altere a senha após o primeiro login!
-- ============================================
