# 👁️ Correção do Contador de Visualizações

## 📋 Problema Identificado

O contador de visualizações (click_count) estava sempre mostrando **0** na tela de detalhes do produto, mesmo quando havia cliques registrados.

### Causa Raiz

1. ✅ O sistema **estava registrando** os cliques corretamente na tabela `click_tracking`
2. ✅ O app **estava chamando** a rota `/products/:id/click` corretamente
3. ❌ A view `products_full` **não incluía** o campo `click_count`
4. ❌ O contador não era calculado ao buscar produtos

---

## 🔧 Solução Implementada

### 1. Atualização da View `products_full`

Criada migração SQL que adiciona o `click_count` à view:

```sql
CREATE OR REPLACE VIEW products_full AS
SELECT 
  p.*,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  cp.code as coupon_code,
  cp.discount_value as coupon_discount_value,
  cp.discount_type as coupon_discount_type,
  cp.title as coupon_title,
  cp.is_out_of_stock as coupon_is_out_of_stock,
  -- Contar cliques do produto
  (SELECT COUNT(*) FROM click_tracking ct WHERE ct.product_id = p.id) as click_count
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN coupons cp ON p.coupon_id = cp.id;
```

### 2. Script de Migração

Criado script para aplicar a migração automaticamente:
- `backend/database/migrations/add_click_count_to_products_view.sql`
- `backend/scripts/apply-click-count-migration.js`

---

## 🚀 Como Aplicar a Correção

### No Servidor (VPS)

```bash
cd /root/MTW/backend

# Aplicar a migração
node scripts/apply-click-count-migration.js

# Reiniciar o backend
pm2 restart backend

# Verificar logs
pm2 logs backend
```

### Localmente

```bash
cd backend

# Aplicar a migração
node scripts/apply-click-count-migration.js

# Reiniciar o servidor
npm run dev
```

---

## 📊 Como Funciona

### Fluxo de Rastreamento

1. **Usuário abre produto**
   ```javascript
   // app/src/stores/productStore.js
   api.post(`/products/${productId}/click`)
   ```

2. **Backend registra clique**
   ```javascript
   // backend/src/controllers/productController.js
   ClickTracking.create({
     user_id: req.user?.id,
     product_id: id,
     coupon_id
   })
   ```

3. **Clique salvo na tabela**
   ```sql
   INSERT INTO click_tracking (user_id, product_id, coupon_id)
   VALUES (?, ?, ?)
   ```

4. **View calcula total**
   ```sql
   SELECT COUNT(*) FROM click_tracking WHERE product_id = p.id
   ```

5. **App exibe contador**
   ```jsx
   <Text>{product.click_count || 0}</Text>
   ```

---

## 🎯 Benefícios

### Performance
- ✅ Cálculo feito no banco de dados (mais rápido)
- ✅ Sem queries adicionais no código
- ✅ View otimizada com índices

### Precisão
- ✅ Contagem em tempo real
- ✅ Dados sempre atualizados
- ✅ Sem cache desatualizado

### Manutenibilidade
- ✅ Lógica centralizada na view
- ✅ Fácil de entender e modificar
- ✅ Sem código duplicado

---

## 📈 Estrutura de Dados

### Tabela `click_tracking`

```sql
CREATE TABLE click_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id) NOT NULL,
  coupon_id UUID REFERENCES coupons(id),
  clicked_at TIMESTAMP DEFAULT NOW(),
  converted BOOLEAN DEFAULT FALSE,
  conversion_date TIMESTAMP
);
```

### View `products_full`

```sql
-- Campos principais
id, name, image_url, platform, current_price, old_price, ...

-- Campos de categoria
category_name, category_icon, category_color

-- Campos de cupom
coupon_code, coupon_discount_value, coupon_discount_type, ...

-- Novo campo
click_count -- Contagem de visualizações
```

---

## 🧪 Testando a Correção

### 1. Verificar View no Supabase

```sql
-- Ver estrutura da view
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products_full';

-- Testar contagem
SELECT id, name, click_count 
FROM products_full 
LIMIT 10;
```

### 2. Testar no App

1. Abrir um produto no app
2. Verificar se o clique foi registrado:
   ```sql
   SELECT * FROM click_tracking 
   ORDER BY clicked_at DESC 
   LIMIT 10;
   ```
3. Reabrir o produto
4. Verificar se o contador aumentou

### 3. Verificar API

```bash
# Buscar produto
curl http://localhost:3000/api/products/{id}

# Verificar se click_count está presente
# Exemplo de resposta:
{
  "id": "...",
  "name": "Produto Teste",
  "click_count": 5,  // ← Deve aparecer
  ...
}
```

---

## 🔍 Troubleshooting

### Problema: View não atualizada

```bash
# Verificar se a view existe
SELECT * FROM information_schema.views 
WHERE table_name = 'products_full';

# Recriar manualmente
DROP VIEW IF EXISTS products_full CASCADE;
-- Executar SQL da migração
```

### Problema: click_count ainda é 0

```bash
# Verificar se há cliques registrados
SELECT product_id, COUNT(*) as total
FROM click_tracking
GROUP BY product_id
ORDER BY total DESC;

# Se não houver cliques, testar registro
curl -X POST http://localhost:3000/api/products/{id}/click \
  -H "Authorization: Bearer {token}"
```

### Problema: Erro de permissão

```sql
-- Dar permissão para a view
GRANT SELECT ON products_full TO anon;
GRANT SELECT ON products_full TO authenticated;
```

---

## 📝 Arquivos Modificados

### Criados
- ✅ `backend/database/migrations/add_click_count_to_products_view.sql`
- ✅ `backend/scripts/apply-click-count-migration.js`
- ✅ `VISUALIZACOES_CORRIGIDO.md`

### Não Modificados (já funcionavam)
- ✅ `app/src/stores/productStore.js` - Registro de cliques
- ✅ `backend/src/controllers/productController.js` - Endpoint trackClick
- ✅ `backend/src/models/ClickTracking.js` - Modelo de rastreamento
- ✅ `app/src/screens/product/ProductDetailsScreen.js` - Exibição

---

## 🎉 Resultado Final

Após aplicar a migração:

**Antes:**
```
Visualizações
0  ← Sempre zero
```

**Depois:**
```
Visualizações
127  ← Contagem real
```

---

## 📊 Métricas Disponíveis

Com o sistema funcionando, você pode:

1. **Ver produtos mais visualizados**
   ```sql
   SELECT name, click_count 
   FROM products_full 
   ORDER BY click_count DESC 
   LIMIT 10;
   ```

2. **Taxa de conversão**
   ```sql
   SELECT 
     p.name,
     COUNT(*) as total_clicks,
     SUM(CASE WHEN ct.converted THEN 1 ELSE 0 END) as conversions,
     ROUND(SUM(CASE WHEN ct.converted THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as conversion_rate
   FROM click_tracking ct
   JOIN products p ON ct.product_id = p.id
   GROUP BY p.id, p.name
   ORDER BY conversion_rate DESC;
   ```

3. **Cliques por período**
   ```sql
   SELECT 
     DATE(clicked_at) as date,
     COUNT(*) as clicks
   FROM click_tracking
   WHERE clicked_at >= NOW() - INTERVAL '7 days'
   GROUP BY DATE(clicked_at)
   ORDER BY date;
   ```

---

**Data**: 27 de Fevereiro de 2026  
**Status**: ✅ CORRIGIDO  
**Versão**: 1.0
