# 🔔 Auditoria de Notificações Push - Parte 3

## 🔴 Análise Detalhada dos Problemas Pendentes

### Problema #1: Notificações Não Enviadas Imediatamente ⚠️ CRÍTICO

#### Situação Atual

**Fluxo Problemático:**
```
1. Produto publicado → publishService.notifyPush()
2. Cria notificações no banco → Notification.createBulk()
3. Envia via OneSignal → oneSignalService.notifyNewPromo()
4. Marca como enviadas → Notification.markAsSent()
5. ✅ Enviadas IMEDIATAMENTE

PORÉM...

6. Cron job roda a cada hora → sendNotifications.js
7. Busca notificações não enviadas → Notification.findUnsent()
8. Tenta enviar novamente → ❌ DUPLICATAS POTENCIAIS
```

#### Problema Identificado

O sistema tem **DOIS CAMINHOS** para enviar notificações:

**Caminho 1: Imediato (BOM)**
- `publishService.notifyPush()` → Envia imediatamente
- `couponNotificationService.notifyPush()` → Envia imediatamente
- ✅ Funciona bem

**Caminho 2: Cron Job (PROBLEMÁTICO)**
- `updatePrices.js` → Cria notificação mas NÃO envia
- `checkExpiredCoupons.js` → Cria notificação mas NÃO envia
- ⏰ Aguarda cron job (até 1 hora)

#### Evidência do Código

```javascript
// backend/src/services/cron/updatePrices.js
for (const user of users) {
  await Notification.create({
    user_id: user.id,
    title: '💰 Preço Caiu!',
    message: `${product.name} agora por R$ ${product.current_price.toFixed(2)}`,
    type: 'price_drop',
    related_product_id: product.id
  });
  // ❌ NÃO ENVIA! Apenas cria no banco
}

// backend/src/services/cron/checkExpiredCoupons.js
await Notification.createBulk(notifications);
// ❌ NÃO ENVIA! Apenas cria no banco
```

#### Impacto

- ⏰ Notificações de "preço caiu" atrasam até 1 hora
- ⏰ Notificações de "cupom expirando" atrasam até 1 hora
- 😞 Má experiência do usuário
- 📉 Menor engajamento

#### Solução Proposta

**Opção 1: Enviar Imediatamente (RECOMENDADO)**
```javascript
// Criar E enviar imediatamente
const notifications = [...];
const createdNotifications = await Notification.createBulk(notifications);

// Enviar via OneSignal
const result = await oneSignalService.sendToMultiple(
  users.map(u => u.id.toString()),
  { title, message, data }
);

// Marcar como enviadas
if (result.success > 0) {
  await Promise.all(
    createdNotifications.map(n => Notification.markAsSent(n.id))
  );
}
```

**Opção 2: Fila de Prioridade**
```javascript
// Notificações urgentes (price_drop, expiring_coupon)
await Notification.create({ ...notification, priority: 'high' });
await sendImmediately(notification);

// Notificações normais (new_product)
await Notification.create({ ...notification, priority: 'normal' });
// Cron job envia depois
```

---

### Problema #2: Filtro de Usuários Ineficiente ⚠️ ALTO

#### Situação Atual

```javascript
// backend/src/services/autoSync/publishService.js
async notifyPush(product) {
  const usersToNotify = new Set();
  
  // Query 1: Usuários por categoria
  if (product.category_id) {
    const usersByCategory = await NotificationPreference.findUsersByCategory(product.category_id);
    usersByCategory.forEach(u => usersToNotify.add(u.user_id));
  }
  
  // Query 2: Usuários por palavra-chave (MÚLTIPLAS QUERIES)
  const words = productNameLower.split(/\s+/).filter(w => w.length > 3);
  for (const word of words) {
    const usersByKeyword = await NotificationPreference.findUsersByKeyword(word);
    usersByKeyword.forEach(u => usersToNotify.add(u.user_id));
  }
  
  // Query 3: Usuários por nome de produto
  const usersByProductName = await NotificationPreference.findUsersByProductName(product.name);
  usersByProductName.forEach(u => usersToNotify.add(u.user_id));
  
  // União manual no código
  const uniqueUserIds = Array.from(usersToNotify);
}
```

