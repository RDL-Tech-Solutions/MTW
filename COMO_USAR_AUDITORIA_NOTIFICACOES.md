# 🔍 COMO USAR A AUDITORIA DE NOTIFICAÇÕES PUSH

## 📋 O QUE FOI FEITO

### ✅ Correções Aplicadas

1. **Notificação de Cupom Esgotado**
   - Corrigido `couponController.markAsOutOfStock()` para usar `couponNotificationService.notifyOutOfStockCoupon()`
   - Agora envia notificações para bots (Telegram/WhatsApp) E push FCM

2. **Logs Detalhados Adicionados**
   - `couponNotificationService.createPushNotifications()` - Logs completos do fluxo
   - `notificationSegmentationService.getUsersForCoupon()` - Logs de segmentação detalhados
   - Agora é possível ver exatamente onde o processo está falhando

3. **Script de Auditoria Completo**
   - Testa TODOS os fluxos de notificação
   - Gera relatório detalhado
   - Identifica problemas automaticamente

## 🚀 COMO EXECUTAR A AUDITORIA

### Passo 1: Executar o Script

```bash
cd backend
node scripts/audit-notifications-complete.js
```

### Passo 2: Analisar o Relatório

O script irá testar:

1. ✅ **Configuração FCM**
   - Verifica se FCM está habilitado
   - Verifica variáveis de ambiente
   - Verifica service account do Firebase

2. ✅ **Tokens FCM dos Usuários**
   - Lista usuários com token
   - Lista usuários sem token
   - Mostra estatísticas

3. ✅ **Criação de Cupom**
   - Cria cupom de teste
   - Tenta enviar notificação
   - Verifica se chegou

4. ✅ **Aprovação de Cupom**
   - Cria cupom pendente
   - Aprova cupom
   - Verifica notificação

5. ✅ **Cupom Esgotado**
   - Cria cupom
   - Marca como esgotado
   - Verifica notificação

6. ✅ **Criação de Produto**
   - Cria produto
   - Verifica notificação push

### Passo 3: Interpretar os Resultados

#### ✅ Tudo OK
```
========================================
✅ AUDITORIA CONCLUÍDA COM SUCESSO!
   Todas as notificações estão funcionando corretamente.
========================================
```

#### ❌ Problemas Encontrados
```
========================================
❌ AUDITORIA ENCONTROU PROBLEMAS!
   3 erro(s) detectado(s).
   Verifique os logs acima para mais detalhes.
========================================

❌ ERROS ENCONTRADOS:
   1. FCM não está habilitado
   2. Nenhum usuário tem token FCM
   3. Notificação de criação de cupom falhou
```

## 🔍 DIAGNÓSTICO DE PROBLEMAS

### Problema 1: FCM Não Está Habilitado

**Sintoma:**
```
1️⃣ CONFIGURAÇÃO FCM:
   Status: ❌ INATIVO
   Service Account: ❌
   Project ID: ❌
```

**Solução:**
1. Verificar arquivo `.env` do backend:
   ```env
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
   FIREBASE_PROJECT_ID=seu-projeto-id
   ```

2. Verificar se o arquivo está correto:
   ```bash
   node backend/scripts/check-firebase-admin.js
   ```

3. Reiniciar o backend após configurar

### Problema 2: Nenhum Usuário Tem Token FCM

**Sintoma:**
```
2️⃣ TOKENS FCM DOS USUÁRIOS:
   Total de usuários: 5
   Com token: 0 ✅
   Sem token: 5 ⚠️
```

**Solução:**
1. Usuários precisam abrir o app mobile
2. Permitir notificações quando solicitado
3. Fazer login no app
4. O token é registrado automaticamente

**Verificar no banco:**
```sql
SELECT id, name, email, fcm_token 
FROM users 
WHERE fcm_token IS NOT NULL;
```

### Problema 3: Notificações Não Chegam (Segmentação)

**Sintoma:**
```
🎯 ========== SEGMENTAÇÃO DE USUÁRIOS (CUPOM) ==========
   📊 Resultado da segmentação:
      Total de usuários com token: 10
      ✅ Usuários segmentados: 0
      ⏭️ Pulados (push desabilitado): 5
      ⏭️ Pulados (sem match): 5
```

**Solução:**

#### A) Usuários Desabilitaram Push
```sql
-- Verificar preferências
SELECT u.id, u.name, np.push_enabled
FROM users u
LEFT JOIN notification_preferences np ON u.id = np.user_id
WHERE u.fcm_token IS NOT NULL;
```

**Habilitar push para todos:**
```sql
UPDATE notification_preferences 
SET push_enabled = true;
```

#### B) Filtros Muito Restritivos
```sql
-- Verificar filtros
SELECT 
  u.id, 
  u.name,
  np.category_preferences,
  np.keyword_preferences
FROM users u
JOIN notification_preferences np ON u.id = np.user_id
WHERE u.fcm_token IS NOT NULL;
```

**Remover filtros (receber tudo):**
```sql
UPDATE notification_preferences 
SET 
  category_preferences = NULL,
  keyword_preferences = NULL,
  product_name_preferences = NULL;
```

