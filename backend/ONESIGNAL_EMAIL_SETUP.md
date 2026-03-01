# OneSignal Email - Configuração

## ⚠️ Status Atual

O OneSignal Email está **DESABILITADO** para este app porque o serviço de email não foi ativado no OneSignal.

### Erro Recebido:
```
Email sending for this app has been disabled. 
To enable sending, contact our Support team.
```

## 🔧 Configuração Atual

### Sistema de Email Ativo: SMTP (Gmail)
```env
# OneSignal Email (DESABILITADO)
ONESIGNAL_EMAIL_ENABLED=false

# SMTP (ATIVO)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=rdl.tech.solutions.2025@gmail.com
SMTP_PASS=hhifplpoypetzzke
SMTP_FROM_NAME=PromoBot
SMTP_FROM_EMAIL=rdl.tech.solutions.2025@gmail.com

# Fallback habilitado
SMTP_FALLBACK_ENABLED=true
```

## ✅ Solução Implementada

O sistema agora usa **SMTP (Gmail)** como método principal de envio de emails:

1. ✅ SMTP configurado e funcionando
2. ✅ OneSignal Email desabilitado
3. ✅ Emails sendo enviados via Gmail
4. ✅ Sem erros de envio

## 📧 Tipos de Email Funcionando

Todos os emails estão sendo enviados via SMTP:

1. ✅ **Recuperação de Senha** - Código de 6 dígitos
2. ✅ **Confirmação de Senha Alterada**
3. ✅ **Boas-vindas** - Novos usuários
4. ✅ **Emails Genéricos**

## 🔄 Como Habilitar OneSignal Email (Opcional)

Se você quiser usar OneSignal Email no futuro, siga estes passos:

### 1. Contatar Suporte OneSignal

Acesse: https://onesignal.com/support

Solicite ativação do serviço de Email para seu app:
- **App ID**: `40967aa6-5a0e-4ac3-813e-f22c589b89ce`
- **App Name**: PreçoCerto

### 2. Verificar Domínio

Após ativação, você precisará verificar seu domínio:

1. Acesse OneSignal Dashboard → Email Settings
2. Adicione seu domínio (ex: `precocerto.app`)
3. Configure registros DNS:
   - SPF
   - DKIM
   - DMARC

### 3. Configurar Sender

Configure o remetente verificado:
```env
ONESIGNAL_FROM_EMAIL=noreply@precocerto.app
ONESIGNAL_FROM_NAME=PreçoCerto
```

### 4. Habilitar no .env

```env
ONESIGNAL_EMAIL_ENABLED=true
```

### 5. Reiniciar Servidor

```bash
# Reiniciar backend
pm2 restart backend
# ou
npm run dev
```

## 📊 Comparação: SMTP vs OneSignal Email

| Recurso | SMTP (Gmail) | OneSignal Email |
|---------|--------------|-----------------|
| **Configuração** | ✅ Simples | ⚠️ Requer verificação |
| **Custo** | ✅ Grátis (limite diário) | ✅ Grátis (plano free) |
| **Limite Diário** | 500 emails/dia | 10,000 emails/mês |
| **Velocidade** | ⚡ Rápido | ⚡⚡ Muito rápido |
| **Rastreamento** | ❌ Não | ✅ Sim (aberturas, cliques) |
| **Templates** | ❌ HTML manual | ✅ Editor visual |
| **Segmentação** | ❌ Não | ✅ Sim |
| **A/B Testing** | ❌ Não | ✅ Sim (plano pago) |
| **Analytics** | ❌ Não | ✅ Sim |

## 🎯 Recomendação

### Para Desenvolvimento/Testes:
✅ **Use SMTP (Gmail)** - Configuração atual
- Simples e funcional
- Sem necessidade de verificação de domínio
- Ideal para testes

### Para Produção (Escala):
⚠️ **Considere OneSignal Email**
- Maior limite de envios
- Analytics e rastreamento
- Melhor deliverability
- Segmentação de usuários

## 🔐 Segurança SMTP

### Senha de Aplicativo Gmail

A senha configurada é uma **senha de aplicativo**, não a senha da conta:

1. Mais segura que senha normal
2. Pode ser revogada sem afetar a conta
3. Específica para este app

### Como Gerar Nova Senha de Aplicativo:

1. Acesse: https://myaccount.google.com/apppasswords
2. Selecione "Email" e "Outro (nome personalizado)"
3. Digite "PreçoCerto Backend"
4. Copie a senha gerada
5. Atualize `SMTP_PASS` no `.env`

## 📝 Logs de Email

### Sucesso:
```
info: ✅ Serviço de email SMTP inicializado
info: 📧 Email Service Wrapper inicializado
info:    OneSignal Email: DESATIVADO
info:    SMTP Fallback: ATIVADO
info: ✅ Email enviado para usuario@email.com: <message-id>
```

### Erro (se SMTP falhar):
```
error: ❌ Erro ao enviar email para usuario@email.com: <erro>
```

## 🧪 Testar Envio de Email

### Via Script:
```bash
cd backend
node scripts/test-smtp.js
```

### Via API:
```bash
# Solicitar código de recuperação
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"seu-email@gmail.com"}'
```

## 📊 Status Atual

- [x] SMTP configurado e funcionando
- [x] OneSignal Email desabilitado
- [x] Fallback configurado
- [x] Emails sendo enviados com sucesso
- [ ] OneSignal Email ativado (opcional)
- [ ] Domínio verificado (opcional)

## 🚀 Conclusão

O sistema está **100% funcional** usando SMTP (Gmail). 

OneSignal Email é **opcional** e pode ser ativado no futuro se você precisar de:
- Maior volume de emails
- Analytics e rastreamento
- Segmentação avançada

Por enquanto, SMTP é suficiente e está funcionando perfeitamente! ✅
