# 🔍 AUDITORIA COMPLETA - SISTEMA DE NOTIFICAÇÕES PUSH

## 📋 RESUMO EXECUTIVO

Esta auditoria identificou os pontos críticos do sistema de notificações push para cupons e produtos.

## ✅ O QUE ESTÁ FUNCIONANDO

### 1. Estrutura de Código
- ✅ `couponNotificationService.js` - Serviço completo de notificações de cupons
- ✅ `fcmService.js` - Serviço FCM configurado e funcional
- ✅ `publishService.js` - Serviço de publicação de produtos
- ✅ Controllers chamam os serviços de notificação corretamente

### 2. Fluxos Implementados

#### Cupons:
- ✅ **Criação** (`couponController.create`): Chama `couponNotificationService.notifyNewCoupon()`
- ✅ **Aprovação** (`couponController.approve`): Chama `couponNotificationService.notifyNewCoupon()` com `manual: true`
- ✅ **Esgotado** (`couponController.markAsOutOfStock`): Chama `fcmService.sendCustomNotification()`

#### Produtos:
- ✅ **Criação** (`productController.create`): Chama `publishService.publishAll()` → `notifyPush()`
- ✅ **Aprovação** (`productController.approve`): Chama `publishService.publishAll()` → `notifyPush()`

## ❌ PROBLEMAS IDENTIFICADOS

### 🔴 PROBLEMA 1: Notificações Push Não Estão Sendo Enviadas

**Sintomas:**
- Teste manual funciona
- Operações reais (criar cupom, aprovar produto) não enviam notificações

**Causas Possíveis:**

#### A) FCM Não Está Habilitado
```javascript
// Verificar em fcmService.js
isEnabled() {
    return this.initialized && this.app !== null;
}
```

**Solução:**
```bash
# Verificar variáveis de ambiente
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIREBASE_PROJECT_ID=seu-projeto-id
```

#### B) Usuários Sem Token FCM
```sql
-- Verificar tokens no banco
SELECT id, name, email, fcm_token 
FROM users 
WHERE fcm_token IS NOT NULL;
```

**Solução:**
- Usuários precisam abrir o app e permitir notificações
- App registra token FCM automaticamente no login

#### C) Segmentação Bloqueando Envio
```javascript
// Em notificationSegmentationService.js
const users = await notificationSegmentationService.getUsersForCoupon(coupon);
// Se retornar array vazio, ninguém recebe notificação
```

**Solução:**
- Verificar preferências dos usuários na tabela `users`
- Campos: `notify_new_products`, `notify_price_drops`, `notify_coupons`

#### D) Erros Silenciosos
```javascript
// Controllers capturam erros mas não falham
try {
    await couponNotificationService.notifyNewCoupon(coupon);
} catch (notifError) {
    logger.error(`❌ Erro ao enviar notificação: ${notifError.message}`);
    // NÃO FALHA - continua execução
}
```

**Solução:**
- Verificar logs do backend para erros
- Procurar por: `❌ Erro ao enviar notificação`

### 🔴 PROBLEMA 2: Notificações de Bots vs Push

**Importante:** O sistema tem DOIS tipos de notificações:

1. **Notificações de Bots** (Telegram/WhatsApp)
   - Enviadas via `notificationDispatcher`
   - Funcionam independentemente

2. **Notificações Push** (FCM para app mobile)
   - Enviadas via `fcmService`
   - Dependem de tokens FCM dos usuários

**Fluxo Correto:**
```javascript
// couponNotificationService.notifyNewCoupon()
// 1. Envia para bots (Telegram/WhatsApp)
await notificationDispatcher.sendToTelegram(...);
await notificationDispatcher.sendToWhatsApp(...);

// 2. Cria notificações push (FCM)
await this.createPushNotifications(coupon, 'new_coupon');
```

### 🔴 PROBLEMA 3: Cupom Esgotado - Implementação Incompleta

**Código Atual:**
```javascript
// couponController.markAsOutOfStock
await fcmService.sendCustomNotification(users, ...);
```

**Problema:**
- Não chama `couponNotificationService.notifyOutOfStockCoupon()`
- Não envia para bots (Telegram/WhatsApp)
- Só envia push FCM