### Problema 4: Notificações Criadas Mas Não Enviadas

**Sintoma:**
```
📊 Resultado do FCM:
   Total enviado: 0
   Total falhou: 5
```

**Solução:**
1. Verificar logs do FCM:
   ```bash
   tail -f backend/logs/combined.log | grep "FCM"
   ```

2. Tokens FCM podem estar expirados:
   ```sql
   -- Limpar tokens antigos
   UPDATE users 
   SET fcm_token = NULL 
   WHERE updated_at < NOW() - INTERVAL '30 days';
   ```

3. Usuários precisam reabrir o app para registrar novo token

## 📊 MONITORAMENTO EM PRODUÇÃO

### Logs para Acompanhar

```bash
# Logs de notificações
tail -f backend/logs/combined.log | grep "notificação"

# Logs de segmentação
tail -f backend/logs/combined.log | grep "Segmentando"

# Logs de FCM
tail -f backend/logs/combined.log | grep "FCM"

# Logs de erros
tail -f backend/logs/error.log
```

### Queries Úteis

```sql
-- Usuários com token FCM
SELECT COUNT(*) as total_com_token
FROM users 
WHERE fcm_token IS NOT NULL;

-- Notificações enviadas hoje
SELECT 
  type,
  COUNT(*) as total,
  COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) as enviadas
FROM notifications
WHERE created_at >= CURRENT_DATE
GROUP BY type;

-- Taxa de entrega
SELECT 
  COUNT(*) as total_criadas,
  COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) as enviadas,
  ROUND(
    COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END)::numeric / 
    COUNT(*)::numeric * 100, 
    2
  ) as taxa_entrega_pct
FROM notifications
WHERE created_at >= CURRENT_DATE;
```

## 🧪 TESTES MANUAIS

### Teste 1: Criar Cupom

```bash
# Via API
curl -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "code": "TESTE123",
    "platform": "shopee",
    "discount_type": "percentage",
    "discount_value": 15,
    "valid_from": "2024-01-01",
    "valid_until": "2024-12-31",
    "is_active": true,
    "is_general": true
  }'
```

**Verificar logs:**
```bash
tail -f backend/logs/combined.log | grep "TESTE123"
```

**Deve aparecer:**
- ✅ "Cupom criado com sucesso"
- ✅ "Iniciando envio de notificação"
- ✅ "Segmentando usuários"
- ✅ "X usuários segmentados"
- ✅ "Enviando notificações push FCM"
- ✅ "Notificações push FCM: X enviadas"

### Teste 2: Marcar Cupom como Esgotado

```bash
# Via API
curl -X POST http://localhost:3000/api/coupons/ID_DO_CUPOM/out-of-stock \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Verificar logs:**
```bash
tail -f backend/logs/combined.log | grep "esgotado"
```

**Deve aparecer:**
- ✅ "Cupom marcado como esgotado"
- ✅ "Enviando notificações de cupom esgotado"
- ✅ "Notificações de cupom esgotado enviadas (bots + push)"

### Teste 3: Criar Produto

```bash
# Via Admin Panel ou API
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "name": "Produto Teste",
    "current_price": 99.90,
    "affiliate_link": "https://example.com/produto",
    "platform": "shopee",
    "category_id": 1
  }'
```

**Verificar logs:**
```bash
tail -f backend/logs/combined.log | grep "Produto Teste"
```

## 🎯 CHECKLIST RÁPIDO

Antes de reportar problema, verificar:

- [ ] FCM está habilitado? (`fcmService.isEnabled()`)
- [ ] Variáveis de ambiente configuradas?
- [ ] Existem usuários com token FCM?
- [ ] Usuários têm push habilitado nas preferências?
- [ ] Logs mostram "Segmentando usuários"?
- [ ] Logs mostram quantidade de usuários segmentados?
- [ ] Logs mostram "Enviando via FCM"?
- [ ] Logs mostram resultado do envio?
- [ ] Notificações foram criadas no banco?
- [ ] App está com permissões de notificação?

## 📞 SUPORTE

Se após seguir todos os passos o problema persistir:

1. **Coletar informações:**
   - Logs completos do backend
   - Resultado da auditoria
   - Queries do banco de dados
   - Versão do app mobile

2. **Verificar:**
   - Configuração do Firebase
   - Arquivo google-services.json no app
   - Permissões de notificação no dispositivo
   - Conexão com internet

3. **Testar:**
   - Notificação manual via script
   - Notificação via admin panel
   - Notificação via API direta

## 🔄 PRÓXIMOS PASSOS

1. **Executar auditoria agora:**
   ```bash
   node backend/scripts/audit-notifications-complete.js
   ```

2. **Corrigir problemas identificados**

3. **Testar manualmente:**
   - Criar cupom
   - Aprovar cupom
   - Marcar como esgotado
   - Criar produto

4. **Monitorar em produção:**
   - Acompanhar logs
   - Verificar taxa de entrega
   - Coletar feedback dos usuários

5. **Otimizar:**
   - Ajustar segmentação
   - Melhorar mensagens
   - Adicionar mais filtros
