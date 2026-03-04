# 🔔 Notificações Push na Aprovação de Produtos

## ✅ IMPLEMENTADO

Todos os métodos de aprovação de produtos em `/pending-products` agora enviam notificações push segmentadas de acordo com as configurações do usuário no app.

## 📋 MÉTODOS DE APROVAÇÃO

### 1. Aprovar e Publicar (`approve`)

**Endpoint**: `POST /api/products/:id/approve`

**Comportamento**:
- ✅ Aprova o produto
- ✅ Publica nos canais (Telegram, WhatsApp)
- ✅ Envia notificação push segmentada
- ✅ Atualiza status para `published`

**Notificação Push**: Enviada via `publishService.publishAll()` → `notifyPush()`

### 2. Aprovar e Agendar com IA (`approveAndSchedule`)

**Endpoint**: `POST /api/products/:id/approve-and-schedule`

**Comportamento**:
- ✅ Aprova o produto
- ✅ Agenda publicação com IA (melhor horário)
- ✅ **NOVO**: Envia notificação push segmentada imediatamente
- ✅ Atualiza status para `approved`

**Notificação Push**: Enviada via `publishService.notifyPush()` após agendar

**Motivo**: Mesmo que a publicação nos canais seja agendada, os usuários do app devem ser notificados imediatamente sobre o novo produto.

### 3. Aprovar Sem Publicar (`approveOnly`)

**Endpoint**: `POST /api/products/:id/approve-only`

**Comportamento**:
- ✅ Aprova o produto
- ❌ NÃO publica nos canais
- ✅ **NOVO**: Envia notificação push segmentada
- ✅ Atualiza status para `approved`
- ✅ Produto aparece no app

**Notificação Push**: Enviada via `publishService.notifyPush()` após aprovar

**Motivo**: Mesmo sem publicar nos canais (Telegram/WhatsApp), os usuários do app devem ser notificados sobre o novo produto disponível.

## 🎯 SEGMENTAÇÃO DE NOTIFICAÇÕES

As notificações push respeitam as configurações do usuário no app:

### Filtros Aplicados

1. **Push Habilitado**: Apenas usuários com `push_enabled = true`
2. **Categorias de Interesse**: Se usuário tem categorias configuradas, só recebe produtos dessas categorias
3. **Palavras-chave**: Se usuário tem palavras-chave, só recebe produtos que contenham essas palavras no nome ou descrição
4. **Produtos Específicos**: Se usuário tem produtos específicos, só recebe notificações desses produtos

### Exemplo de Segmentação

```javascript
// Usuário 1: Sem filtros
{
  push_enabled: true,
  notification_categories: null,
  notification_keywords: null,
  notification_products: null
}
// ✅ Recebe TODOS os produtos

// Usuário 2: Apenas Eletrônicos
{
  push_enabled: true,
  notification_categories: ['eletronicos'],
  notification_keywords: null,
  notification_products: null
}
// ✅ Recebe apenas produtos da categoria "eletrônicos"

// Usuário 3: Palavras-chave "notebook" e "gamer"
{
  push_enabled: true,
  notification_categories: null,
  notification_keywords: ['notebook', 'gamer'],
  notification_products: null
}
// ✅ Recebe apenas produtos com "notebook" OU "gamer" no nome/descrição

// Usuário 4: Push desabilitado
{
  push_enabled: false,
  notification_categories: ['eletronicos'],
  notification_keywords: ['notebook'],
  notification_products: null
}
// ❌ NÃO recebe nenhuma notificação
```

## 🔍 FLUXO COMPLETO

### Aprovar e Publicar

```
1. Admin clica "Aprovar e Publicar" em /pending-products
2. Backend aprova produto (status: approved)
3. Backend publica nos canais (Telegram, WhatsApp)
4. publishService.publishAll() chama notifyPush()
5. notificationSegmentationService filtra usuários
6. fcmService envia notificações push
7. Status atualizado para "published"
8. ✅ Usuários recebem notificação no celular
```

### Aprovar e Agendar

```
1. Admin clica "Agendar com IA" em /pending-products
2. Backend aprova produto (status: approved)
3. IA define melhor horário para publicação
4. Produto agendado em /scheduled-posts
5. publishService.notifyPush() é chamado IMEDIATAMENTE
6. notificationSegmentationService filtra usuários
7. fcmService envia notificações push
8. ✅ Usuários recebem notificação no celular AGORA
9. ⏰ Publicação nos canais acontecerá no horário agendado
```

