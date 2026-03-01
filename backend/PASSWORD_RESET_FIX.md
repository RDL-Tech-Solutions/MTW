# Fix: Problema no Reset de Senha

## 🐛 Problema Identificado

Após redefinir a senha no app, o login falhava com "credenciais inválidas".

### Causa Raiz

A tabela `users` tem **DOIS campos de senha**:
- `password`
- `password_hash`

**O que estava acontecendo:**
1. Reset de senha salvava apenas em `password`
2. Login verificava `password_hash` primeiro
3. Se `password_hash` existia (usuário antigo), o login usava ele
4. Senha nova em `password` era ignorada
5. Login falhava ❌

## 🔍 Diagnóstico

### Estrutura da Tabela Users:
```
✓ password           | string | Hash da senha (novo)
✓ password_hash      | string | Hash da senha (legado)
```

### Código de Login (authController.js):
```javascript
// Login verifica password_hash PRIMEIRO
const passwordToCompare = user.password_hash || user.password;
const isValidPassword = await comparePassword(password, passwordToCompare);
```

### Código de Reset (ANTES):
```javascript
// Reset salvava apenas em password
await User.update(user.id, {
  password: hashedPassword,  // ✅ Salvo
  // password_hash não era atualizado ❌
});
```

## ✅ Solução Implementada

### 1. Atualizar Reset de Senha

Agora salva em **AMBOS** os campos:

```javascript
await User.update(user.id, {
  password: hashedPassword,
  password_hash: hashedPassword, // ✅ Agora salva em ambos
  verification_code: null,
  verification_code_expiry: null,
});
```

### 2. Atualizar Change Password

Também corrigido para consistência:

```javascript
await User.update(req.user.id, { 
  password: hashedPassword,
  password_hash: hashedPassword // ✅ Ambos os campos
});
```

### 3. Script de Teste

Criado `scripts/test-password-reset.js` para:
- Verificar qual campo tem a senha
- Testar se senha está correta
- Corrigir manualmente se necessário

## 🧪 Testando

### Via Script:
```bash
cd backend
node scripts/test-password-reset.js
```

### Via App:
1. Solicitar código de recuperação
2. Verificar código
3. Definir nova senha
4. Fazer login com nova senha ✅

## 📊 Resultado

### Antes:
```
Reset → Salva em password
Login → Verifica password_hash
Resultado: ❌ Credenciais inválidas
```

### Depois:
```
Reset → Salva em password E password_hash
Login → Verifica password_hash (encontra senha nova)
Resultado: ✅ Login bem-sucedido
```

## 🔧 Arquivos Modificados

1. `backend/src/controllers/authController.js`
   - `resetPassword()` - Salva em ambos os campos
   - `changePassword()` - Salva em ambos os campos

2. `backend/scripts/test-password-reset.js` (novo)
   - Script de diagnóstico e correção

3. `backend/scripts/check-user-schema.js` (novo)
   - Verificar estrutura da tabela

## 📝 Notas

### Por que dois campos?

Provavelmente migração de sistema antigo:
- `password_hash` - Campo legado
- `password` - Campo novo

### Solução Ideal (Futuro):

Migrar todos os usuários para usar apenas `password`:

```sql
-- Migração futura
UPDATE users 
SET password = password_hash 
WHERE password IS NULL AND password_hash IS NOT NULL;

-- Depois remover password_hash
ALTER TABLE users DROP COLUMN password_hash;
```

### Por enquanto:

Manter ambos os campos sincronizados garante compatibilidade.

## ✅ Status

- [x] Problema identificado
- [x] Causa raiz encontrada
- [x] Reset de senha corrigido
- [x] Change password corrigido
- [x] Scripts de teste criados
- [x] Senha do usuário corrigida manualmente
- [x] Documentação completa
- [ ] (Futuro) Migrar para campo único

## 🚀 Teste Agora

**Email:** janicelima850@gmail.com  
**Senha:** senha123

O login deve funcionar perfeitamente! ✅