#### Problemas

1. **Múltiplas Queries ao Banco**
   - 1 query por categoria
   - N queries por palavra-chave (pode ser 5-10)
   - 1 query por nome de produto
   - Total: 7-12 queries por produto!

2. **Filtro Manual no Código**
   ```javascript
   // backend/src/models/NotificationPreference.js
   static async findUsersByKeyword(keyword) {
     // Busca TODOS os usuários
     const { data } = await supabase
       .from('notification_preferences')
       .select('user_id, push_enabled, keyword_preferences')
       .eq('push_enabled', true);
     
     // Filtra no código (INEFICIENTE)
     return data.filter(pref => {
       const keywords = pref.keyword_preferences || [];
       return keywords.some(k => k.toLowerCase().includes(keywordLower));
     });
   }
   ```

3. **Não Usa Índices do Banco**
   - Busca todos os registros
   - Filtra em memória
   - Não aproveita índices JSONB do PostgreSQL

4. **Não Usa Tags do OneSignal**
   - Tags já sincronizadas
   - OneSignal pode fazer o filtro
   - Mais eficiente e escalável

#### Impacto

- 🐌 Lento para produtos com muitas palavras
- 💾 Alto uso de memória
- 📊 Muitas queries ao banco
- ⚡ Não escala bem

#### Solução Proposta

**Opção 1: Usar Segmentação OneSignal (RECOMENDADO)**
```javascript
async notifyPush(product) {
  // Construir filtros OneSignal
  const filters = [];
  
  // Filtro por categoria
  if (product.category_id) {
    filters.push({
      field: "tag",
      key: "categories",
      relation: "contains",
      value: product.category_id.toString()
    });
  }
  
  // Filtro por palavras-chave
  const words = product.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  words.forEach(word => {
    filters.push({
      field: "tag",
      key: "keywords",
      relation: "contains",
      value: word
    });
  });
  
  // Enviar usando filtros (OneSignal faz o trabalho)
  const result = await oneSignalService.sendWithFilters({
    title: '🔥 Nova Promoção!',
    message: `${product.name}`,
    data: { productId: product.id },
    filters: filters
  });
  
  // Sem queries ao banco!
  // Sem filtro manual!
  // OneSignal faz tudo!
}
```

**Opção 2: Query Única Otimizada**
```javascript
// SQL otimizado com índices JSONB
static async findUsersForProduct(product) {
  const { data } = await supabase
    .from('notification_preferences')
    .select('user_id')
    .eq('push_enabled', true)
    .or(`
      category_preferences.cs.{${product.category_id}},
      keyword_preferences.cs.{${words.join(',')}},
      product_name_preferences.cs.{${product.name}}
    `);
  
  return data;
}
```

---

### Problema #3: Sem Rate Limiting ⚠️ MÉDIO

#### Limites da API OneSignal

- **Create Notification:** 30 requests/segundo
- **View Devices:** 10 requests/segundo
- **Edit Device:** 10 requests/segundo

#### Situação Atual

```javascript
// backend/src/services/cron/sendNotifications.js
for (const notification of pendingNotifications) {
  // ❌ Envia sem delay
  const result = await sendWithRetry(notification, user);
}

// Se tiver 100 notificações, envia 100 requests imediatamente
// Pode exceder 30 req/s e ser bloqueado
```

#### Solução Proposta

```javascript
// Rate limiter simples
class RateLimiter {
  constructor(maxPerSecond) {
    this.maxPerSecond = maxPerSecond;
    this.queue = [];
    this.processing = false;
  }
  
  async execute(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }
  
  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const delayMs = 1000 / this.maxPerSecond;
    
    while (this.queue.length > 0) {
      const { fn, resolve, reject } = this.queue.shift();
      
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
      
      if (this.queue.length > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    
    this.processing = false;
  }
}

// Usar
const rateLimiter = new RateLimiter(25); // 25 req/s (margem de segurança)

for (const notification of pendingNotifications) {
  await rateLimiter.execute(() => sendWithRetry(notification, user));
}
```

---

### Problema #4: Sem Validação no Backend ⚠️ MÉDIO

#### Situação Atual

