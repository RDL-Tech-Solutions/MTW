# Sincronização 100% do Campo `is_general` em Cupons

## Problema Identificado

O campo `is_general` nos cupons pode ter 3 valores possíveis:
- `true` = cupom válido para todos os produtos da plataforma
- `false` = cupom válido apenas para produtos selecionados
- `null` = comportamento padrão (deve ser tratado como `true`)

Havia inconsistências em como esse campo era verificado em diferentes partes do código, causando exibições incorretas no app, admin-panel e bots.

## Regra de Padronização

**Regra única para todo o projeto:**
```javascript
// Para verificar se é cupom GERAL (todos os produtos):
if (coupon.is_general === true || coupon.is_general === null) {
  // Cupom para TODOS os produtos
}

// Para verificar se é cupom ESPECÍFICO (produtos selecionados):
if (coupon.is_general === false) {
  // Cupom para PRODUTOS SELECIONADOS
}
```

## Arquivos Corrigidos

### 1. App Mobile (`app/src/screens/coupon/CouponDetailsScreen.js`)
**Antes:**
```javascript
{coupon.is_general 
  ? 'Válido para todos os produtos'
  : 'Válido para produtos selecionados'}
```

**Depois:**
```javascript
{coupon.is_general === false
  ? 'Válido para produtos selecionados'
  : `Válido para todos os produtos ${coupon.platform !== 'general' ? `da ${getPlatformName(coupon.platform)}` : ''}`}
```

### 2. Backend - Template Renderer (`backend/src/services/bots/templateRenderer.js`)
**Antes:**
```javascript
if (coupon.is_general === true) {
  applicability = '✅ **Válido para todos os produtos**';
} else if (coupon.is_general === false && coupon.applicable_products?.length > 0) {
  // ...
}
```

**Depois:**
```javascript
if (coupon.is_general === true || coupon.is_general === null) {
  applicability = '✅ **Válido para todos os produtos**';
} else if (coupon.is_general === false && coupon.applicable_products?.length > 0) {
  // ...
}
```

### 3. Backend - Publish Service (`backend/src/services/autoSync/publishService.js`)
**Antes:**
```javascript
if (coupon.is_general) {
  message += `✅ *Válido para todos os produtos*\n`;
} else {
  // ...
}
```

**Depois:**
```javascript
if (coupon.is_general === false) {
  message += `🎯 *Válido para produtos selecionados*\n`;
} else {
  message += `✅ *Válido para todos os produtos*\n`;
}
```

### 4. Backend - Coupon Controller (`backend/src/controllers/couponController.js`)
**Antes:**
```javascript
if (coupon.is_general) {
  // Se for cupom geral...
}
```

**Depois:**
```javascript
if (coupon.is_general === true || coupon.is_general === null) {
  // Se for cupom geral...
}
```

### 5. Backend - Admin Bot Handler (`backend/src/services/adminBot/handlers/couponManagementHandler.js`)
**Antes:**
```javascript
`🎯 *Aplicabilidade:* ${coupon.is_general ? 'Todos os produtos' : 'Produtos selecionados'}\n`
```

**Depois:**
```javascript
`🎯 *Aplicabilidade:* ${coupon.is_general === false ? 'Produtos selecionados' : 'Todos os produtos'}\n`
```

### 6. Backend - WhatsApp Handler (`backend/src/services/whatsappWeb/handlers/whatsappCouponManagementHandler.js`)
**Antes:**
```javascript
`🎯 *Aplicabilidade:* ${coupon.is_general ? 'Todos os produtos' : 'Produtos selecionados'}\n`
```

**Depois:**
```javascript
`🎯 *Aplicabilidade:* ${coupon.is_general === false ? 'Produtos selecionados' : 'Todos os produtos'}\n`
```

## Comportamento Esperado Após Correção

### Cupom com `is_general = true`
- **App:** "Válido para todos os produtos da [Plataforma]"
- **Bot Telegram:** "✅ **Válido para todos os produtos**"
- **Bot WhatsApp:** "✅ *Válido para todos os produtos*"
- **Admin Panel:** Mostra "Todos os Produtos"

### Cupom com `is_general = false`
- **App:** "Válido para produtos selecionados"
- **Bot Telegram:** "📦 **Em produtos selecionados** (X produtos)"
- **Bot WhatsApp:** "🎯 *Válido para produtos selecionados*"
- **Admin Panel:** Mostra "Produtos Selecionados"

### Cupom com `is_general = null`
- **Tratado como `true`** (comportamento padrão)
- **App:** "Válido para todos os produtos da [Plataforma]"
- **Bot Telegram:** "✅ **Válido para todos os produtos**"
- **Bot WhatsApp:** "✅ *Válido para todos os produtos*"
- **Admin Panel:** Mostra "Não Especificado" ou "Todos os Produtos"

## Lógica de Vinculação de Produtos

Quando um cupom é criado ou um produto é aprovado:

1. **Se `is_general = true` ou `null`:**
   - Cupom se aplica a TODOS os produtos da plataforma
   - Não precisa adicionar ao `applicable_products`

2. **Se `is_general = false`:**
   - Cupom se aplica apenas a produtos específicos
   - Produto DEVE ser adicionado ao array `applicable_products` do cupom
   - Isso é feito automaticamente em:
     - `ProductController.approve()` - ao aprovar produto pendente
     - `ProductController.republish()` - ao republicar produto

## Testes Recomendados

1. **Criar cupom geral (`is_general = true`):**
   - Verificar se mostra "Todos os produtos" em todos os lugares
   - Verificar se não adiciona produtos ao `applicable_products`

2. **Criar cupom específico (`is_general = false`):**
   - Verificar se mostra "Produtos selecionados" em todos os lugares
   - Ao aprovar produto com esse cupom, verificar se produto é adicionado ao `applicable_products`

3. **Cupom antigo com `is_general = null`:**
   - Verificar se é tratado como "Todos os produtos"
   - Verificar se não quebra nenhuma funcionalidade

## Arquivos Não Modificados (Já Corretos)

- `backend/src/models/Coupon.js` - Modelo já trata `null` corretamente
- `backend/src/models/Product.js` - Lógica de aplicação de cupom já usa comparação estrita
- `admin-panel/src/pages/Coupons.jsx` - Interface já permite selecionar os 3 estados

## Resumo

Todos os arquivos que exibem ou verificam `is_general` agora usam comparação estrita:
- `=== false` para produtos selecionados
- `=== true || === null` para todos os produtos

Isso garante 100% de sincronização entre app, admin-panel, bots e backend.
