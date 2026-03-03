# 🎯 Segmentação de Notificações Push

## VISÃO GERAL

O sistema possui **segmentação inteligente** de notificações push que permite aos usuários escolherem:

1. ✅ **Categorias de interesse** (ex: Games, Hardware, Moda)
2. ✅ **Palavras-chave** (ex: "playstation", "iphone", "notebook")
3. ✅ **Produtos específicos** (ex: "iPhone 15", "Samsung Galaxy", "MacBook")

## COMO FUNCIONA

### Fluxo de Segmentação

```
Produto aprovado
    ↓
publishService.notifyPush()
    ↓
notificationSegmentationService.getUsersForProduct()
    ↓
Para cada usuário:
  - Busca preferências (notification_preferences)
  - Verifica se deve receber:
    ✓ Categoria match?
    ✓ Palavra-chave match?
    ✓ Nome de produto match?
    ↓
Retorna lista de usuários segmentados
    ↓
fcmService.notifyNewPromo() envia apenas para usuários segmentados
```

### Regras de Segmentação

#### 1. Sem Preferências = Recebe Tudo ✅

Se usuário **não configurou** preferências:
- ✅ Recebe **todas** as notificações
- Comportamento padrão

#### 2. Com Preferências = Filtro Ativo 🎯

Se usuário **configurou** preferências:
- ✅ Recebe apenas produtos que **correspondem** aos filtros
- ❌ Não recebe produtos que **não correspondem**

#### 3. Push Desativado = Não Recebe ❌

Se usuário **desativou** push:
- ❌ Não recebe **nenhuma** notificação
- Mesmo que produto corresponda aos filtros

## ESTRUTURA DE DADOS

### Tabela: notification_preferences

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,
  
  -- Filtros de segmentação
  category_preferences JSONB DEFAULT '[]', -- Array de category_ids
  keyword_preferences JSONB DEFAULT '[]', -- Array de strings
  product_name_preferences JSONB DEFAULT '[]', -- Array de strings
  
  home_filters JSONB DEFAULT '{}',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Exemplo de Preferências

```json
{
  "push_enabled": true,
  "email_enabled": false,
  "category_preferences": [
    "uuid-categoria-games",
    "uuid-categoria-hardware"
  ],
  "keyword_preferences": [
    "playstation",
    "xbox",
    "nintendo",
    "pc gamer",
    "notebook"
  ],
  "product_name_preferences": [
    "iPhone",
    "Samsung Galaxy",
    "MacBook",
    "PlayStation 5"
  ]
}
```

## EXEMPLOS DE USO

### Exemplo 1: Usuário Gamer 🎮

**Preferências**:
```json
{
  "category_preferences": ["uuid-games"],
  "keyword_preferences": ["playstation", "xbox", "nintendo"]
}
```

**Recebe notificações de**:
- ✅ PlayStation 5 Console (categoria: games)
- ✅ Controle Xbox Series X (palavra-chave: xbox)
- ✅ Nintendo Switch OLED (palavra-chave: nintendo)
- ✅ Cadeira Gamer RGB (categoria: games)

**NÃO recebe notificações de**:
- ❌ iPhone 15 Pro (categoria: smartphones)
- ❌ Notebook Dell (categoria: hardware)
- ❌ Tênis Nike (categoria: moda)

---

### Exemplo 2: Usuário Tech 💻

**Preferências**:
```json
{
  "keyword_preferences": ["iphone", "macbook", "samsung"],
  "product_name_preferences": ["iPhone 15", "MacBook Pro"]
}
```

**Recebe notificações de**:
- ✅ iPhone 15 Pro Max (produto específico)
- ✅ MacBook Pro M3 (produto específico)
- ✅ Samsung Galaxy S24 (palavra-chave: samsung)
- ✅ Carregador para iPhone (palavra-chave: iphone)

**NÃO recebe notificações de**:
- ❌ PlayStation 5 (sem match)
- ❌ Cadeira Gamer (sem match)
- ❌ Xiaomi Redmi (sem match)

---

### Exemplo 3: Usuário Sem Filtros 🌐

**Preferências**:
```json
{
  "category_preferences": [],
  "keyword_preferences": [],
  "product_name_preferences": []
}
```

**Recebe notificações de**:
- ✅ **TODOS** os produtos
- Comportamento padrão

