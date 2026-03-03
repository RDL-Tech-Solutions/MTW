# 📧 OneSignal Email - Configuração

## ✅ Implementado

Sistema de envio de emails usando OneSignal Email API como alternativa ao SMTP.

## 📝 Arquivos Criados/Modificados

### 1. `backend/src/services/oneSignalEmailService.js` (NOVO)
Serviço de email usando OneSignal Email API.

**Funcionalidades**:
- Envio de emails via OneSignal API
- Template de recuperação de senha com código de 6 dígitos
- Template de confirmação de senha alterada
- Template de boas-vindas

### 2. `backend/src/services/emailServiceWrapper.js` (MODIFICADO)
Wrapper atualizado para suportar múltiplos provedores.

**Suporta**:
- SMTP (Nodemailer/Gmail) - padrão
- OneSignal Email API - novo

## 🔧 Configuração

### Opção 1: SMTP (Padrão - Atual)

```env
# .env
EMAIL_PROVIDER=smtp

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
SMTP_FROM_NAME=PreçoCerto
SMTP_FROM_EMAIL=noreply@precocerto.com
```

### Opção 2: OneSignal Email (Novo)

```env
# .env
EMAIL_PROVIDER=onesignal

# OneSignal Configuration
ONESIGNAL_APP_ID=seu-app-id
ONESIGNAL_API_KEY=sua-api-key
ONESIGNAL_EMAIL_FROM_NAME=PreçoCerto
ONESIGNAL_EMAIL_FROM_ADDRESS=noreply@precocerto.com
```

## 📚 Como Obter Credenciais OneSignal

### 1. Criar Conta OneSignal

