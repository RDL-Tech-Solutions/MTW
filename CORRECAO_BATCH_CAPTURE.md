# Correção: Captura em Lote - Método Incorreto

## Erro Identificado

```
2026-02-26 21:22:45 error: ❌ Erro ao processar URL https://amzn.to/46qdb5t: 
linkAnalyzer.extractProductInfo is not a function
```

---

## Causa

O método `extractProductInfo` não existe no LinkAnalyzer. O método correto é `analyzeLink`.

### Código Incorreto:
```javascript
const productInfo = await linkAnalyzer.extractProductInfo(url);
```

### Código Correto:
```javascript
const productInfo = await linkAnalyzer.analyzeLink(url);
```

---

## Métodos Disponíveis no LinkAnalyzer

### Método Principal:
- ✅ `analyzeLink(url)` - Analisa link e extrai todas as informações

### Métodos Específicos por Plataforma:
- `extractShopeeInfo(url)`
- `extractMeliInfo(url)`
- `extractAmazonInfo(url)`
- `extractAliExpressInfo(url)`
- `extractKabumInfo(url)`
- `extractMagaluInfo(url)`
- `extractPichauInfo(url)`

### Métodos Auxiliares:
- `detectPlatform(url)` - Detecta plataforma
- `followRedirects(url)` - Segue redirecionamentos
- `delegateExtraction(platform, url)` - Delega para método específico

---

## Correção Aplicada

### Arquivo: `backend/src/controllers/productController.js`

**Método:** `batchCapture()`

**Mudanças:**

1. **Chamada do método:**
```javascript
// ANTES
const productInfo = await linkAnalyzer.extractProductInfo(url);

// DEPOIS
const productInfo = await linkAnalyzer.analyzeLink(url);
```

2. **Uso da plataforma retornada:**
```javascript
// ANTES
platform: platform,

// DEPOIS
platform: productInfo.platform || platform,
```

**Motivo:** O `analyzeLink` pode redetectar a plataforma após seguir redirecionamentos.

---

## Estrutura de Retorno do analyzeLink

```javascript
{
  name: "Nome do Produto",
  description: "Descrição...",
  currentPrice: 99.90,
  oldPrice: 149.90,
  discountPercentage: 33,
  imageUrl: "https://...",
  platform: "amazon",
  affiliateLink: "https://...",
  productId: "B08XYZ123" // Opcional
}
```

---

## Fluxo Correto Agora

### 1. Detectar Plataforma
```javascript
const platform = linkAnalyzer.detectPlatform(url);
```

### 2. Analisar Link
```javascript
const productInfo = await linkAnalyzer.analyzeLink(url);
```

**O que o `analyzeLink` faz:**
1. Valida URL
2. Detecta plataforma
3. Segue redirecionamentos se necessário
4. Delega para método específico da plataforma
5. Retorna informações estruturadas

### 3. Criar Produto
```javascript
const product = await Product.create({
  name: productInfo.name,
  current_price: productInfo.currentPrice,
  platform: productInfo.platform,
  // ...
});
```

---

## Teste de Validação

### Comando:
```bash
curl -X POST http://localhost:3000/api/products/batch-capture \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "urls": [
      "https://amzn.to/46qdb5t",
      "https://shopee.com.br/produto",
      "https://mercadolivre.com.br/produto"
    ]
  }'
```

### Logs Esperados:
```
📦 Iniciando captura em lote de 3 produtos...
📥 [1/3] Processando: https://amzn.to/46qdb5t...
   🏪 Plataforma detectada: amazon
   ✅ Produto capturado: Nome do Produto (ID: 123)
📥 [2/3] Processando: https://shopee.com.br/produto...
   🏪 Plataforma detectada: shopee
   ✅ Produto capturado: Nome do Produto (ID: 124)
📥 [3/3] Processando: https://mercadolivre.com.br/produto...
   🏪 Plataforma detectada: mercadolivre
   ✅ Produto capturado: Nome do Produto (ID: 125)
✅ Captura em lote concluída: 3 sucessos, 0 falhas
```

---

## Tratamento de Erros

### Erro na Extração:
```javascript
if (!productInfo || !productInfo.name) {
  results.push({
    url: url,
    success: false,
    error: 'Não foi possível extrair informações do produto'
  });
  continue;
}
```

### Erro de Timeout:
```javascript
catch (error) {
  if (error.message.includes('Timeout')) {
    results.push({
      url: url,
      success: false,
      error: 'Timeout ao processar produto'
    });
  }
}
```

### Erro de Plataforma:
```javascript
if (platform === 'unknown') {
  results.push({
    url: url,
    success: false,
    error: 'Plataforma não suportada'
  });
  continue;
}
```

---

## Arquivo Modificado

- ✅ `backend/src/controllers/productController.js`

**Mudanças:**
1. `extractProductInfo` → `analyzeLink`
2. Usar `productInfo.platform` como fallback

---

## Status

✅ **CORRIGIDO** - Captura em lote agora usa o método correto

**Teste:** Executar captura em lote novamente com o mesmo link da Amazon

---

## Próximos Passos

1. **Testar captura em lote:**
   - Link da Amazon (encurtado)
   - Link da Shopee
   - Link do Mercado Livre
   - Múltiplos links de uma vez

2. **Verificar resultados:**
   - Produtos aparecem como pendentes
   - Informações extraídas corretamente
   - Imagens carregadas
   - Preços corretos

3. **Validar edge cases:**
   - Links inválidos
   - Plataformas não suportadas
   - Produtos sem preço
   - Produtos sem imagem

---

## Conclusão

Erro simples de nomenclatura corrigido. O LinkAnalyzer usa `analyzeLink` como método principal, não `extractProductInfo`.

**Data:** 26/02/2026  
**Tipo:** Bug Fix - Método incorreto  
**Impacto:** Alto (funcionalidade não funcionava)  
**Tempo de correção:** < 5 minutos