```javascript
// backend/src/services/cron/sendNotifications.js
const result = await oneSignalService.sendToUser({
  external_id: user.id.toString(), // ❌ Sem validação
  title: notification.title, // ❌ Pode estar vazio
  message: notification.message, // ❌ Pode ser muito longo
  data: { ... } // ❌ Sem validação de estrutura
});
```

#### Problemas

1. **Título vazio** → OneSignal rejeita
2. **Mensagem muito longa** → Truncada ou rejeitada
3. **External ID inválido** → Notificação não chega
4. **Dados malformados** → Erro no app

#### Solução Proposta

```javascript
// backend/src/utils/notificationValidator.js
class NotificationValidator {
  static validate(notification) {
    const errors = [];
    
    // Validar external_id
    if (!notification.external_id || notification.external_id === 'null' || notification.external_id === 'undefined') {
      errors.push('external_id inválido');
    }
    
    // Validar título
    if (!notification.title || notification.title.trim().length === 0) {
      errors.push('Título vazio');
    }
    if (notification.title && notification.title.length > 100) {
      errors.push('Título muito longo (max 100 caracteres)');
    }
    
    // Validar mensagem
    if (!notification.message || notification.message.trim().length === 0) {
      errors.push('Mensagem vazia');
    }
    if (notification.message && notification.message.length > 500) {
      errors.push('Mensagem muito longa (max 500 caracteres)');
    }
    
    // Validar dados
    if (notification.data) {
      if (typeof notification.data !== 'object') {
        errors.push('Dados devem ser um objeto');
      }
      if (JSON.stringify(notification.data).length > 2048) {
        errors.push('Dados muito grandes (max 2KB)');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  static sanitize(notification) {
    return {
      external_id: notification.external_id?.toString().trim(),
      title: notification.title?.trim().substring(0, 100),
      message: notification.message?.trim().substring(0, 500),
      data: notification.data || {},
      priority: ['high', 'normal'].includes(notification.priority) ? notification.priority : 'normal'
    };
  }
}

// Usar antes de enviar
const validation = NotificationValidator.validate(notification);
if (!validation.valid) {
  logger.error(`Notificação inválida: ${validation.errors.join(', ')}`);
  return { success: false, errors: validation.errors };
}

const sanitized = NotificationValidator.sanitize(notification);
const result = await oneSignalService.sendToUser(sanitized);
```

---

## 📊 Resumo de Prioridades

### 🔴 Crítico (Fazer Agora)
1. **Envio Imediato** - Notificações atrasadas prejudicam UX

### 🟠 Alto (Fazer em Breve)
2. **Otimizar Filtro** - Performance ruim não escala
3. **Rate Limiting** - Pode ser bloqueado pela API

### 🟡 Médio (Fazer Quando Possível)
4. **Validação** - Previne erros silenciosos

---

## 🎯 Plano de Implementação

### Fase 1: Envio Imediato (1-2 horas)
1. Criar helper `sendNotificationImmediately()`
2. Atualizar `updatePrices.js`
3. Atualizar `checkExpiredCoupons.js`
4. Testar envio imediato

### Fase 2: Otimização (2-3 horas)
1. Implementar `sendWithFilters()` no OneSignal
2. Atualizar `publishService.notifyPush()`
3. Remover queries múltiplas
4. Testar segmentação

### Fase 3: Rate Limiting (1 hora)
1. Criar classe `RateLimiter`
2. Integrar no `sendNotifications.js`
3. Testar com muitas notificações

### Fase 4: Validação (1 hora)
1. Criar `NotificationValidator`
2. Integrar em todos os pontos de envio
3. Adicionar testes

**Total Estimado: 5-7 horas**

---

## 📈 Métricas de Sucesso

### Antes
- ⏰ Notificações atrasam até 1 hora
- 🐌 7-12 queries por produto
- ❌ Sem rate limiting
- ❌ Sem validação

### Depois
- ✅ Notificações instantâneas
- ✅ 0 queries (OneSignal faz filtro)
- ✅ Rate limiting (25 req/s)
- ✅ Validação completa

---

## 🔗 Próxima Ação

Implementar envio imediato em `updatePrices.js` e `checkExpiredCoupons.js`.