1. Acesse [https://onesignal.com/](https://onesignal.com/)
2. Clique em "Sign Up" (ou "Get Started")
3. Crie sua conta gratuita

### 2. Criar App

1. No dashboard, clique em "New App/Website"
2. Dê um nome ao app (ex: "PreçoCerto")
3. Selecione a plataforma "Email"
4. Clique em "Create"

### 3. Obter App ID

1. No dashboard do app, vá em "Settings" → "Keys & IDs"
2. Copie o "App ID"
3. Cole no `.env` como `ONESIGNAL_APP_ID`

### 4. Obter API Key

1. Ainda em "Settings" → "Keys & IDs"
2. Copie a "REST API Key"
3. Cole no `.env` como `ONESIGNAL_API_KEY`

### 5. Configurar Email

1. Vá em "Settings" → "Email"
2. Configure o domínio de envio
3. Verifique o domínio (DNS records)
4. Configure o endereço de envio padrão

## 🎯 Uso

O sistema usa automaticamente o provedor configurado em `EMAIL_PROVIDER`.

### Código Permanece o Mesmo

```javascript
// No controller
const emailServiceWrapper = (await import('../services/emailServiceWrapper.js')).default;

// Enviar código de recuperação
await emailServiceWrapper.sendPasswordResetEmail(
  email, 
  verificationCode, 
  userName
);

// Enviar confirmação de senha alterada
await emailServiceWrapper.sendPasswordChangedEmail(
  email, 
  userName
);

// Enviar boas-vindas
await emailServiceWrapper.sendWelcomeEmail(
  email, 
  userName
);
```

## 📧 Templates de Email

### 1. Recuperação de Senha

**Assunto**: 🔐 Código de Recuperação de Senha - PreçoCerto

**Conteúdo**:
- Saudação personalizada
- Código de 6 dígitos em destaque
- Aviso de expiração (15 minutos)
- Instruções de uso
- Avisos de segurança
- Design responsivo

### 2. Senha Alterada

**Assunto**: ✅ Senha Alterada - PreçoCerto

**Conteúdo**:
- Confirmação da alteração
- Data e hora da mudança
- Alerta de segurança
- Recomendações de segurança
- Design responsivo

### 3. Boas-vindas

**Assunto**: 🎉 Bem-vindo ao PreçoCerto!

**Conteúdo**:
- Mensagem de boas-vindas
- Principais funcionalidades
- Call-to-action
- Design responsivo

## 🔄 Migração SMTP → OneSignal

### Passo 1: Configurar OneSignal

```bash
# Editar .env
nano backend/.env

# Adicionar:
EMAIL_PROVIDER=onesignal
ONESIGNAL_APP_ID=seu-app-id
ONESIGNAL_API_KEY=sua-api-key
ONESIGNAL_EMAIL_FROM_NAME=PreçoCerto
ONESIGNAL_EMAIL_FROM_ADDRESS=noreply@precocerto.com
```

### Passo 2: Reiniciar Backend

```bash
pm2 restart backend
```

### Passo 3: Verificar Logs

```bash
pm2 logs backend --lines 20
```

Deve mostrar:
```
📧 Email Service inicializado (modo ONESIGNAL)
✅ OneSignal Email Service inicializado
```

### Passo 4: Testar

```bash
# Testar recuperação de senha
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"seu-email@example.com"}'
```

## 📊 Comparação SMTP vs OneSignal

| Recurso | SMTP | OneSignal |
|---------|------|-----------|
| Configuração | Simples | Simples |
| Custo | Grátis (Gmail) | Grátis até 10k emails/mês |
| Limite de envio | ~500/dia (Gmail) | 10.000/mês (free) |
| Deliverability | Boa | Excelente |
| Analytics | Não | Sim |
| Templates | Manual | Manual |
| API | Nodemailer | REST API |
| Suporte | Comunidade | Oficial |

## 🧪 Testes

### Teste 1: Verificar Configuração

```javascript
// No backend
const emailServiceWrapper = require('./src/services/emailServiceWrapper.js').default;
console.log('Configurado:', emailServiceWrapper.isConfigured());
console.log('Provider:', emailServiceWrapper.provider);
```

### Teste 2: Enviar Email de Teste

```javascript
const result = await emailServiceWrapper.sendEmail({
  to: 'seu-email@example.com',
  subject: 'Teste OneSignal',
  html: '<h1>Teste de Email</h1><p>Se você recebeu isso, OneSignal está funcionando!</p>'
});

console.log('Resultado:', result);
```

### Teste 3: Recuperação de Senha

```bash
# Via API
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"seu-email@example.com"}'
```

## 🎯 Vantagens do OneSignal

1. **Deliverability Superior**
   - Infraestrutura otimizada para entrega
   - Reputação de IP gerenciada
   - Menos chance de cair em spam

2. **Analytics Integrado**
   - Taxa de abertura
   - Taxa de cliques
   - Bounces e unsubscribes
   - Dashboard visual

3. **Escalabilidade**
   - 10.000 emails/mês grátis
   - Planos pagos para mais volume
   - API robusta e confiável

4. **Facilidade**
   - Sem necessidade de servidor SMTP
   - Configuração via dashboard
   - Suporte oficial

5. **Recursos Extras**
   - Segmentação de usuários
   - A/B testing
   - Automações
   - Templates visuais

## ⚠️ Limitações

### OneSignal Free Tier

- 10.000 emails/mês
- Branding OneSignal (removível em planos pagos)
- Suporte por email apenas

### SMTP Gmail

- ~500 emails/dia
- Pode ser bloqueado por spam
- Requer senha de app
- Sem analytics

## 🔒 Segurança

### OneSignal

- API Key deve ser mantida em segredo
- Usar variáveis de ambiente
- Não commitar credenciais
- Rotacionar keys periodicamente

### SMTP

- Usar senha de app (não senha real)
- Ativar 2FA no Gmail
- Não compartilhar credenciais
- Monitorar atividade suspeita

## 📈 Monitoramento

### OneSignal Dashboard

1. Acesse [https://app.onesignal.com/](https://app.onesignal.com/)
2. Selecione seu app
3. Vá em "Messages" → "Email"
4. Veja estatísticas:
   - Emails enviados
   - Taxa de abertura
   - Taxa de cliques
   - Bounces

### Logs do Backend

```bash
# Ver logs de email
pm2 logs backend | grep "📧"

# Exemplos:
# ✅ Email OneSignal enviado para user@example.com: abc123
# ❌ Erro ao enviar email OneSignal: Invalid API key
```

## 🚀 Recomendação

**Para Produção**: Use OneSignal
- Melhor deliverability
- Analytics integrado
- Maior limite de envio
- Suporte oficial

**Para Desenvolvimento**: Use SMTP
- Configuração mais rápida
- Sem necessidade de conta externa
- Bom para testes locais

## 📝 Notas Importantes

1. **Domínio Verificado**: OneSignal requer verificação de domínio para melhor deliverability
2. **Warm-up**: Comece com volume baixo e aumente gradualmente
3. **Compliance**: Respeite leis de email marketing (CAN-SPAM, GDPR)
4. **Unsubscribe**: Sempre inclua opção de descadastro
5. **Testing**: Teste em múltiplos clientes de email

## 🆘 Troubleshooting

### Erro: "OneSignal não configurado"

**Causa**: Variáveis de ambiente não definidas  
**Solução**: Verificar `.env` e reiniciar backend

### Erro: "Invalid API key"

**Causa**: API Key incorreta  
**Solução**: Verificar key no dashboard OneSignal

### Emails não chegam

**Causa**: Domínio não verificado ou em spam  
**Solução**: 
1. Verificar domínio no OneSignal
2. Verificar pasta de spam
3. Adicionar SPF/DKIM records

### Rate limit exceeded

**Causa**: Limite de 10k emails/mês atingido  
**Solução**: Upgrade para plano pago ou aguardar próximo mês

---

**Status**: ✅ Implementado e testado  
**Pronto para**: Configuração e uso em produção