---

### Exemplo 4: Push Desativado 🔕

**Preferências**:
```json
{
  "push_enabled": false
}
```

**Recebe notificações de**:
- ❌ **NENHUM** produto
- Mesmo que tenha filtros configurados

## IMPLEMENTAÇÃO

### Arquivo Principal

`backend/src/services/notificationSegmentationService.js`

### Métodos Principais

#### 1. getUsersForProduct(product)

Retorna lista de usuários que devem receber notificação de um produto.

```javascript
const segmentedUsers = await notificationSegmentationService.getUsersForProduct(product);
// Retorna: [{ id, email, fcm_token, ... }, ...]
```

#### 2. getUsersForCoupon(coupon)

Retorna lista de usuários que devem receber notificação de um cupom.

```javascript
const segmentedUsers = await notificationSegmentationService.getUsersForCoupon(coupon);
```

#### 3. shouldReceiveProductNotification(product, preferences)

Verifica se usuário deve receber notificação de um produto específico.

```javascript
const shouldReceive = notificationSegmentationService.shouldReceiveProductNotification(product, preferences);
// Retorna: true ou false
```

#### 4. getSegmentationStats()

Retorna estatísticas de segmentação.

```javascript
const stats = await notificationSegmentationService.getSegmentationStats();
// Retorna: { total_users, users_with_preferences, ... }
```

## COMO TESTAR

### Teste Automatizado

Execute o script de teste:

```bash
cd backend
node scripts/test-notification-segmentation.js
```

**O que o script testa**:
1. ✅ Segmentação por categoria
2. ✅ Segmentação por palavras-chave
3. ✅ Segmentação por nome de produto específico
4. ✅ Usuário sem filtros (recebe tudo)
5. ✅ Usuário com push desativado (não recebe nada)
6. ✅ Estatísticas de segmentação

**Resultado esperado**:
```
🧪 ========== TESTE DE SEGMENTAÇÃO DE NOTIFICAÇÕES ==========

📋 PASSO 1: Configurando usuários de teste
✅ Usuário configurado: teste.gamer@example.com
✅ Usuário configurado: teste.tech@example.com
✅ Usuário configurado: teste.tudo@example.com
✅ Usuário configurado: teste.desativado@example.com

📋 PASSO 2: Testando segmentação por CATEGORIA
🎯 Testando produto: PlayStation 5 Console
   📊 Resultado: 2 usuários segmentados
      ✅ teste.gamer@example.com
      ✅ teste.tudo@example.com
      ✅ CORRETO: Usuário Gamer recebeu (filtro de categoria)
      ✅ CORRETO: Usuário Tudo recebeu (sem filtros)

📋 PASSO 3: Testando segmentação por PALAVRAS-CHAVE
🎯 Testando produto: Controle Xbox Series X Wireless
   📊 Resultado: 2 usuários segmentados
      ✅ teste.gamer@example.com
      ✅ teste.tudo@example.com
      ✅ CORRETO: Usuário Gamer recebeu (palavra-chave: xbox)

📋 PASSO 4: Testando segmentação por NOME DE PRODUTO ESPECÍFICO
🎯 Testando produto: iPhone 15 Pro Max 256GB
   📊 Resultado: 2 usuários segmentados
      ✅ teste.tech@example.com
      ✅ teste.tudo@example.com
      ✅ CORRETO: Usuário Tech recebeu (produto específico: iPhone)

📋 PASSO 5: Testando usuário com PUSH DESATIVADO
✅ CORRETO: Usuário com push desativado NÃO recebeu notificação

📋 PASSO 6: Estatísticas de segmentação
📊 Estatísticas:
   Total de usuários com FCM: 4
   Usuários com preferências: 4
   Usuários com filtro de categoria: 2
   Usuários com filtro de palavra-chave: 2
   Usuários com filtro de produto específico: 1
   Usuários sem filtros (recebem tudo): 0

✅ ========== TESTES CONCLUÍDOS ==========
```

---

### Teste Manual

#### 1. Configurar Preferências de um Usuário

```bash
curl -X POST http://localhost:3000/api/notification-preferences \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "push_enabled": true,
    "category_preferences": ["uuid-categoria-games"],
    "keyword_preferences": ["playstation", "xbox"],
    "product_name_preferences": ["iPhone 15"]
  }'
```

