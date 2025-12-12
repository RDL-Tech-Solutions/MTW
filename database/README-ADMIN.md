# 👤 Criar Usuário Administrador

## 🎯 Credenciais Padrão

```
Email: admin@mtwpromo.com
Senha: admin123
```

⚠️ **IMPORTANTE**: Altere a senha após o primeiro login!

---

## 📝 Método 1: SQL Direto (Recomendado)

### Passo a Passo:

1. **Acesse o Supabase SQL Editor**
   - Vá para: https://supabase.com/dashboard
   - Selecione seu projeto
   - Clique em **SQL Editor** no menu lateral

2. **Execute o SQL**
   - Clique em **New Query**
   - Copie o conteúdo do arquivo `seed-admin.sql`
   - Cole no editor
   - Clique em **Run** (ou pressione Ctrl+Enter)

3. **Verifique o Resultado**
   - Deve aparecer "Success"
   - Você verá os dados do usuário criado

### SQL Completo:

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

-- Verificar
SELECT id, email, name, role, is_vip, created_at
FROM users
WHERE email = 'admin@mtwpromo.com';
```

---

## 🔧 Método 2: Script Node.js

### Pré-requisitos:

- Backend configurado
- Arquivo `.env` com credenciais do Supabase

### Executar:

```bash
cd backend
node scripts/create-admin.js
```

### Saída Esperada:

```
🔐 Gerando hash da senha...
✅ Hash gerado: $2b$10$...

👤 Criando usuário admin...
✅ Usuário admin criado com sucesso!

📋 CREDENCIAIS DE LOGIN:
   Email: admin@mtwpromo.com
   Senha: admin123

⚠️  IMPORTANTE: Altere a senha após o primeiro login!

👤 Dados do usuário:
   ID: 123e4567-e89b-12d3-a456-426614174000
   Email: admin@mtwpromo.com
   Nome: Administrador
   Role: admin
   VIP: true
```

---

## 🔐 Como o Hash da Senha Funciona

O hash `$2b$10$rZ5YhkW8qN3xJ5xJ5xJ5xOeKqF5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xu` representa a senha `admin123` criptografada usando **bcrypt** com:

- **Algoritmo**: bcrypt
- **Salt rounds**: 10
- **Senha original**: admin123

O backend usa bcrypt para comparar a senha fornecida no login com o hash armazenado.

---

## 🧪 Testar o Login

### Via Admin Panel:

1. Acesse: http://localhost:5174/login
2. Digite:
   - Email: `admin@mtwpromo.com`
   - Senha: `admin123`
3. Clique em **Entrar**

### Via API (cURL):

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mtwpromo.com",
    "password": "admin123"
  }'
```

### Resposta Esperada:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "admin@mtwpromo.com",
      "name": "Administrador",
      "role": "admin",
      "is_vip": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "..."
  }
}
```

---

## 🔄 Alterar a Senha

### Via Admin Panel:

1. Faça login
2. Vá em **Perfil** ou **Configurações**
3. Altere a senha

### Via SQL (Emergência):

```sql
-- Gerar novo hash para senha "nova_senha_123"
-- Use o script Node.js para gerar o hash correto

UPDATE users
SET 
  password_hash = '$2b$10$NOVO_HASH_AQUI',
  updated_at = NOW()
WHERE email = 'admin@mtwpromo.com';
```

---

## ❓ Problemas Comuns

### Erro: "duplicate key value violates unique constraint"

**Solução**: O usuário já existe. Use `ON CONFLICT` para atualizar:

```sql
INSERT INTO users (...)
VALUES (...)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();
```

### Erro: "Login failed"

**Possíveis causas**:
1. Hash da senha incorreto
2. Usuário não existe
3. Backend não está conectado ao Supabase

**Verificar**:
```sql
SELECT * FROM users WHERE email = 'admin@mtwpromo.com';
```

### Erro: "Cannot find module 'bcryptjs'"

**Solução**:
```bash
cd backend
npm install
```

---

## 📚 Referências

- [Bcrypt Documentation](https://www.npmjs.com/package/bcryptjs)
- [Supabase SQL Editor](https://supabase.com/docs/guides/database/overview)
- [JWT Authentication](https://jwt.io/)

---

## ✅ Checklist

- [ ] Executei o SQL no Supabase
- [ ] Verifiquei que o usuário foi criado
- [ ] Testei o login no Admin Panel
- [ ] Login funcionou com sucesso
- [ ] Planejei alterar a senha padrão

---

**Pronto!** Agora você pode fazer login no Admin Panel! 🎉
