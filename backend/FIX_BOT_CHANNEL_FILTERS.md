# 🐛 FIX: Filtro de Categoria e Content Filter em Bot Channels

## ❌ PROBLEMA IDENTIFICADO

Os filtros de categoria e content_filter configurados no painel admin não estavam sendo respeitados:

1. ✅ **Produtos** iam para TODOS os canais (ignorando category_filter)
2. ✅ **Cupons** iam para TODOS os canais (ignorando category_filter E content_filter)

### Exemplo do Bug:
- Canal "Gamer" configurado para aceitar apenas categoria "Games"
- Produto da categoria "Games" → ✅ Deveria ir só para canal Gamer → ❌ **Foi para TODOS**
- Cupom qualquer → ✅ Deveria respeitar filtro → ❌ **Foi para TODOS**

---

## ✅ CORREÇÃO APLICADA

### Arquivo Modificado:
`backend/src/services/bots/notificationDispatcher.js` (linhas 130-175)

### Mudanças:

#### 1. **Novo Filtro: content_filter** (CRÍTICO!)
```javascript
// Verificar se canal aceita produtos
if (eventType === 'promotion_new' && contentFilter.products === false) {
  logger.debug(`   🚫 Canal ${channel.id} não aceita produtos`);
  continue;
}

// Verificar se canal aceita cupons
if ((eventType === 'coupon_new' || eventType === 'coupon_expired') && contentFilter.coupons === false) {
  logger.debug(`   🚫 Canal ${channel.id} não aceita cupons`);
  continue;
}
```

**O que faz:** 
- Respeita o campo `content_filter` (JSONB) no banco
- Se `content_filter.products = false`, o canal NÃO recebe produtos
- Se `content_filter.coupons = false`, o canal NÃO recebe cupons

---

#### 2. **Filtro de Categoria para Cupons** (NOVO!)
```javascript
// ANTES: Só verificava categoria para produtos
if (eventType === 'promotion_new' && data.category_id) {
  // verificação...
}

// DEPOIS: Verifica categoria para produtos E cupons
if (data.category_id) {
  // verificação para produtos E cupons...
}
```

**O que faz:**
- Cupons agora também respeitam o filtro de categoria
- Se um cupom tem `category_id`, só vai para canais que aceitam aquela categoria

---

## 🎯 COMO FUNCIONA AGORA

### Cenário 1: Canal "Gamer"
**Configuração no Painel Admin:**
```json
{
  "category_filter": ["uuid-da-categoria-games"],
  "content_filter": {
    "products": true,
    "coupons": true
  }
}
```

**Resultado:**
- ✅ Produto "Games" → **VAI** para canal Gamer
- ❌ Produto "Moda" → **NÃO VAI** para canal Gamer
- ✅ Cupom "Games" → **VAI** para canal Gamer
- ❌ Cupom "Moda" → **NÃO VAI** para canal Gamer

---

### Cenário 2: Canal "Só Cupons"
**Configuração:**
```json
{
  "category_filter": [],  // aceita todas categorias
  "content_filter": {
    "products": false,     // NÃO aceita produtos
    "coupons": true        // aceita cupons
  }
}
```

**Resultado:**
- ❌ Qualquer Produto → **NÃO VAI**
- ✅ Qualquer Cupom → **VAI**

---

### Cenário 3: Canal "Moda + Beleza"
**Configuração:**
```json
{
  "category_filter": ["uuid-moda", "uuid-beleza"],
  "content_filter": {
    "products": true,
    "coupons": true
  }
}
```

**Resultado:**
- ✅ Produto "Moda" → **VAI**
- ✅ Produto "Beleza" → **VAI**
- ❌ Produto "Games" → **NÃO VAI**
- ✅ Cupom "Moda" → **VAI**
- ❌ Cupom "Eletrônicos" → **NÃO VAI**

---

## 📊 LOGS DE DEBUG

Agora os logs mostram claramente o que está acontecendo:

```
📊 Canais filtrados: 1/3 passaram na segmentação
   🚫 Canal abc123 não aceita produtos (content_filter.products = false)
   🚫 Canal def456 não aceita categoria xyz para produto (aceita apenas: abc, def)
   ✅ Canal ghi789 aceita categoria xyz para produto
```

---

## 🧪 COMO TESTAR

### 1. Configure um Canal no Painel Admin
```
Nome: Canal Gamer
Categoria: Selecione "Games"
Content Filter: Marque "Produtos" e "Cupons"
```

### 2. Publique um Produto
```
Categoria: Games
```

### 3. Verifique os Logs
```bash
# No terminal do backend
# Deve mostrar:
✅ Canal ghi789 aceita categoria xyz para produto
```

### 4. Publique um Produto de Outra Categoria
```
Categoria: Moda
```

### 5. Verifique os Logs
```bash
# Deve mostrar:
🚫 Canal ghi789 não aceita categoria xyz para produto (aceita apenas: abc)
```

---

## 🔧 CAMPOS NO BANCO DE DADOS

### Tabela: `bot_channels`

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `category_filter` | JSONB | `[]` | Array de UUIDs de categorias aceitas |
| `content_filter` | JSONB | `{"products": true, "coupons": true}` | Controla se aceita produtos e/ou cupons |
| `only_coupons` | BOOLEAN | `false` | LEGADO: Se true, só aceita cupons |

---

## ⚠️ COMPATIBILIDADE

O código mantém compatibilidade com configurações antigas:

- ✅ **only_coupons** (campo legado) ainda funciona
- ✅ Se `category_filter` estiver vazio (`[]`), aceita TODAS as categorias
- ✅ Se `content_filter` não estiver definido, assume valores padrão

---

## 🎉 RESUMO

### Antes:
- ❌ category_filter **ignorado** para cupons
- ❌ content_filter **completamente ignorado**
- ❌ Produtos/cupons iam para **TODOS os canais**

### Depois:
- ✅ category_filter **respeitado** para produtos E cupons
- ✅ content_filter **verificado** corretamente
- ✅ Apenas canais **configurados** recebem mensagens

---

**Data do Fix:** 2026-01-06  
**Arquivo:** `backend/src/services/bots/notificationDispatcher.js`  
**Complexidade:** 8/10 (bug crítico de lógica de negócio)  
**Impacto:** Alto (afeta todas as publicações de produtos e cupons)
