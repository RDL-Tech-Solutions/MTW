# 📧 Sistema de Email SMTP e Recuperação de Senha

## ✅ Implementação Completa

O sistema de email SMTP e recuperação de senha foi totalmente implementado no backend.

## 🔧 Configuração SMTP

### 1. Variáveis de Ambiente (.env)

Adicione as seguintes variáveis no arquivo `.env`:

```env
# SMTP Configuration (Email Service)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=PreçoCerto
SMTP_FROM_EMAIL=noreply@precocerto.app

# App URL (for password reset links)
APP_URL=http://localhost:3000
```

### 2. Configurar Gmail (Recomendado)

Para usar o Gmail como servidor SMTP:

1. Acesse sua conta Google
2. Vá em **Segurança** → **Verificação em duas etapas** (ative se não estiver)
3. Vá em **Senhas de app**
4. Crie uma nova senha de app para "Email"
5. Use essa senha no `SMTP_PASS`

**Configuração Gmail:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app-16-digitos
```

### 3. Outros Provedores SMTP

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=sua-api-key-do-sendgrid
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@seu-dominio.mailgun.org
SMTP_PASS=sua-senha-mailgun
```

#### Amazon SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=seu-smtp-username
SMTP_PASS=seu-smtp-password
```

## 📋 Funcionalidades Implementadas

### Backend

#### 1. Serviço de Email (`emailService.js`)
- ✅ Envio de emails genéricos
- ✅ Email de recuperação de senha
- ✅ Email de confirmação de senha alterada
- ✅ Email de boas-vindas
- ✅ Templates HTML responsivos
- ✅ Fallback para texto puro
- ✅ Tratamento de erros

#### 2. Rotas de Autenticação (`authRoutes.js`)
- ✅ `POST /api/auth/forgot-password` - Solicitar recuperação
- ✅ `POST /api/auth/reset-password` - Redefinir senha com token

#### 3. Controller (`authController.js`)
- ✅ `forgotPassword()` - Gera token e envia email
- ✅ `resetPassword()` - Valida token e atualiza senha

### Mobile App

#### 1. Tela de Recuperação (`ForgotPasswordScreen.js`)
- ✅ Formulário de email
- ✅ Validação de email
- ✅ Integração com API
- ✅ Feedback visual de sucesso
- ✅ Tratamento de erros

## 🔐 Fluxo de Recuperação de Senha

### 1. Usuário Solicita Recuperação

```
App Mobile → POST /api/auth/forgot-password
Body: { "email": "usuario@email.com" }
```

### 2. Backend Processa

1. Busca usuário no banco
2. Gera token aleatório (32 bytes)
3. Cria hash SHA256 do token
4. Salva hash e data de expiração (1 hora) no banco
5. Envia email com link de recuperação

### 3. Email Enviado

O usuário recebe um email com:
- Link para redefinir senha: `APP_URL/reset-password?token=TOKEN`
- Instruções claras
- Aviso de expiração (1 hora)
- Design responsivo e profissional

### 4. Usuário Redefine Senha

```
App Mobile → POST /api/auth/reset-password
Body: {
  "token": "token-recebido-por-email",
  "newPassword": "nova-senha-123"
}
```

### 5. Backend Valida e Atualiza

1. Cria hash do token recebido
2. Busca usuário com token válido e não expirado
3. Atualiza senha (com hash bcrypt)
4. Remove token do banco
5. Envia email de confirmação

## 📧 Templates de Email

### 1. Recuperação de Senha
- Design moderno com gradiente vermelho
- Botão destacado para redefinir
- Link alternativo para copiar/colar
- Avisos de segurança
- Informação de expiração

### 2. Senha Alterada
- Design verde de sucesso
- Confirmação da alteração
- Data/hora da mudança
- Alerta de segurança
- Dicas de segurança

### 3. Boas-Vindas
- Design vermelho do PreçoCerto
- Lista de funcionalidades
- Cards com ícones
- Call-to-action

## 🔒 Segurança

### Tokens
- ✅ Gerados com `crypto.randomBytes(32)` (256 bits)
- ✅ Armazenados como hash SHA256
- ✅ Expiração de 1 hora
- ✅ Uso único (removido após uso)

### Senhas
- ✅ Hash bcrypt com salt
- ✅ Nunca armazenadas em texto puro
- ✅ Validação de força no frontend

### Rate Limiting
- ✅ Aplicado nas rotas de recuperação
- ✅ Previne ataques de força bruta
- ✅ Configurável via middleware

## 🧪 Testando o Sistema

### 1. Testar Envio de Email

```bash
# No backend
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"seu-email@gmail.com"}'
```

### 2. Verificar Logs

```bash
# Logs do backend mostrarão:
✅ Serviço de email inicializado
✅ Email de recuperação enviado para: usuario@email.com
```

### 3. Testar Redefinição

```bash
# Após receber o email, use o token:
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token":"token-do-email",
    "newPassword":"nova-senha-123"
  }'
```

## 📊 Banco de Dados

### Campos Adicionados na Tabela `users`

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
```

Esses campos armazenam:
- `reset_token`: Hash SHA256 do token de recuperação
- `reset_token_expiry`: Data/hora de expiração do token

## 🚀 Próximos Passos

### Para Produção

1. **Configurar Domínio de Email**
   - Use um domínio próprio (ex: noreply@precocerto.app)
   - Configure SPF, DKIM e DMARC
   - Melhora deliverability

2. **Usar Serviço Profissional**
   - SendGrid (100 emails/dia grátis)
   - Mailgun (5.000 emails/mês grátis)
   - Amazon SES (62.000 emails/mês grátis)

3. **Monitoramento**
   - Logs de emails enviados
   - Taxa de entrega
   - Bounces e reclamações

4. **Melhorias**
   - Fila de emails (Bull/Redis)
   - Retry automático
   - Templates personalizáveis
   - Múltiplos idiomas

## 📝 Dependências

Certifique-se de instalar o nodemailer:

```bash
cd backend
npm install nodemailer
```

## ✅ Checklist de Implementação

- [x] Serviço de email criado
- [x] Templates HTML responsivos
- [x] Rotas de recuperação de senha
- [x] Controller com lógica de tokens
- [x] Validação e segurança
- [x] Tela mobile de recuperação
- [x] Integração app ↔ backend
- [x] Documentação completa
- [ ] Configurar SMTP em produção
- [ ] Testar em ambiente real
- [ ] Configurar domínio de email

## 🆘 Troubleshooting

### Email não está sendo enviado

1. Verifique as credenciais SMTP no `.env`
2. Confira os logs do backend
3. Teste com Gmail primeiro (mais fácil)
4. Verifique se a porta 587 está aberta
5. Desative antivírus/firewall temporariamente

### Token inválido ou expirado

1. Tokens expiram em 1 hora
2. Tokens são de uso único
3. Verifique se o relógio do servidor está correto
4. Confira se o token foi copiado corretamente

### Email vai para spam

1. Configure SPF/DKIM/DMARC
2. Use domínio próprio
3. Evite palavras spam no assunto
4. Use serviço profissional (SendGrid, etc)

## 📚 Recursos

- [Nodemailer Docs](https://nodemailer.com/)
- [Gmail SMTP](https://support.google.com/mail/answer/7126229)
- [SendGrid](https://sendgrid.com/)
- [Mailgun](https://www.mailgun.com/)
- [Amazon SES](https://aws.amazon.com/ses/)
