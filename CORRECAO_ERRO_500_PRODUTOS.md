# 🔧 Correção de Erro 500 ao Buscar Produtos

## 📅 Data: 26/02/2026

## ❌ Problema

Backend retornando erro 500 para todas as requisições de produtos:
```
GET /api/products?page=284&limit=20 HTTP/1.1" 500
GET /api/products?page=285&limit=20 HTTP/1.1" 500
...
```

Logs mostravam apenas `Error: {` sem detalhes do erro.

## 🔍 Investigação

1. **Controller**: Método `list()` não tinha logs
2. **Model**: Método `findAll()` não tinha tratamento de erro detalhado
3. **ErrorHandler**: Logs não mostravam detalhes completos do erro

## ✅ Correções Aplicadas

### 1. ProductController.js
```javascript
// ANTES
static async list(req, res, next) {
  try {
    const result = await Product.findAll(req.query);
    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

// DEPOIS
static async list(req, res, next) {
  try {
    logger.info(`📦 Buscando produtos - Página: ${req.query.page || 1}, Limit: ${req.query.limit || 20}`);
    const result = await Product.findAll(req.query);
    logger.info(`✅ ${result.products?.length || 0} produtos encontrados`);
    res.json(successResponse(result));
  } catch (error) {
    logger.error(`❌ Erro ao listar produtos: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    next(error);
  }
}
```

### 2. Product.js - findAll()

**Adicionado try-catch geral**:
```javascript
static async findAll(filters = {}) {
  try {
    // ... código existente ...
  } catch (error) {
    logger.error(`❌ Erro crítico em Product.findAll: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    throw error;
  }
}
```

**Logs de debug**:
```javascript
logger.debug(`🔍 Product.findAll - Filtros: ${JSON.stringify({ page, limit, category, platform, status })}`);
```

**Tratamento de erro na query**:
```javascript
const { data, error, count } = await query;

if (error) {
  logger.error(`❌ Erro na query do Supabase: ${error.message}`);
  logger.error(`Detalhes: ${JSON.stringify(error)}`);
  throw error;
}

logger.debug(`✅ Query executada - ${count} produtos encontrados`);
```

**Try-catch individual por produto**:
```javascript
const productsWithFinalPrice = await Promise.all(
  (data || []).map(async (product) => {
    try {
      // ... processamento do produto ...
      return enrichedProduct;
    } catch (productError) {
      logger.error(`❌ Erro ao processar produto ${product.id}: ${productError.message}`);
      // Retornar produto sem processamento de cupom em caso de erro
      return {
        ...product,
        coupons: [],
        final_price: parseFloat(product.current_price) || 0,
        price_with_coupon: parseFloat(product.current_price) || 0
      };
    }
  })
);
```

### 3. errorHandler.js

**Logs mais detalhados**:
```javascript
export const errorHandler = (err, req, res, next) => {
  // Log detalhado do erro
  logger.error(`❌ Error: ${err.message}`);
  logger.error(`📍 URL: ${req.method} ${req.url}`);
  logger.error(`🔍 Stack: ${err.stack}`);
  
  // Log adicional do objeto de erro completo em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    logger.error(`📦 Erro completo: ${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}`);
  }
  
  // ... resto do código ...
}
```

## 🧪 Como Testar

### 1. Reiniciar Backend
```bash
# Se estiver usando PM2
pm2 restart backend

# Se estiver rodando diretamente
# Ctrl+C para parar
cd backend
npm start
```

### 2. Verificar Logs
```bash
# Acompanhar logs em tempo real
pm2 logs backend

# OU se rodando diretamente
# Verificar terminal onde backend está rodando
```

### 3. Testar Requisição
```bash
# Teste manual
curl http://localhost:3000/api/products?page=1&limit=20

# OU abrir no navegador
http://localhost:3000/api/products?page=1&limit=20
```

### 4. Verificar App Mobile
```bash
# Recarregar app
# Pressionar Ctrl+R (Android) ou Cmd+R (iOS)
```

## 📊 Logs Esperados

### Sucesso
```
2026-02-26 22:10:00 info: 📦 Buscando produtos - Página: 1, Limit: 20
2026-02-26 22:10:00 debug: 🔍 Product.findAll - Filtros: {"page":1,"limit":20}
2026-02-26 22:10:00 debug: ✅ Query executada - 150 produtos encontrados
2026-02-26 22:10:00 debug: 📋 5 cupons ativos encontrados
2026-02-26 22:10:00 info: ✅ 20 produtos encontrados
2026-02-26 22:10:00 info: ::1 - - [27/Feb/2026:01:10:00 +0000] "GET /api/products?page=1&limit=20 HTTP/1.1" 200
```

### Erro (agora com detalhes)
```
2026-02-26 22:10:00 info: 📦 Buscando produtos - Página: 1, Limit: 20
2026-02-26 22:10:00 debug: 🔍 Product.findAll - Filtros: {"page":1,"limit":20}
2026-02-26 22:10:00 error: ❌ Erro na query do Supabase: relation "products_full" does not exist
2026-02-26 22:10:00 error: Detalhes: {"code":"42P01","message":"relation \"products_full\" does not exist"}
2026-02-26 22:10:00 error: ❌ Erro crítico em Product.findAll: relation "products_full" does not exist
2026-02-26 22:10:00 error: Stack: Error: relation "products_full" does not exist
    at Product.findAll (...)
2026-02-26 22:10:00 error: ❌ Erro ao listar produtos: relation "products_full" does not exist
2026-02-26 22:10:00 error: 📍 URL: GET /api/products?page=1&limit=20
2026-02-26 22:10:00 error: 🔍 Stack: Error: relation "products_full" does not exist
```

## 🎯 Possíveis Causas do Erro 500

### 1. View products_full não existe
```sql
-- Verificar se a view existe
SELECT * FROM information_schema.views 
WHERE table_name = 'products_full';

-- Se não existir, criar a view
-- (verificar migrations para SQL correto)
```

### 2. Erro ao buscar cupons
```javascript
// Verificar se Coupon.findActiveApplicable() funciona
const Coupon = (await import('./Coupon.js')).default;
const coupons = await Coupon.findActiveApplicable();
console.log('Cupons:', coupons.length);
```

### 3. Erro ao processar produtos
```javascript
// Verificar se há produtos com dados inválidos
// Ex: current_price null, coupon_id inválido, etc.
```

## 📝 Próximos Passos

1. ✅ Reiniciar backend
2. ⏳ Verificar logs detalhados
3. ⏳ Identificar causa raiz do erro 500
4. ⏳ Corrigir problema específico
5. ⏳ Testar app mobile

## 🔗 Arquivos Modificados

- `backend/src/controllers/productController.js`
- `backend/src/models/Product.js`
- `backend/src/middleware/errorHandler.js`

---

**Status**: ✅ Logs melhorados - Aguardando reinício do backend para diagnóstico
**Última Atualização**: 26/02/2026 22:10