### Aprovar Sem Publicar

```
1. Admin clica "Aprovar Sem Publicar" em /pending-products
2. Backend aprova produto (status: approved)
3. Produto aparece no app
4. publishService.notifyPush() é chamado
5. notificationSegmentationService filtra usuários
6. fcmService envia notificações push
7. ✅ Usuários recebem notificação no celular
8. ❌ Produto NÃO é publicado nos canais (Telegram/WhatsApp)
```

## 📊 LOGS

### Logs de Sucesso

```
✅ Produto aprovado: Nome do Produto
🔔 Notificação push enviada: Sim
📤 FCM: Enviando para 15 dispositivos...
   ✅ 15 enviados, 0 falhas
📊 FCM batch total: 15 enviados, 0 falhas
🔔 Push notifications FCM: 15/15 enviadas para: Nome do Produto
```

### Logs de Erro

```
❌ Erro ao enviar notificação push: [mensagem de erro]
```

**Nota**: Erros no envio de notificações push NÃO impedem a aprovação do produto. O produto é aprovado mesmo se a notificação falhar.

## 🧪 COMO TESTAR

### 1. Configurar Usuário no App

1. Abra o app
2. Faça login
3. Vá em Configurações → Notificações
4. Ative "Receber Notificações"
5. Configure filtros (opcional):
   - Categorias de interesse
   - Palavras-chave
   - Produtos específicos

### 2. Aprovar Produto no Admin

1. Acesse painel admin
2. Vá em "Produtos Pendentes"
3. Selecione um produto
4. Clique em uma das opções:
   - "Aprovar e Publicar"
   - "Agendar com IA"
   - "Aprovar Sem Publicar"

### 3. Verificar Notificação

1. ✅ Notificação deve aparecer no celular
2. ✅ Ao tocar, deve abrir o app na tela do produto
3. ✅ Produto deve aparecer no feed do app

### 4. Verificar Logs do Backend

```bash
cd backend
# Ver logs em tempo real
npm start

# Ou verificar arquivo de log
tail -f logs/combined.log | grep "🔔"
```

## 🔧 TROUBLESHOOTING

### Notificação não chega

**Causa 1**: Usuário não tem token FCM registrado

**Solução**:
```bash
cd backend
node scripts/debug-notifications.js
```

Verifique se o usuário tem token registrado na tabela `fcm_tokens`.

**Causa 2**: Usuário não passa nos filtros de segmentação

**Solução**: Verifique as configurações de notificação do usuário no app. Se ele tem filtros muito restritivos, pode não receber notificações de certos produtos.

**Causa 3**: Push desabilitado no app

**Solução**: Usuário deve ir em Configurações → Notificações e ativar "Receber Notificações".

### Notificação chega mas não navega

**Causa**: Dados da notificação não incluem `productId` ou `screen`

**Solução**: Verifique que o `publishService.notifyPush()` envia:
```javascript
data: {
  type: 'new_product',
  productId: String(product.id),
  screen: 'ProductDetails'
}
```

### Erro "fcm_tokens table does not exist"

**Causa**: Migração não foi aplicada

**Solução**:
```bash
cd backend
node scripts/apply-fcm-migration.js
```

## 📈 MÉTRICAS

### Verificar Notificações Enviadas

```sql
-- Total de notificações enviadas hoje
SELECT COUNT(*) 
FROM notifications 
WHERE DATE(created_at) = CURRENT_DATE 
AND type = 'new_product';

-- Notificações por produto
SELECT 
  p.name,
  COUNT(n.id) as total_notifications
FROM notifications n
JOIN products p ON n.product_id = p.id
WHERE DATE(n.created_at) = CURRENT_DATE
GROUP BY p.id, p.name
ORDER BY total_notifications DESC;

-- Taxa de entrega FCM
SELECT 
  COUNT(*) as total_sent,
  COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) as delivered,
  ROUND(COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as delivery_rate
FROM notifications
WHERE DATE(created_at) = CURRENT_DATE;
```

## 🎯 RESUMO

| Método | Publica Canais | Envia Push | Status Final |
|--------|----------------|------------|--------------|
| `approve` | ✅ Sim | ✅ Sim | `published` |
| `approveAndSchedule` | ⏰ Agendado | ✅ Sim (imediato) | `approved` |
| `approveOnly` | ❌ Não | ✅ Sim | `approved` |

**Todos os métodos agora enviam notificações push segmentadas!**

---

**Data**: 2026-03-04  
**Status**: Implementado e testado

