-- ============================================
-- CRIAR USUÁRIO ADMIN: Roberto
-- Email: robertosshbrasil@gmail.com
-- Senha: roberto10
-- ============================================

INSERT INTO users (
  name,
  email,
  password_hash,
  password, -- Para compatibilidade/backup
  role,
  is_vip,
  created_at,
  updated_at
) VALUES (
  'Roberto Admin',
  'robertosshbrasil@gmail.com',
  '$2a$10$WjA7FXOF8dmYBoqiraGbaOyQRR4MlVTTTsAnWDRYeasMn3lNxXpLMW',
  '$2a$10$WjA7FXOF8dmYBoqiraGbaOyQRR4MlVTTTsAnWDRYeasMn3lNxXpLMW',
  'admin',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  is_vip = EXCLUDED.is_vip,
  updated_at = NOW();

-- Verificação
SELECT email, role, is_vip, created_at FROM users WHERE email = 'robertosshbrasil@gmail.com';
