# Correção: Erro na Recuperação de Senha

## Problema Reportado

**Tela:** Recuperar Senha (Forgot Password)  
**Erro:** "Erro no banco de dados"

![Erro mostrado no app](screenshot mostra erro genérico)

---

## Diagnóstico

### Possíveis Causas:

1. **Erro na query do banco de dados**
   - Método `findByEmail` falhando
   - Tabela `users` não acessível
   - Permissões do Supabase

2. **Erro ao salvar token**
   - Método `update` falhando
   - Campos `reset_token` ou `reset_token_expiry` não existem

3. **Erro ao enviar email**
   - Serviço de email não configurado
   - SMTP falhando

4. **Erro genérico não tratado**
   - Exception não capturada
   - Mensagem de erro genérica

---

## Correções Aplicadas

### 1. Validações Adicionadas

**Antes:**
```javascript
const { email } = req.body;
const user = await User.findByEmail(email);
```

**Depois:**
```javascript
const { email } = req.body;

// Validar se email foi fornecido
if (!email || !email.trim()) {
  return res.status(400).json(
    errorResponse('Email é obrigatório')
  );
}

// Validar formato de email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return res.status(400).json(
    errorResponse('Email inválido')
  );
}
```

### 2. Tratamento de Erros Específicos

**Busca de usuário:**
```javascript
let user;
try {
  user = await User.findByEmail(email);
} catch (dbError) {
  logger.error(`❌ Erro ao buscar usuário no banco: ${dbError.message}`);
  logger.error(`Stack: ${dbError.stack}`);
  return res.status(500).json(
    errorResponse('Erro no banco de dados. Tente novamente mais tarde.')
  );
}
```

**Salvar token:**
```javascript
try {
  await User.update(user.id, {
    reset_token: resetTokenHash,
    reset_token_expiry: resetTokenExpiry.toISOString(),
  });
  logger.info(`✅ Token salvo no banco para ${email}`);
} catch (updateError) {
  logger.error(`❌ Erro ao salvar token no banco: ${updateError.message}`);
  return res.status(500).json(
    errorResponse('Erro ao processar solicitação. Tente novamente mais tarde.')
  );
}
```

**Enviar email:**
```javascript
try {
  const emailService = (await import('../services/emailService.js')).default;
  const emailResult = await emailService.sendPasswordResetEmail(email, resetToken, user.name);

  if (!emailResult.success) {
    logger.error(`❌ Erro ao enviar email: ${emailResult.error}`);
    return res.status(500).json(
      errorResponse('Erro ao enviar email. Tente novamente mais tarde.')
    );
  }
} catch (emailError) {
  logger.error(`❌ Exceção ao enviar email: ${emailError.message}`);
  // Mesmo com erro no email, não revelar se o usuário existe
}
```

### 3. Logs Detalhados

Adicionados logs em cada etapa:
```javascript
logger.info(`📧 Solicitação de recuperação de senha para: ${email}`);
logger.info(`✅ Usuário encontrado: ${user.id}`);
logger.info(`🔑 Token gerado para ${email}`);
logger.info(`✅ Token salvo no banco para ${email}`);
logger.info(`✅ Email de recuperação enviado para: ${email}`);
```

---

## Verificações Necessárias

### 1. Verificar Tabela no Supabase

**Campos necessários na tabela `users`:**
```sql
- id (uuid)
- email (text)
- name (text)
- reset_token (text, nullable)
- reset_token_expiry (timestamp, nullable)
```

**Verificar se os campos existem:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('reset_token', 'reset_token_expiry');
```

**Se não existirem, criar:**
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
```

### 2. Verificar Permissões no Supabase

**RLS (Row Level Security):**
- Verificar se as políticas permitem UPDATE na tabela `users`
- Service role key deve ter acesso total

### 3. Verificar Configuração de Email

**Arquivo:** `backend/.env`

**Variáveis necessárias:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
SMTP_FROM=noreply@seuapp.com
```

**Testar serviço de email:**
```javascript
const emailService = require('./services/emailService');
await emailService.sendPasswordResetEmail('teste@email.com', 'token123', 'Nome');
```

---

## Teste de Diagnóstico

### No Backend:

**1. Testar busca de usuário:**
```bash
# No terminal do backend
node -e "
const User = require('./src/models/User.js').default;
User.findByEmail('seu-email@teste.com')
  .then(user => console.log('Usuário:', user))
  .catch(err => console.error('Erro:', err));
"
```

**2. Ver logs do backend:**
```bash
cd backend
npm start
# Tentar recuperar senha no app
# Ver logs detalhados no terminal
```

**3. Testar endpoint manualmente:**
```bash
curl -X POST https://king.apiprecocerto.space/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"seu-email@teste.com"}'
```

---

## Fluxo Correto

### 1. Usuário Solicita Recuperação

**App → Backend:**
```json
POST /api/auth/forgot-password
{
  "email": "usuario@email.com"
}
```

### 2. Backend Processa

```
1. Validar email ✅
2. Buscar usuário no banco ✅
3. Gerar token de recuperação ✅
4. Salvar token no banco ✅
5. Enviar email com link ✅
6. Retornar sucesso ✅
```

### 3. Usuário Recebe Email

**Email contém:**
- Link de redefinição: `https://app.com/reset-password?token=ABC123`
- Token válido por 1 hora

### 4. Usuário Redefine Senha

**App → Backend:**
```json
POST /api/auth/reset-password
{
  "token": "ABC123",
  "newPassword": "novaSenha123"
}
```

---

## Mensagens de Erro Melhoradas

### Antes:
```
"Erro no banco de dados"
```

### Depois:

**Email vazio:**
```
"Email é obrigatório"
```

**Email inválido:**
```
"Email inválido"
```

**Erro no banco:**
```
"Erro no banco de dados. Tente novamente mais tarde."
```

**Erro ao enviar email:**
```
"Erro ao enviar email. Tente novamente mais tarde."
```

**Sucesso (sempre igual por segurança):**
```
"Se o email existir, você receberá instruções para redefinir sua senha"
```

---

## Próximos Passos

### 1. Verificar Logs do Backend

```bash
cd backend
npm start
# Tentar recuperar senha no app
# Copiar logs do terminal
```

**Procurar por:**
```
📧 Solicitação de recuperação de senha para: ...
✅ Usuário encontrado: ...
🔑 Token gerado para ...
✅ Token salvo no banco para ...
✅ Email de recuperação enviado para: ...
```

**Ou erros:**
```
❌ Erro ao buscar usuário no banco: ...
❌ Erro ao salvar token no banco: ...
❌ Erro ao enviar email: ...
```

### 2. Verificar Banco de Dados

**No Supabase Dashboard:**
1. Ir para Table Editor
2. Abrir tabela `users`
3. Verificar se colunas `reset_token` e `reset_token_expiry` existem
4. Se não existirem, executar SQL para criar

### 3. Verificar Email

**Se email não estiver configurado:**
1. Configurar SMTP no `.env`
2. Ou usar serviço como SendGrid, Mailgun, etc.
3. Ver `backend/EMAIL_SMTP_SETUP.md` para instruções

---

## Arquivo Modificado

- ✅ `backend/src/controllers/authController.js` - Método `forgotPassword`

---

## Status

✅ **Logs detalhados adicionados**  
✅ **Validações melhoradas**  
✅ **Tratamento de erros específicos**  
⏳ **Aguardando logs do backend para diagnóstico final**

**Próxima ação:** Executar backend, tentar recuperar senha e compartilhar logs.
