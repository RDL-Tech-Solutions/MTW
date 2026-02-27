# 📧 Configuração SMTP

Guia completo para configurar envio de emails no PreçoCerto.

## 📋 Visão Geral

O PreçoCerto usa SMTP para enviar emails de:
- Recuperação de senha
- Confirmação de alteração de senha
- Boas-vindas a novos usuários
- Notificações gerais

## 🚀 Configuração Rápida

### 1. Escolher Provedor SMTP

Recomendamos **Gmail** para desenvolvimento e **SendGrid** ou **AWS SES** para produção.

#### Gmail (Desenvolvimento)

1. Acesse [Google Account Security](https://myaccount.google.com/security)
2. Ative **2-Step Verification**
3. Vá em **App Passwords**
4. Crie uma senha de app para "Mail"
5. Copie a senha gerada (16 caracteres)

#### SendGrid (Produção)

1. Crie conta em [SendGrid](https://sendgrid.com)
2. Crie uma API Key
3. Configure domínio e DNS
4. Use SMTP relay do SendGrid

### 2. Configurar Variáveis de Ambiente

Edite `backend/.env`:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app-16-caracteres
SMTP_FROM=seu-email@gmail.com
SMTP_FROM_NAME=PreçoCerto
```

### 3. Testar Configuração

Execute o script de teste:

```bash
cd backend
npm run test:smtp
```

Saída esperada:

```
✅ Conexão SMTP verificada com sucesso!
✅ Email de teste enviado com sucesso!
📧 Verifique sua caixa de entrada: seu-email@gmail.com
```

## 📝 Configurações por Provedor

### Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
```

**Importante**: Use senha de app, não a senha da conta!

### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=sua-api-key-sendgrid
```

### AWS SES

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-smtp-username
SMTP_PASS=seu-smtp-password
```

### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@outlook.com
SMTP_PASS=sua-senha
```

## 🔧 Funcionalidades de Email

### 1. Recuperação de Senha

Enviado quando usuário solicita reset de senha:

```javascript
POST /api/auth/forgot-password
{
  "email": "usuario@example.com"
}
```

Email contém link com token válido por 1 hora.

### 2. Confirmação de Alteração de Senha

Enviado após senha ser alterada com sucesso:

```javascript
POST /api/auth/reset-password
{
  "token": "token-recebido-por-email",
  "newPassword": "nova-senha"
}
```

### 3. Email de Boas-vindas

Enviado automaticamente após registro:

```javascript
POST /api/auth/register
{
  "name": "Nome",
  "email": "email@example.com",
  "password": "senha"
}
```

### 4. Emails Genéricos

Para notificações personalizadas:

```javascript
await emailService.sendEmail(
  'destinatario@example.com',
  'Assunto',
  'Conteúdo HTML'
);
```

## 🧪 Script de Teste

O script `backend/scripts/test-smtp.js` realiza:

1. ✅ Verifica conexão SMTP
2. ✅ Testa envio de email
3. ✅ Valida configurações
4. ✅ Exibe erros detalhados

### Executar Teste

```bash
cd backend
npm run test:smtp
```

### Teste Manual

```bash
cd backend
node scripts/test-smtp.js
```

## 🔍 Troubleshooting

### Erro: "Invalid login"

**Causa**: Credenciais incorretas

**Solução**:
1. Verifique `SMTP_USER` e `SMTP_PASS`
2. Para Gmail, use senha de app (não senha da conta)
3. Verifique se 2FA está ativado (Gmail)

### Erro: "Connection timeout"

**Causa**: Porta bloqueada ou host incorreto

**Solução**:
1. Verifique `SMTP_HOST` e `SMTP_PORT`
2. Tente porta 465 com `SMTP_SECURE=true`
3. Verifique firewall/antivírus

### Erro: "Self-signed certificate"

**Causa**: Certificado SSL não confiável

**Solução**:
```env
SMTP_SECURE=false
SMTP_PORT=587
```

Use STARTTLS (porta 587) ao invés de SSL (porta 465).

### Email não chega

**Causa**: Email na pasta spam ou configuração incorreta

**Solução**:
1. Verifique pasta de spam
2. Verifique logs do backend: `backend/logs/app.log`
3. Execute teste SMTP: `npm run test:smtp`
4. Verifique se `SMTP_FROM` é válido

### Gmail bloqueia envio

**Causa**: Segurança do Gmail

**Solução**:
1. Use senha de app (não senha da conta)
2. Ative 2FA na conta Google
3. Permita "apps menos seguros" (não recomendado)
4. Use SendGrid ou AWS SES para produção

## 📊 Monitoramento

### Logs

Os emails são logados em `backend/logs/app.log`:

```
[INFO] Email sent successfully to: usuario@example.com
[ERROR] Failed to send email: Error message
```

### Estatísticas

Para produção, use provedores com dashboard:
- **SendGrid**: Dashboard com estatísticas de entrega
- **AWS SES**: CloudWatch metrics
- **Mailgun**: Analytics completo

## 🔒 Segurança

### Boas Práticas

1. ✅ Use variáveis de ambiente (nunca hardcode credenciais)
2. ✅ Use senha de app para Gmail
3. ✅ Use STARTTLS (porta 587) ao invés de SSL
4. ✅ Valide emails antes de enviar
5. ✅ Implemente rate limiting
6. ✅ Use provedores profissionais em produção

### Rate Limiting

Gmail tem limites:
- **500 emails/dia** (conta gratuita)
- **2000 emails/dia** (Google Workspace)

Para produção, use:
- **SendGrid**: 100 emails/dia grátis, depois pago
- **AWS SES**: 62.000 emails/mês grátis (primeiro ano)
- **Mailgun**: 5.000 emails/mês grátis

## 📚 Documentação Adicional

- [Nodemailer Documentation](https://nodemailer.com)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SendGrid SMTP](https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api)
- [AWS SES SMTP](https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html)

## ✅ Checklist de Configuração

- [ ] Provedor SMTP escolhido
- [ ] Credenciais obtidas (senha de app para Gmail)
- [ ] Variáveis de ambiente configuradas
- [ ] Backend reiniciado
- [ ] Teste SMTP executado com sucesso
- [ ] Email de teste recebido
- [ ] Logs verificados

---

**Próximo**: [Google OAuth Setup](./google-oauth-setup.md)
