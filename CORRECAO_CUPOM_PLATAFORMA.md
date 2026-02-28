# Correção: Cupons Gerais Respeitando Plataforma

## 🐛 Problema Identificado

Cupons marcados como "para todos os produtos" (`is_general = true`) estavam sendo vinculados a **TODOS os produtos do sistema**, independente da plataforma.

### Exemplo do Problema:
- Cupom: `SHOPEE50` (Shopee, is_general = true)
- ❌ Estava aparecendo para produtos da Amazon, Mercado Livre, etc.
- ✅ Deveria aparecer apenas para produtos da Shopee

---

## 🔍 Causa Raiz

A função `findForProduct` no modelo `Coupon.js` não estava verificando a plataforma do produto ao buscar cupons gerais.

### Código Anterior (Incorreto):

```javascript
static async findForProduct(productId) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('is_active', true)
    .lte('valid_from', now)
    .gte('valid_until', now)
    .or(`is_general.eq.true,applicable_products.cs.["${productId}"]`);
    //  ^^^^^^^^^^^^^^^^^ PROBLEMA: Retorna TODOS os cupons gerais

  if (error) throw error;
  return data;
}
```

**Problema:** A query `.or('is_general.eq.true,applicable_products.cs.["${productId}"]')` retorna:
- Todos os cupons com `is_general = true` (sem filtrar por plataforma)
- OU cupons que têm o produto na lista `applicable_products`

---

## ✅ Solução Implementada

Modificada a função `findForProduct` para:
1. Buscar o produto primeiro para obter sua plataforma
2. Filtrar cupons gerais pela plataforma do produto
3. Incluir cupons com o produto em `applicable_products`

### Código Corrigido:

```javascript
static async findForProduct(productId) {
  const now = new Date().toISOString();

  // 1. Buscar o produto para obter sua plataforma
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('platform')
    .eq('id', productId)
    .single();

  if (productError) {
    logger.error('Erro ao buscar produto para filtrar cupons:', productError);
    throw productError;
  }

  if (!product) {
    return [];
  }

  const productPlatform = product.platform;

  // 2. Buscar todos os cupons ativos e válidos
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('is_active', true)
    .lte('valid_from', now)
    .gte('valid_until', now);

  if (error) throw error;

  // 3. Filtrar manualmente para garantir a lógica correta
  const filteredCoupons = (data || []).filter(coupon => {
    // Cupom diretamente vinculado ao produto via applicable_products
    if (coupon.applicable_products && coupon.applicable_products.includes(productId)) {
      return true;
    }

    // Cupom geral: deve ser da mesma plataforma ou plataforma 'general'
    if (coupon.is_general === true) {
      return coupon.platform === 'general' || coupon.platform === productPlatform;
    }

    return false;
  });

  return filteredCoupons;
}
```

---

## 🎯 Lógica de Vinculação

Um cupom é aplicável a um produto quando:

### 1. Cupom Específico (is_general = false)
- Produto está na lista `applicable_products` do cupom

### 2. Cupom Geral (is_general = true)
- **Plataforma do cupom = 'general'** (cupom universal)
  - ✅ Aplica-se a produtos de qualquer plataforma
- **Plataforma do cupom = plataforma do produto**
  - ✅ Cupom Shopee → Produtos Shopee
  - ✅ Cupom Amazon → Produtos Amazon
  - ❌ Cupom Shopee → Produtos Amazon

---

## 📊 Exemplos de Uso

### Exemplo 1: Cupom Geral da Shopee
```json
{
  "code": "SHOPEE50",
  "platform": "shopee",
  "is_general": true,
  "discount_value": 50
}
```

**Produtos aplicáveis:**
- ✅ Produto A (Shopee)
- ✅ Produto B (Shopee)
- ❌ Produto C (Amazon)
- ❌ Produto D (Mercado Livre)

### Exemplo 2: Cupom Universal
```json
{
  "code": "UNIVERSAL10",
  "platform": "general",
  "is_general": true,
  "discount_value": 10
}
```

**Produtos aplicáveis:**
- ✅ Produto A (Shopee)
- ✅ Produto B (Amazon)
- ✅ Produto C (Mercado Livre)
- ✅ Produto D (AliExpress)

