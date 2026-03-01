# Fix: Erro de Coluna verification_code

## 🐛 Problema Identificado

```
error: ❌ Erro ao salvar código no banco: Could not find the 'verification_code' column of 'users' in the schema cache
```

## 🔍 Causa

O sistema de recuperação de senha estava tentando usar as colunas `verification_code` e `verification_code_expiry` na tabela `users`, mas essas colunas não existiam no schema do Supabase.

## ✅ Solução Aplicada

### 1. Migration Executada

Aplicada a migration `add_verification_code_columns.sql` que adiciona:

```sql
-- Coluna para código de verificação de 6 dígitos
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);

-- Coluna para expiração do código (15 minutos)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_code_expiry TIMESTAMP;

-- Índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_users_verification_code 
ON users(verification_code);
```

### 2. Resultado

```
✅ Migração aplicada com sucesso!

Colunas adicionadas:
  - verification_code (VARCHAR(6))
  - verification_code_expiry (TIMESTAMP)

Índice criado:
  - idx_users_verification_code
```

## 📝 Funcionalidade

Essas colunas são usadas no sistema de recuperação de senha:

1. **Solicitar Código** (`POST /auth/request-verification-code`):
   - Gera código de 6 dígitos
   - Salva em `verification_code`
   - Define expiração em `verification_code_expiry` (15 minutos)
   - Envia código por email

2. **Verificar Código** (`POST /auth/verify-code`):
   - Valida código contra `verification_code`
   - Verifica se não expirou (`verification_code_expiry`)

3. **Resetar Senha** (`POST /auth/reset-password`):
   - Valida código novamente
   - Atualiza senha
   - Limpa `verification_code` e `verification_code_expiry`

## 🔧 Arquivos Afetados

- `backend/src/controllers/authController.js` - Usa as colunas
- `backend/src/services/oneSignalEmailService.js` - Envia email com código
- `backend/database/migrations/add_verification_code_columns.sql` - Migration SQL
- `backend/scripts/apply-verification-code-migration.js` - Script de aplicação

## 🚀 Próximos Passos

1. Reiniciar o servidor backend
2. Testar fluxo de recuperação de senha:
   - Solicitar código
   - Verificar código
   - Resetar senha

## 📊 Status

- [x] Migration criada
- [x] Migration aplicada no Supabase
- [x] Colunas adicionadas à tabela users
- [x] Índice criado para performance
- [ ] Servidor reiniciado
- [ ] Testes de recuperação de senha

## 🔐 Segurança

- Código de 6 dígitos numéricos
- Expiração de 15 minutos
- Código é limpo após uso
- Validação de expiração antes de aceitar
