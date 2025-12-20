# Migração da API Shopee para GraphQL (Afiliados)

## 📋 Resumo

A integração com a Shopee foi **completamente reescrita** para usar a **API GraphQL de Afiliados** oficial da Shopee Brasil, conforme documentação em: https://www.affiliateshopee.com.br/documentacao

## ✅ Status: FUNCIONAL

**Todos os testes passaram (4/4):**
- ✅ `shopeeOfferV2` - Lista de ofertas
- ✅ `productOffer` - Ofertas de produtos  
- ✅ `generateShortLink` - Gerar links curtos
- ✅ `getOffers` (compatibilidade) - Buscar ofertas

## 🔄 Mudanças Principais

### 1. Endpoint e Protocolo
- **Antes:** REST API (`https://partner.shopeemobile.com/api/v2`)
- **Agora:** GraphQL (`https://open-api.affiliate.shopee.com.br/graphql`)

### 2. Autenticação
- **Antes:** `partner_id + path + timestamp + sign` (HMAC-SHA256)
- **Agora:** Header `Authorization: SHA256 Credential={AppId}, Timestamp={Timestamp}, Signature={SHA256(AppId+Timestamp+Payload+Secret)}`

### 3. Método de Requisição
- **Antes:** GET com parâmetros na query string
- **Agora:** POST com body JSON (GraphQL)

### 4. Estrutura de Dados
- **Antes:** REST endpoints específicos (`/product/get_item_list`, etc.)
- **Agora:** Queries GraphQL (`shopeeOfferV2`, `shopOfferV2`, `productOffer`)

## 📝 Queries Disponíveis

### `shopeeOfferV2`
Buscar ofertas gerais da Shopee
```javascript
await shopeeService.getShopeeOffers({
  keyword: 'notebook',
  sortType: 1, // 1: Mais recentes, 2: Maior comissão
  page: 1,
  limit: 50
});
```

### `shopOfferV2`
Buscar ofertas de lojas específicas
```javascript
await shopeeService.getShopOffers({
  shopId: 123456,
  keyword: 'eletrônicos',
  sortType: 1,
  page: 1,
  limit: 50
});
```

### `productOffer`
Buscar ofertas de produtos (usa `shopeeOfferV2` internamente)
```javascript
await shopeeService.getProductOffers({
  keyword: 'smartphone',
  page: 1,
  limit: 50
});
```

### `generateShortLink` (Mutation)
Gerar link curto com rastreamento
```javascript
const shortLink = await shopeeService.generateShortLink(
  'https://shopee.com.br/product/123456',
  ['campanha1', 'banner2']
);
```

### `conversionReport`
Relatório de conversão
```javascript
await shopeeService.getConversionReport({
  startTime: 1577836800,
  endTime: 1609459200,
  shopId: 123456,
  page: 1,
  limit: 50
});
```

### `validatedReport`
Relatório validado (comissões confirmadas)
```javascript
await shopeeService.getValidatedReport({
  startTime: 1577836800,
  endTime: 1609459200,
  scrollId: null // Usado para paginação
});
```

## 🔧 Métodos de Compatibilidade

Para manter compatibilidade com código existente, os seguintes métodos foram mantidos:

- `getOffers(categoryId, limit)` - Retorna formato antigo
- `searchProducts(keyword, limit, offset)` - Busca produtos
- `createAffiliateLink(url)` - Gera link de afiliado
- `getPromotionProducts(limit)` - Produtos em promoção
- `getTopProducts(categoryId, limit)` - Produtos mais vendidos
- `getProductDetails(itemId)` - Detalhes do produto (limitado)

## ⚠️ Limitações da API de Afiliados

1. **Não busca produtos individuais diretamente**
   - A API retorna ofertas (coleções/categorias), não produtos específicos
   - Para produtos individuais, use `shopeeOfferV2` e filtre por `offerType`

2. **Preços não disponíveis diretamente**
   - A API de afiliados não retorna preços de produtos
   - Use scraping ou outras fontes para obter preços

3. **Sem endpoint de detalhes de produto**
   - `getProductDetails()` usa busca nas ofertas como fallback
   - Informações limitadas comparado à API Partner

## 📊 Estrutura de Resposta

### shopeeOfferV2 / shopOfferV2
```javascript
{
  nodes: [
    {
      commissionRate: "0.03", // 3%
      imageUrl: "https://...",
      offerLink: "https://s.shopee.com.br/...", // Link com tracking
      originalLink: "https://shopee.com.br/...",
      offerName: "Nome da Oferta",
      offerType: 1, // 1: Collection, 2: Category
      categoryId: 123,
      collectionId: 456,
      periodStartTime: 1577836800,
      periodEndTime: 1609459200
    }
  ],
  pageInfo: {
    hasNextPage: true
  }
}
```

## 🔐 Configuração

As credenciais continuam sendo salvas no banco de dados:
- `app_settings.shopee_partner_id` → **AppID**
- `app_settings.shopee_partner_key` → **Secret**

O sistema automaticamente:
1. Carrega do banco de dados (prioridade)
2. Usa `.env` como fallback
3. Valida antes de cada requisição

## 🧪 Testes

Execute o script de teste:
```bash
cd backend
node scripts/test-shopee-graphql.js
```

## 📚 Documentação Oficial

- **API Playground:** https://www.affiliateshopee.com.br/
- **Documentação:** https://www.affiliateshopee.com.br/documentacao
- **Documentação Oficial Shopee:** affiliate.shopee.com.br/open_api

## ✅ Checklist de Migração

- [x] Reescrita completa do `shopeeService.js`
- [x] Implementação de autenticação GraphQL
- [x] Queries principais implementadas
- [x] Métodos de compatibilidade mantidos
- [x] Testes funcionando (4/4)
- [x] Logs detalhados implementados
- [x] Tratamento de erros melhorado

## 🎯 Próximos Passos

1. Testar integração com código existente (`shopeeSync.js`, etc.)
2. Ajustar métodos que dependem de preços (podem precisar de scraping)
3. Implementar cache para ofertas frequentes
4. Adicionar retry logic para requisições falhadas




