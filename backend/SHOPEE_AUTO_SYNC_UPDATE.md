# Atualização do Auto-Sync Shopee com Links de Afiliado

## ✅ Status: IMPLEMENTADO E TESTADO

**Testes realizados:**
- ✅ Busca de ofertas: 5 ofertas encontradas
- ✅ Filtro de promoções: 5 promoções válidas
- ✅ Geração de links de afiliado: Funcionando via API GraphQL
- ✅ Links sendo incluídos nas mensagens: Confirmado

## 🔄 Mudanças Implementadas

### 1. `shopeeSync.js` - Atualizado para API GraphQL

#### `fetchShopeeProducts()`
- **Antes:** Tentava usar API REST (não funcionava)
- **Agora:** Usa `shopeeService.getShopeeOffers()` (GraphQL)
- **Retorna:** Ofertas com `offerLink` que já é link de afiliado com tracking

#### `filterShopeePromotions()`
- **Adaptado:** Filtra por comissão e validade (já que não temos preços)
- **Critérios:**
  - Comissão ≥ 1%
  - Oferta dentro do período válido
  - Score de qualidade baseado em comissão

#### `generateShopeeAffiliateLink()`
- **Prioridade 1:** Usa `shopeeService.generateShortLink()` (API GraphQL)
- **Fallback:** Adiciona `affiliate_id` manualmente na URL
- **Validação:** Verifica se link já é de afiliado antes de gerar

#### `saveShopeeToDatabase()`
- **Garante:** Link de afiliado sempre gerado antes de salvar
- **Logs:** Detalhados sobre geração de links
- **Atualização:** Atualiza link de afiliado se mudar

### 2. Integração com Publicação

O sistema já está configurado para:
- ✅ Salvar produtos com `affiliate_link` no banco
- ✅ `templateRenderer` usa `affiliate_link` nas mensagens
- ✅ `publishService` publica produtos com links de afiliado
- ✅ Bots (Telegram/WhatsApp) recebem mensagens com links de afiliado

## 📊 Fluxo Completo

```
1. Auto-Sync Cron (a cada X minutos)
   ↓
2. shopeeSync.fetchShopeeProducts()
   → Busca ofertas via API GraphQL
   → Retorna ofertas com offerLink (já é link de afiliado)
   ↓
3. shopeeSync.filterShopeePromotions()
   → Filtra por comissão e validade
   → Retorna promoções válidas
   ↓
4. shopeeSync.saveShopeeToDatabase()
   → Gera/valida link de afiliado
   → Salva no banco com affiliate_link
   ↓
5. publishService.publishAll()
   → Publica no app (via API)
   → Envia para Telegram/WhatsApp
   → templateRenderer inclui affiliate_link na mensagem
   ↓
6. Usuários recebem mensagens com links de afiliado
```

## 🔗 Links de Afiliado

### Como são Gerados

1. **API GraphQL (Prioridade)**
   ```javascript
   await shopeeService.generateShortLink(url)
   // Retorna: https://s.shopee.com.br/XXXXX
   ```

2. **Método Alternativo (Fallback)**
   ```javascript
   // Adiciona affiliate_id na URL
   url + ?affiliate_id=18349000441
   ```

### Onde são Usados

- ✅ **Mensagens Telegram/WhatsApp:** Incluídos via template
- ✅ **App Mobile:** Produtos têm `affiliate_link` na API
- ✅ **Banco de Dados:** Campo `affiliate_link` sempre preenchido

## 📝 Estrutura de Dados

### Produto Salvo no Banco
```javascript
{
  external_id: "shopee-2-123456",
  name: "Nome da Oferta",
  platform: "shopee",
  current_price: 0, // API não retorna preço
  old_price: null,
  discount_percentage: 10, // Mínimo configurado
  affiliate_link: "https://s.shopee.com.br/XXXXX", // ✅ Link de afiliado
  commission_rate: 0.03, // 3%
  offer_type: 2, // 1: Collection, 2: Category
  category_id: 123,
  collection_id: 456,
  period_start: Date,
  period_end: Date,
  quality_score: 3.0
}
```

## 🧪 Testes

Execute o teste completo:
```bash
cd backend
node scripts/test-shopee-sync.js
```

**Resultado esperado:**
- ✅ Produtos encontrados: > 0
- ✅ Promoções válidas: > 0
- ✅ Links de afiliado: Todos gerados

## ⚠️ Observações Importantes

1. **Preços não disponíveis**
   - A API de afiliados não retorna preços de produtos
   - O sistema usa `discount_percentage` mínimo configurado
   - Score de qualidade baseado em comissão

2. **Ofertas vs Produtos**
   - A API retorna ofertas (coleções/categorias), não produtos individuais
   - Cada oferta pode conter múltiplos produtos
   - Links de afiliado apontam para a oferta/categoria

3. **Comissão**
   - Taxa de comissão disponível em `commission_rate`
   - Usado para filtrar ofertas interessantes (≥ 1%)
   - Usado para calcular `quality_score`

## ✅ Checklist

- [x] API GraphQL integrada
- [x] Busca de ofertas funcionando
- [x] Links de afiliado sendo gerados
- [x] Links salvos no banco de dados
- [x] Links incluídos nas mensagens dos bots
- [x] Testes passando
- [x] Logs detalhados implementados

## 🎯 Próximos Passos

1. **Monitorar em produção**
   - Verificar se ofertas estão sendo encontradas
   - Confirmar que links de afiliado estão sendo compartilhados
   - Validar que comissões estão sendo rastreadas

2. **Otimizações futuras**
   - Cache de ofertas frequentes
   - Retry logic para requisições falhadas
   - Filtros mais inteligentes baseados em comissão

3. **Relatórios**
   - Usar `conversionReport` para ver cliques
   - Usar `validatedReport` para ver comissões confirmadas
