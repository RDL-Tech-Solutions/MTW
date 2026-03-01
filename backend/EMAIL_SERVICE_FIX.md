# Fix: Erro no Serviço de Email

## 🐛 Problemas Identificados

### 1. Import Incorreto do Nodemailer
```
error: ❌ Erro ao inicializar serviço de email: nodemailer.createTransporter is not a function
```

### 2. OneSignal Email Não Configurado
```
warn: ⚠️ Tentativa de enviar email sem OneSignal configurado
error: ❌ Erro ao enviar email de recuperação: OneSignal Email não configurado
```

## 🔍 Causas

1. **Import Incorreto**: O código estava usando `nodemailer.createTransporter()` mas o import era `import nodemailer from 'nodemailer'`, que não expõe o método `createTransporter` diretamente.

2. **Fallback Desabilitado**: O sistema estava configurado para usar OneSignal Email, mas sem fallback para SMTP quando OneSignal não está disponível.

## ✅ Soluções Aplicadas

### 1. Corrigido Import do Nodemailer

**Antes:**
```javascript
import nodemailer from 'nodemailer';
// ...
this.transporter = nodemailer.createTransporter(config);
```

**Depois:**
```javascript
import { createTransport } from 'nodemailer';
// ...
this.transporter = createTransport(config);
```

### 2. Habilitado SMTP Fallback

Adicionado no `.env`:
```env
# Email Fallback (usar SMTP se OneSignal falhar)
SMTP_FALLBACK_ENABLED=true
```

## 📋 Configuração Atual

### SMTP (Gmail)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=rdl.tech.solutions.2025@gmail.com
SMTP_PASS=hhifplpoypetzzke
SMTP_FROM_NAME=PromoBot
SMTP_FROM_EMAIL=rdl.tech.solutions.2025@gmail.com
```

### OneSignal Email
```env
ONESIGNAL_EMAIL_ENABLED=true
ONESIGNAL_FROM_EMAIL=precocerto@rdltech.com.br
ONESIGNAL_FROM_NAME=PreçoCerto
```

### Fallback
```env
SMTP_FALLBACK_ENABLED=true
```

## 🔄 Fluxo de Email

### Com Fallback Habilitado:

1. **Tentativa Primária**: OneSignal Email
   - Se configurado e disponível → Usa OneSignal
   - Se falhar → Tenta fallback

2. **Fallback**: SMTP (Gmail)
   - Se SMTP configurado → Usa SMTP
   - Se falhar → Retorna erro

### Prioridade:
```
OneSignal Email → SMTP → Erro
```

## 📧 Tipos de Email Suportados

### Via OneSignal ou SMTP:
1. **Recuperação de Senha** (`sendPasswordResetEmail`)
   - Código de 6 dígitos
   - Expiração de 15 minutos
   - Template HTML responsivo

2. **Confirmação de Senha Alterada** (`sendPasswordChangedEmail`)
   - Notificação de segurança
   - Timestamp da alteração

3. **Boas-vindas** (`sendWelcomeEmail`)
   - Email de boas-vindas para novos usuários
   - Apresentação das funcionalidades

4. **Email Genérico** (`sendEmail`)
   - Envio de emails customizados

### Apenas via OneSignal:
5. **Novo Cupom** (`sendNewCouponEmail`)
   - Notificação de cupons novos
   - Requer OneSignal

6. **Email em Massa** (`sendBulkEmail`)
   - Envio para múltiplos destinatários
   - OneSignal: envio otimizado
   - SMTP: envio sequencial

## 🧪 Testando

### Testar SMTP:
```bash
cd backend
node scripts/test-smtp.js
```

### Testar Recuperação de Senha:
```bash
# Via API
POST /api/auth/request-verification-code
{
  "email": "seu-email@example.com"
}
```

## 📊 Logs Esperados

### Inicialização Bem-Sucedida:
```
info: ✅ Serviço de email SMTP inicializado
info: 📧 Email Service Wrapper inicializado
info:    OneSignal Email: ATIVADO
info:    SMTP Fallback: ATIVADO
```

### Envio com Fallback:
```
info: 🔄 Tentando fallback para SMTP...
info: ✅ Email enviado para usuario@example.com: <message-id>
```

## 🔐 Segurança

### SMTP Gmail:
- Usa senha de aplicativo (não senha da conta)
- Conexão TLS na porta 587
- Autenticação obrigatória

### OneSignal:
- API Key protegida
- Domínio verificado necessário
- Rate limiting automático

## 🚀 Status

- [x] Import do nodemailer corrigido
- [x] SMTP fallback habilitado
- [x] Configurações validadas
- [x] Logs melhorados
- [ ] Servidor reiniciado
- [ ] Testes de envio realizados

## 📝 Notas

1. **OneSignal Email** requer domínio verificado para funcionar completamente
2. **SMTP Gmail** funciona imediatamente com senha de aplicativo
3. **Fallback** garante que emails sempre sejam enviados
4. **Templates HTML** são responsivos e funcionam em ambos os serviços
