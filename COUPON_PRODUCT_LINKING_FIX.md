# Correção: Vinculação de Cupons e Produtos

## Problemas Identificados e Corrigidos

### 1. ✅ Produtor não vinculado ao cupom após aprovação em /pending-products

**Problema:** Quando aprovava um produto com cupom em `/pending-products`, o cupom era vinculado ao produto via `coupon_id`, mas o produto não era adicionado ao array `applicable_products` do cupom. Isso causava inconsistência quando o cupom tinha `is_general=false`.

**Solução Implementada:**
- **Arquivo:** `backend/src/controllers/productController.js`
- **Função:** `approve()`
- **Mudança:** Após vincular o cupom ao produto, se o cupom não for geral (`is_general=false`), o produto é automaticamente adicionado ao array `applicable_products` do cupom.

```javascript
// CORREÇÃO: Adicionar produto ao array applicable_products do cupom se não for geral
if (!coupon.is_general) {
  const applicableProducts = coupon.applicable_products || [];
  if (!applicableProducts.includes(id)) {
    applicableProducts.push(id);
    await Coupon.update(coupon_id, { applicable_products: applicableProducts });
    logger.info(`✅ Produto ${id} adicionado ao array applicable_products do cupom ${coupon.code}`);
  }
}
```

### 2. ✅ Cupom mostra "para todos os produtos" no app

**Problema:** Na tela de detalhes do cupom (`CouponDetailsScreen.js`), não havia indicação visual se o cupom era válido para todos os produtos ou apenas para produtos selecionados.

**Solução Implementada:**
- **Arquivo:** `app/src/screens/coupon/CouponDetailsScreen.js`
- **Mudança:** Adicionado um novo indicador visual que mostra:
  - "Válido para todos os produtos da [Plataforma]" quando `is_general=true` ou `is_general=null` (padrão)
  - "Válido para produtos selecionados" quando `is_general=false` (explicitamente definido)

**Importante:** O campo `is_general` pode ter 3 valores:
- `true` = cupom válido para todos os produtos da plataforma
- `false` = cupom válido apenas para produtos selecionados
- `null` = comportamento padrão (tratado como `true`)

```javascript
{/* CORREÇÃO: Indicador de aplicabilidade do cupom */}
<View style={s.conditionRow}>
  <Ionicons 
    name={coupon.is_general === false ? "pricetag-outline" : "globe-outline"} 
    size={16} 
    color="#9CA3AF" 
  />
  <Text style={s.conditionText}>
    {coupon.is_general === false
      ? 'Válido para produtos selecionados'
      : `Válido para todos os produtos ${coupon.platform !== 'general' ? `da ${getPlatformName(coupon.platform)}` : ''}`}
  </Text>
</View>
```

### 3. ✅ Republicação não vincula cupom ao produto

**Problema:** Na página `/products`, ao republicar um produto, o cupom não era vinculado corretamente porque faltava a mesma lógica de adicionar o produto ao `applicable_products` do cupom.

**Solução Implementada:**
- **Arquivo:** `backend/src/controllers/productController.js`
- **Função:** `republish()`
- **Mudança:** 
  1. Ao vincular um cupom na republicação, o produto é adicionado ao `applicable_products` do cupom (se não for geral)
  2. Ao remover um cupom, o produto é removido do `applicable_products` do cupom anterior

```javascript
// CORREÇÃO: Adicionar produto ao array applicable_products do cupom se não for geral
if (!coupon.is_general) {
  const applicableProducts = coupon.applicable_products || [];
  if (!applicableProducts.includes(id)) {
    applicableProducts.push(id);
    await Coupon.update(coupon_id, { applicable_products: applicableProducts });
    logger.info(`✅ Produto ${id} adicionado ao array applicable_products do cupom ${coupon.code}`);
  }
}

// CORREÇÃO: Remover produto do array applicable_products do cupom anterior se existir
if (product.coupon_id) {
  try {
    const oldCoupon = await Coupon.findById(product.coupon_id);
    if (oldCoupon && oldCoupon.applicable_products) {
      const applicableProducts = oldCoupon.applicable_products.filter(pid => pid !== id);
      await Coupon.update(product.coupon_id, { applicable_products: applicableProducts });
      logger.info(`✅ Produto ${id} removido do array applicable_products do cupom anterior`);
    }
  } catch (e) {
    logger.warn(`⚠️ Erro ao remover produto do cupom anterior: ${e.message}`);
  }
}
```