**Solução:**
```javascript
// Usar serviço completo
await couponNotificationService.notifyOutOfStockCoupon(coupon);
```

## 🔧 CORREÇÕES NECESSÁRIAS

### Correção 1: Adicionar Logs Detalhados

```javascript
// Em couponNotificationService.js - createPushNotifications()
logger.info(`📱 Enviando notificações push FCM para ${users.length} usuários segmentados...`);

// Adicionar ANTES do envio:
logger.info(`🔍 Usuários que receberão notificação:`);
users.forEach(u => {
  logger.info(`   - ${u.name || u.email} (ID: ${u.id}, Token: ${u.fcm_token ? 'SIM' : 'NÃO'})`);
});

// Adicionar DEPOIS do envio:
logger.info(`📊 Resultado FCM:`);
logger.info(`   Total enviado: ${result.total_sent}`);
logger.info(`   Total falhou: ${result.total_failed}`);
logger.info(`   Detalhes: ${JSON.stringify(result)}`);
```

### Correção 2: Corrigir Notificação de Cupom Esgotado

```javascript
// backend/src/controllers/couponController.js
static async markAsOutOfStock(req, res, next) {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json(
        errorResponse('Cupom não encontrado', ERROR_CODES.NOT_FOUND)
      );
    }

    if (coupon.is_out_of_stock) {
      return res.status(400).json(
        errorResponse('Cupom já está marcado como esgotado', 'ALREADY_OUT_OF_STOCK')
      );
    }

    // Marcar como esgotado
    const updatedCoupon = await Coupon.markAsOutOfStock(id);
    await cacheDelByPattern('coupons:*');

    logger.info(`🚫 Cupom marcado como esgotado: ${id} (${coupon.code})`);

    // CORREÇÃO: Usar serviço completo de notificações
    try {
      await couponNotificationService.notifyOutOfStockCoupon(updatedCoupon);
      logger.info(`✅ Notificações de cupom esgotado enviadas`);
    } catch (notifyError) {
      logger.error(`❌ Erro ao notificar cupom esgotado: ${notifyError.message}`);
    }

    res.json(successResponse(updatedCoupon, 'Cupom marcado como esgotado e notificações enviadas'));
  } catch (error) {
    logger.error(`❌ Erro ao marcar cupom como esgotado: ${error.message}`);
    next(error);
  }
}
```

### Correção 3: Verificar Segmentação

```javascript
// backend/src/services/notificationSegmentationService.js
async getUsersForCoupon(coupon) {
  // ADICIONAR LOG
  logger.info(`🔍 Segmentando usuários para cupom: ${coupon.code}`);
  
  const users = await this.getSegmentedUsers(coupon);
  
  // ADICIONAR LOG
  logger.info(`📊 Resultado da segmentação:`);
  logger.info(`   Total de usuários: ${users.length}`);
  logger.info(`   Plataforma do cupom: ${coupon.platform}`);
  
  if (users.length === 0) {
    logger.warn(`⚠️ NENHUM USUÁRIO SEGMENTADO!`);
    logger.warn(`   Possíveis causas:`);
    logger.warn(`   1. Nenhum usuário tem preferências habilitadas`);
    logger.warn(`   2. Nenhum usuário tem token FCM`);
    logger.warn(`   3. Filtros de segmentação muito restritivos`);
  }
  
  return users;
}
```

## 🧪 COMO EXECUTAR A AUDITORIA

### 1. Executar Script de Auditoria

```bash
cd backend
node scripts/audit-notifications-complete.js
```

Este script irá:
1. ✅ Verificar configuração FCM
2. ✅ Verificar tokens FCM dos usuários
3. ✅ Testar criação de cupom
4. ✅ Testar aprovação de cupom
5. ✅ Testar cupom esgotado
6. ✅ Testar criação de produto
7. ✅ Gerar relatório completo

### 2. Verificar Logs

```bash
# Logs do backend
tail -f backend/logs/combined.log | grep "notificação"

# Ou filtrar por erro
tail -f backend/logs/error.log
```

### 3. Verificar Banco de Dados