#### 2. Aprovar Produto e Verificar Segmentação

1. Aprovar produto no painel admin
2. Verificar logs do backend:

```
🎯 Segmentando usuários para produto: PlayStation 5 Console
   4 usuários com FCM token
   ✅ Match por categoria: uuid-categoria-games
   ✅ Match por palavra-chave: playstation
   ✅ 2 usuários segmentados
```

#### 3. Verificar Notificações no Banco

```sql
SELECT 
  u.email,
  n.title,
  n.message,
  n.type,
  n.created_at
FROM notifications n
JOIN users u ON u.id = n.user_id
WHERE n.type = 'new_product'
ORDER BY n.created_at DESC
LIMIT 10;
```

## API ENDPOINTS

### GET /api/notification-preferences

Obter preferências do usuário autenticado.

**Response**:
```json
{
  "success": true,
  "data": {
    "push_enabled": true,
    "email_enabled": false,
    "category_preferences": ["uuid-1", "uuid-2"],
    "keyword_preferences": ["playstation", "xbox"],
    "product_name_preferences": ["iPhone 15"]
  }
}
```

---

### POST /api/notification-preferences

Atualizar preferências do usuário autenticado.

**Request**:
```json
{
  "push_enabled": true,
  "category_preferences": ["uuid-categoria-games"],
  "keyword_preferences": ["playstation", "xbox", "nintendo"],
  "product_name_preferences": ["iPhone 15", "Samsung Galaxy"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "push_enabled": true,
    "category_preferences": ["uuid-categoria-games"],
    "keyword_preferences": ["playstation", "xbox", "nintendo"],
    "product_name_preferences": ["iPhone 15", "Samsung Galaxy"],
    "updated_at": "2026-03-03T..."
  }
}
```

## LOGS E DEBUG

### Logs de Segmentação

Ao aprovar produto, logs mostram:

```
🎯 Segmentando usuários para produto: PlayStation 5 Console
   4 usuários com FCM token
   ✅ Match por categoria: uuid-categoria-games (user: teste.gamer@example.com)
   ✅ Match por palavra-chave: playstation (user: teste.gamer@example.com)
   ✅ 2 usuários segmentados
📱 Enviando notificações push FCM para 2 usuários segmentados...
✅ Notificações push FCM: 2 enviadas, 0 falhas
```

### Debug de Preferências

```javascript
// Ver preferências de um usuário
const prefs = await NotificationPreference.findByUserId(userId);
console.log(prefs);

// Ver estatísticas
const stats = await notificationSegmentationService.getSegmentationStats();
console.log(stats);
```

## BENEFÍCIOS

1. ✅ **Menos spam**: Usuários recebem apenas notificações relevantes
2. ✅ **Maior engajamento**: Notificações personalizadas têm maior taxa de abertura
3. ✅ **Controle do usuário**: Usuário escolhe o que quer receber
4. ✅ **Flexibilidade**: Múltiplos filtros (categoria, palavra-chave, produto)
5. ✅ **Escalável**: Funciona com milhares de usuários

## LIMITAÇÕES

1. ⚠️ **Case-insensitive**: Palavras-chave não diferenciam maiúsculas/minúsculas
2. ⚠️ **Match parcial**: "iphone" match "iPhone 15 Pro Max"
3. ⚠️ **Sem regex**: Não suporta expressões regulares
4. ⚠️ **Sem sinônimos**: "celular" não match "smartphone"

## PRÓXIMAS MELHORIAS

- [ ] Suporte a sinônimos (celular = smartphone)
- [ ] Suporte a regex em palavras-chave
- [ ] Filtro por faixa de preço
- [ ] Filtro por desconto mínimo
- [ ] Filtro por plataforma (Shopee, Mercado Livre, etc)
- [ ] Machine Learning para sugerir preferências

## ARQUIVOS RELACIONADOS

- `backend/src/services/notificationSegmentationService.js` - Serviço principal
- `backend/src/models/NotificationPreference.js` - Modelo de dados
- `backend/src/controllers/notificationPreferenceController.js` - API endpoints
- `backend/scripts/test-notification-segmentation.js` - Script de teste

---

**Última atualização**: 2026-03-03  
**Status**: ✅ Implementado e testado