## Fluxo de Vinculação Atualizado

### Aprovação de Produto Pendente
1. Admin seleciona cupom em `/pending-products`
2. Backend vincula cupom ao produto via `coupon_id`
3. **NOVO:** Se cupom não for geral, produto é adicionado ao `applicable_products` do cupom
4. Produto é publicado com cupom vinculado
5. App mostra produto vinculado ao cupom corretamente

### Republicação de Produto
1. Admin seleciona cupom em `/products` (dialog de republicação)
2. Backend atualiza `coupon_id` do produto
3. **NOVO:** Se cupom não for geral, produto é adicionado ao `applicable_products` do cupom
4. **NOVO:** Se havia cupom anterior, produto é removido do `applicable_products` do cupom antigo
5. Produto é republicado com novo cupom vinculado

### Visualização no App
1. Usuário abre detalhes do cupom
2. **NOVO:** App mostra se cupom é "para todos" ou "para produtos selecionados"
3. Se houver produtos vinculados, mostra botão "Ver X produtos vinculados"
4. Ao clicar, lista produtos corretamente

## Estrutura de Dados

### Tabela `coupons`
- `coupon_id` (UUID) - Vinculação direta 1-para-1
- `is_general` (boolean) - Se true, válido para todos da plataforma
- `applicable_products` (UUID[]) - Array de IDs de produtos específicos

### Tabela `products`
- `coupon_id` (UUID FK) - Cupom vinculado diretamente

### Lógica de Busca
O app busca produtos de um cupom considerando:
1. Produtos com `coupon_id` = cupom.id (vinculação direta)
2. Produtos no array `coupon.applicable_products` (vinculação indireta)
3. Se `is_general=true`, todos os produtos da mesma plataforma

## Testes Recomendados

1. **Aprovar produto com cupom não-geral:**
   - Verificar se produto aparece em "Ver produtos vinculados" do cupom
   - Verificar se `applicable_products` do cupom contém o ID do produto

2. **Republicar produto com novo cupom:**
   - Verificar se produto é removido do cupom anterior
   - Verificar se produto é adicionado ao novo cupom
   - Verificar se app mostra vinculação correta

3. **Visualizar cupom no app:**
   - Cupom geral deve mostrar "Válido para todos os produtos da [Plataforma]"
   - Cupom específico deve mostrar "Válido para produtos selecionados"
   - Botão "Ver X produtos vinculados" deve funcionar corretamente

## Arquivos Modificados

1. `backend/src/controllers/productController.js` - Funções `approve()` e `republish()`
2. `app/src/screens/coupon/CouponDetailsScreen.js` - Adicionado indicador de aplicabilidade
3. `backend/src/services/bots/templateRenderer.js` - Corrigida lógica de `is_general`
4. `backend/src/services/autoSync/publishService.js` - Corrigida lógica de `is_general`
5. `backend/src/controllers/couponController.js` - Corrigida lógica de `is_general`
6. `backend/src/services/adminBot/handlers/couponManagementHandler.js` - Corrigida exibição
7. `backend/src/services/whatsappWeb/handlers/whatsappCouponManagementHandler.js` - Corrigida exibição

## Sincronização 100% do Campo `is_general`

Todos os arquivos agora usam a mesma lógica padronizada:
- `is_general === false` → Produtos selecionados
- `is_general === true` ou `null` → Todos os produtos

Veja detalhes completos em: `COUPON_IS_GENERAL_SYNC_FIX.md`

## Observações

- A página `/products` já tinha o seletor de cupom no dialog de republicação, então não foi necessário modificar o frontend do admin-panel
- A lógica mantém compatibilidade com cupons gerais (`is_general=true`) que não precisam de `applicable_products`
- Logs detalhados foram mantidos para facilitar debugging