```sql
-- Verificar tokens FCM
SELECT 
  id, 
  name, 
  email, 
  fcm_token IS NOT NULL as has_token,
  notify_new_products,
  notify_coupons
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- Verificar notificações criadas
SELECT 
  n.id,
  n.title,
  n.message,
  n.type,
  n.sent_at,
  u.name as user_name
FROM notifications n
JOIN users u ON n.user_id = u.id
ORDER BY n.created_at DESC
LIMIT 20;
```

## 📊 CHECKLIST DE DIAGNÓSTICO

### Antes de Criar Cupom/Produto:

- [ ] FCM está habilitado? (`fcmService.isEnabled()`)
- [ ] Variáveis de ambiente configuradas?
  - [ ] `FIREBASE_SERVICE_ACCOUNT`
  - [ ] `FIREBASE_PROJECT_ID`
- [ ] Existem usuários com token FCM?
- [ ] Usuários têm preferências de notificação habilitadas?

### Após Criar Cupom/Produto:

- [ ] Log mostra "Iniciando envio de notificação"?
- [ ] Log mostra "Notificação enviada com sucesso"?
- [ ] Log mostra quantidade de usuários segmentados?
- [ ] Log mostra resultado do FCM (enviados/falhas)?
- [ ] Notificações foram criadas no banco?
- [ ] Notificações foram marcadas como enviadas?

### Se Notificações Não Chegam:

- [ ] Verificar logs de erro no backend
- [ ] Verificar se FCM retornou erro
- [ ] Verificar se tokens FCM são válidos
- [ ] Verificar se app está em foreground/background
- [ ] Verificar permissões de notificação no dispositivo
- [ ] Verificar se google-services.json está correto no app

## 🎯 PRÓXIMOS PASSOS

1. **Executar auditoria completa**
   ```bash
   node backend/scripts/audit-notifications-complete.js
   ```

2. **Analisar resultados**
   - Identificar qual etapa está falhando
   - Verificar logs detalhados

3. **Aplicar correções**
   - Corrigir configuração FCM se necessário
   - Corrigir segmentação se necessário
   - Adicionar logs detalhados

4. **Testar novamente**
   - Criar cupom de teste
   - Criar produto de teste
   - Verificar se notificações chegam

5. **Monitorar em produção**
   - Acompanhar logs
   - Verificar taxa de entrega
   - Coletar feedback dos usuários

## 📝 NOTAS IMPORTANTES

### Diferença entre Teste Manual e Operação Real

**Teste Manual:**
```javascript
// Script de teste chama diretamente
await fcmService.sendCustomNotification(users, title, body, data);
// ✅ Funciona porque:
// - Busca usuários diretamente do banco
// - Não passa por segmentação
// - Não depende de fluxo completo
```

**Operação Real:**
```javascript
// Controller → Service → Segmentação → FCM
await couponNotificationService.notifyNewCoupon(coupon);
// ❌ Pode falhar porque:
// - Passa por segmentação (pode retornar 0 usuários)
// - Depende de preferências dos usuários
// - Depende de tokens FCM válidos
```

### Logs Críticos para Monitorar

```bash
# Sucesso
"📢 Iniciando envio de notificação"
"✅ Notificação enviada com sucesso"
"📱 Enviando notificações push FCM para X usuários"
"✅ Push notifications FCM: X enviadas"

# Falha
"❌ Erro ao enviar notificação"
"⚠️ Nenhum usuário segmentado"
"⚠️ FCM: Nenhum token FCM disponível"
"❌ Erro ao criar notificações push"
```

## 🆘 TROUBLESHOOTING RÁPIDO

### Problema: "Nenhum usuário segmentado"
**Solução:** Verificar preferências dos usuários no banco

### Problema: "FCM não está habilitado"
**Solução:** Verificar variáveis de ambiente FIREBASE_*

### Problema: "Nenhum token FCM disponível"
**Solução:** Usuários precisam abrir o app e permitir notificações

### Problema: "Notificação criada mas não enviada"
**Solução:** Verificar logs do FCM para erros de envio

### Problema: "Teste funciona mas operação real não"
**Solução:** Verificar segmentação e preferências dos usuários
