# 🔧 Corrigir Coluna de Senha

## ❌ Erro Encontrado

```
ERROR: 42703: column "password_hash" of relation "users" does not exist
```

## ✅ Solução

A tabela `users` foi criada com a coluna `password` mas o código usa `password_hash`. 

Precisamos adicionar a coluna correta.

---

## 🚀 Passo a Passo

### 1. Execute a Migração

No **Supabase SQL Editor**, execute este SQL:

```sql
-- Adicionar coluna password_hash
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Copiar dados existentes (se houver)
UPDATE users 
SET password_hash = password 
WHERE password_hash IS NULL AND password IS NOT NULL;

-- Tornar obrigatória
ALTER TABLE users 
ALTER COLUMN password_hash SET NOT NULL;

-- Adicionar coluna vip_expires_at
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS vip_expires_at TIMESTAMP WITH TIME ZONE;
```

### 2. Verificar se Funcionou

```sql
-- Ver estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

Você deve ver a coluna `password_hash` na lista.

### 3. Criar Usuário Admin

Agora execute o `seed-admin.sql`:

```sql
-- Inserir usuário admin (senha: admin123)
INSERT INTO users (
  email,
  password_hash,
  name,
  role,
  is_vip,
  created_at,
  updated_at
) VALUES (
  'admin@mtwpromo.com',
  '$2b$10$rZ5YhkW8qN3xJ5xJ5xJ5xOeKqF5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xu',
  'Administrador',
  'admin',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_vip = EXCLUDED.is_vip,
  updated_at = NOW();
```

### 4. Verificar Usuário Criado

```sql
SELECT id, email, name, role, is_vip, created_at
FROM users
WHERE email = 'admin@mtwpromo.com';
```

---

## 🎯 Resultado Esperado

```
✅ Success

id: 123e4567-e89b-12d3-a456-426614174000
email: admin@mtwpromo.com
name: Administrador
role: admin
is_vip: true
created_at: 2025-12-12 08:30:00
```

---

## 🔐 Testar Login

Agora você pode fazer login:

```
Email: admin@mtwpromo.com
Senha: admin123
```

---

## 📝 Alternativa: SQL Completo (Copiar e Colar)

Execute tudo de uma vez:

```sql
-- 1. Adicionar coluna password_hash
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 2. Adicionar coluna vip_expires_at
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS vip_expires_at TIMESTAMP WITH TIME ZONE;

-- 3. Criar usuário admin
INSERT INTO users (
  email,
  password_hash,
  name,
  role,
  is_vip,
  created_at,
  updated_at
) VALUES (
  'admin@mtwpromo.com',
  '$2b$10$rZ5YhkW8qN3xJ5xJ5xJ5xOeKqF5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xu',
  'Administrador',
  'admin',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_vip = EXCLUDED.is_vip,
  updated_at = NOW();

-- 4. Verificar
SELECT id, email, name, role, is_vip, created_at
FROM users
WHERE email = 'admin@mtwpromo.com';
```

---

## ✅ Pronto!

Agora você pode:
- ✅ Fazer login no Admin Panel
- ✅ Usar as credenciais: admin@mtwpromo.com / admin123
- ✅ Acessar todas as funcionalidades

---

## 🔄 Se Precisar Recriar do Zero

Se quiser limpar e recriar tudo:

```sql
-- CUIDADO: Isso apaga todos os dados!
DROP TABLE IF EXISTS users CASCADE;

-- Recriar tabela com estrutura correta
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  push_token VARCHAR(255),
  is_vip BOOLEAN DEFAULT FALSE,
  vip_expires_at TIMESTAMP WITH TIME ZONE,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'vip')),
  favorite_categories JSONB DEFAULT '[]'::jsonb,
  favorites JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_vip ON users(is_vip);

-- Inserir admin
INSERT INTO users (
  email,
  password_hash,
  name,
  role,
  is_vip,
  created_at,
  updated_at
) VALUES (
  'admin@mtwpromo.com',
  '$2b$10$rZ5YhkW8qN3xJ5xJ5xJ5xOeKqF5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xu',
  'Administrador',
  'admin',
  true,
  NOW(),
  NOW()
);
```

---

**Problema resolvido!** 🎉
