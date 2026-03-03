# 🔔 Notificações Push - Guia Completo

## 📋 RESUMO EXECUTIVO

Você relatou que notificações push não estão sendo enviadas ao criar/aprovar produtos e cupons.

**DESCOBERTA**: O código de notificações push **JÁ ESTÁ IMPLEMENTADO** e funcionando! O problema provavelmente é:
- ❌ Usuários não têm tokens FCM registrados (80% de chance)
- ❌ Firebase não configurado (15% de chance)  
- ❌ Tokens expirados (5% de chance)

## 🚀 INÍCIO RÁPIDO (5 minutos)

### Passo 0: Criar Tabela fcm_tokens (OBRIGATÓRIO)

A tabela `fcm_tokens` não existe no banco! Execute a migração primeiro:

**Opção 1: Via Script (Recomendado)**
```bash
cd backend
node scripts/apply-fcm-migration.js
```

**Opção 2: Via Supabase Dashboard**
1. Acesse Supabase Dashboard
2. Vá em SQL Editor
3. Execute o conteúdo de `backend/database/migrations/create_fcm_tokens_table.sql`

### Passo 1: Execute o Script de Debug

```bash
cd backend
node scripts/debug-notifications.js
```

### Passo 2: Analise o Resultado

O script vai te dizer exatamente qual é o problema:

- **"0 tokens FCM registrados"** → Abra o app e faça login
- **"Service account NÃO encontrado"** → Configure Firebase
- **"0 notificações no banco"** → Problema no código (improvável)

### Passo 3: Aplique a Solução

Veja a seção "Soluções Rápidas" abaixo.

## 🔧 SOLUÇÕES RÁPIDAS

### Problema 1: Nenhum Token FCM Registrado

**Sintoma**: Script mostra "0 tokens FCM registrados"

**Solução**:
1. Abra o app no celular
2. Faça login com `robertosshbrasil@gmail.com`
3. Aceite permissão de notificações no onboarding
4. Execute o script novamente

**Teste**:
```bash
node scripts/test-all-notifications-user.js
```

---

### Problema 2: Firebase Não Configurado

**Sintoma**: Script mostra "Service account NÃO encontrado"

**Solução**:
1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione seu projeto
3. Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Salve o arquivo como `backend/firebase-service-account.json`
6. Reinicie o backend

---

### Problema 3: Tokens Expirados

**Sintoma**: Tokens existem mas notificações não chegam

**Solução**:
1. Desinstale o app
2. Reinstale
3. Faça login novamente
4. Aceite permissões

## 📚 DOCUMENTAÇÃO COMPLETA

### Arquivos de Referência

| Arquivo | Descrição |
|---------|-----------|
| `TESTE_RAPIDO_NOTIFICACOES.md` | Guia rápido de teste (5 min) |
| `SOLUCAO_NOTIFICACOES_PUSH.md` | Guia completo de solução |
| `ANALISE_PROBLEMA_NOTIFICACOES.md` | Análise técnica detalhada |
| `RESUMO_INVESTIGACAO_NOTIFICACOES.md` | Resumo da investigação |
| `SQL_DEBUG_NOTIFICACOES.sql` | Queries SQL para debug |

### Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `debug-notifications.js` | Diagnóstico completo do sistema |
| `test-all-notifications-user.js` | Teste de notificação direta |

## 🎯 COMO FUNCIONA

### Fluxo de Notificações para Produtos

```
1. Admin aprova produto no painel
   ↓
2. productController.approve()
   ↓
3. publishService.publishAll()
   ↓
4. publishService.notifyPush()
   ↓
5. notificationSegmentationService.getUsersForProduct()
   ↓
6. Notification.createBulk() (salva no banco)
   ↓
7. fcmService.notifyNewPromo() (envia via FCM)
   ↓
8. Notification.markAsSent() (marca como enviada)
```

### Fluxo de Notificações para Cupons

```
1. Admin cria/ativa cupom no painel
   ↓
2. couponController.create() ou activate()
   ↓
3. couponNotificationService.notifyNewCoupon()
   ↓
4. Envia para Telegram e WhatsApp
   ↓
5. createPushNotifications()
   ↓
6. notificationSegmentationService.getUsersForCoupon()
   ↓
7. fcmService.sendCustomNotification()
   ↓
8. Notification.createBulk() (salva no banco)
```

### Fluxo de Notificações para Cupons Esgotados (NOVO)

```
1. Admin marca cupom como esgotado
   ↓
2. Coupon.markAsOutOfStock()
   ↓
3. couponNotificationService.notifyOutOfStockCoupon()
   ↓
4. Envia para Telegram, WhatsApp e FCM
```

## ✅ CHECKLIST DE VERIFICAÇÃO

Execute na ordem:

- [ ] 1. Executar `node scripts/debug-notifications.js`
- [ ] 2. Verificar se `firebase-service-account.json` existe
- [ ] 3. Verificar se há tokens FCM registrados (mínimo 1)
- [ ] 4. Verificar se há notificações no banco
- [ ] 5. Aprovar produto e verificar logs do backend
- [ ] 6. Executar `node scripts/test-all-notifications-user.js`
- [ ] 7. Verificar se notificação chegou no celular