### Exemplo 3: Cupom Específico
```json
{
  "code": "PRODUTO123",
  "platform": "amazon",
  "is_general": false,
  "applicable_products": ["uuid-produto-1", "uuid-produto-2"]
}
```

**Produtos aplicáveis:**
- ✅ Produto 1 (uuid-produto-1)
- ✅ Produto 2 (uuid-produto-2)
- ❌ Outros produtos

---

## 🔄 Impacto da Correção

### Antes da Correção:
```
Cupom: SHOPEE50 (Shopee, is_general=true)
├─ ✅ Produto Shopee 1
├─ ✅ Produto Shopee 2
├─ ❌ Produto Amazon 1    ← INCORRETO
├─ ❌ Produto Amazon 2    ← INCORRETO
└─ ❌ Produto ML 1        ← INCORRETO
```

### Depois da Correção:
```
Cupom: SHOPEE50 (Shopee, is_general=true)
├─ ✅ Produto Shopee 1
├─ ✅ Produto Shopee 2
├─ ❌ Produto Amazon 1    ← CORRETO
├─ ❌ Produto Amazon 2    ← CORRETO
└─ ❌ Produto ML 1        ← CORRETO
```

---

## 🧪 Como Testar

### 1. Criar Cupom Geral da Shopee
```bash
# Via Admin Panel
1. Cupons → Novo Cupom
2. Código: TESTE_SHOPEE
3. Plataforma: Shopee
4. Aplicabilidade: Todos os Produtos
5. Salvar
```

### 2. Verificar no App
```bash
# Abrir app mobile
1. Ir em Produtos
2. Abrir produto da Shopee
   ✅ Deve mostrar cupom TESTE_SHOPEE
3. Abrir produto da Amazon
   ❌ NÃO deve mostrar cupom TESTE_SHOPEE
```

### 3. Testar API
```bash
# Buscar cupons para produto Shopee
GET /api/products/{id-produto-shopee}

# Resposta deve incluir:
{
  "applicable_coupons": [
    {
      "code": "TESTE_SHOPEE",
      "platform": "shopee"
    }
  ]
}

# Buscar cupons para produto Amazon
GET /api/products/{id-produto-amazon}

# Resposta NÃO deve incluir TESTE_SHOPEE
{
  "applicable_coupons": []
}
```

---

## 📝 Arquivos Modificados

### Backend
- `backend/src/models/Coupon.js`
  - Função `findForProduct()` reescrita

### Nenhuma alteração necessária em:
- ✅ `backend/src/models/Product.js` (já estava correto)
- ✅ `backend/src/controllers/couponController.js` (já estava correto)
- ✅ Admin Panel (sem alterações)
- ✅ App Mobile (sem alterações)

---

## ⚠️ Notas Importantes

1. **Performance:** A função agora faz uma query adicional para buscar o produto, mas isso é necessário para garantir a correção da lógica.

2. **Cache:** Se houver cache de cupons, pode ser necessário limpar após a atualização.

3. **Retrocompatibilidade:** A correção não afeta cupons existentes, apenas corrige o comportamento de vinculação.

4. **Plataforma 'general':** Cupons com `platform = 'general'` continuam funcionando para todos os produtos (comportamento esperado).

---

## 🚀 Deploy

### 1. Atualizar Backend
```bash
cd backend
git pull
npm install  # se houver novas dependências
pm2 restart backend  # ou npm run dev
```

### 2. Verificar Logs
```bash
# Verificar se não há erros
tail -f backend/logs/app.log
```

### 3. Testar
- Criar cupom de teste
- Verificar vinculação no app
- Confirmar que funciona corretamente

---

## ✅ Checklist de Validação

- [ ] Backend atualizado
- [ ] Função `findForProduct` modificada
- [ ] Logs sem erros
- [ ] Cupom geral Shopee só aparece em produtos Shopee
- [ ] Cupom geral Amazon só aparece em produtos Amazon
- [ ] Cupom universal (platform='general') aparece em todos
- [ ] Cupons específicos continuam funcionando
- [ ] App mobile exibe cupons corretamente

---

## 🎉 Resultado

Cupons gerais agora respeitam a plataforma do produto, garantindo que:
- Cupons da Shopee só aparecem em produtos da Shopee
- Cupons da Amazon só aparecem em produtos da Amazon
- Cupons universais (platform='general') aparecem em todos os produtos
- A experiência do usuário é mais consistente e correta