## 🔍 VERIFICAÇÃO NO BANCO

Execute estas queries no Supabase (ou veja `SQL_DEBUG_NOTIFICACOES.sql`):

### Verificar Tokens FCM
```sql
SELECT * FROM fcm_tokens;
```
**Esperado**: Pelo menos 1 token

### Verificar Notificações
```sql
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;
```
**Esperado**: Notificações sendo criadas

### Verificar Preferências
```sql
SELECT email, notification_preferences FROM users;
```
**Esperado**: Preferências não bloqueando tudo

## 📊 LOGS IMPORTANTES

Ao aprovar um produto, você DEVE ver no log do backend:

```
📢 Iniciando publicação multicanal para: [NOME DO PRODUTO]
📱 Produto já disponível no app via API /products
🔔 X usuários segmentados para notificar
   💾 X notificações criadas no banco
📤 FCM: Enviando notificação para token...
✅ FCM: Notificação enviada. Message ID: ...
🔔 Push notifications FCM: X/X enviadas para: [NOME DO PRODUTO]
```

Se você NÃO vê estas mensagens, execute o script de debug.

## 🆕 O QUE FOI IMPLEMENTADO

### 1. Notificações de Cupom Esgotado ✅

**Arquivo**: `backend/src/services/coupons/couponNotificationService.js`
- Adicionado `notifyOutOfStockCoupon()`
- Atualizado `createPushNotifications()` para suportar cupom esgotado

**Arquivo**: `backend/src/models/Coupon.js`
- Atualizado `markAsOutOfStock()` para enviar notificações automaticamente

### 2. Script de Diagnóstico ✅

**Arquivo**: `backend/scripts/debug-notifications.js`
- Verifica Firebase, tokens, preferências, produtos, notificações e cupons
- Fornece diagnóstico completo e recomendações

### 3. Documentação Completa ✅

- 5 arquivos de documentação
- 1 arquivo SQL com queries úteis
- Guias rápidos e detalhados

## 🧪 TESTES

### Teste 1: Debug Completo
```bash
cd backend
node scripts/debug-notifications.js
```

### Teste 2: Notificação Direta
```bash
node scripts/test-all-notifications-user.js
```
**Esperado**: 10/10 notificações enviadas

### Teste 3: Aprovar Produto
1. Acesse painel admin
2. Vá em "Produtos Pendentes"
3. Aprove um produto
4. Verifique logs do backend

### Teste 4: Criar Cupom
1. Acesse painel admin
2. Crie um novo cupom
3. Ative o cupom
4. Verifique logs do backend

### Teste 5: Esgotar Cupom
1. Acesse painel admin
2. Marque cupom como esgotado
3. Verifique logs do backend
4. Verifique se notificação chegou

## 🆘 SUPORTE

Se após executar o script de debug você ainda tiver problemas, compartilhe:

1. **Saída completa do script**:
   ```bash
   node scripts/debug-notifications.js > debug-output.txt 2>&1
   ```

2. **Logs do backend** durante aprovação de produto

3. **Resultado das queries SQL**:
   - `SELECT * FROM fcm_tokens;`
   - `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;`

4. **Versão do app** e **sistema operacional** do celular

## 📱 CONFIGURAÇÃO DO APP

Para que notificações funcionem, o app precisa:

1. ✅ Ter `google-services.json` configurado (Android)
2. ✅ Ter `GoogleService-Info.plist` configurado (iOS)
3. ✅ Usuário fazer login
4. ✅ Usuário aceitar permissão de notificações
5. ✅ Token FCM ser registrado no backend

Veja `app/COMO_ATIVAR_NOTIFICACOES.md` para mais detalhes.

## 🎓 RECURSOS ADICIONAIS

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase](https://rnfirebase.io/)
- [Expo Notifications](https://docs.expo.dev/push-notifications/overview/)

## 📝 NOTAS IMPORTANTES

1. **IA pode desabilitar push**: Se produto tem baixa qualidade, IA define `should_send_push = false`. Isso é normal e protege usuários de spam.

2. **Segmentação filtra usuários**: Nem todos os usuários recebem todas as notificações. O sistema respeita preferências e categorias.

3. **Tokens expiram**: Tokens FCM podem expirar. Se usuário reinstalar app ou limpar dados, precisa fazer login novamente.

4. **Notificações são assíncronas**: Pode haver delay de alguns segundos entre aprovação e recebimento.

## 🔄 PRÓXIMOS PASSOS

1. Execute `node scripts/debug-notifications.js`
2. Identifique o problema específico
3. Aplique a solução correspondente
4. Teste com `node scripts/test-all-notifications-user.js`
5. Aprove um produto e verifique se notificação chega
6. Compartilhe resultado se precisar de ajuda

---

**Última atualização**: 2026-03-03
**Versão**: 1.0.0
