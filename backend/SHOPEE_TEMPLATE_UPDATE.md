# Template Específico para Shopee - Ofertas e Coleções

## ✅ Status: IMPLEMENTADO

## 🎯 Objetivo

Criar um template específico para publicações da Shopee que deixe claro que são **ofertas/coleções** com múltiplos produtos, não produtos únicos.

## 🔄 Mudanças Implementadas

### 1. `templateRenderer.js` - Template Específico para Shopee

#### `preparePromotionVariables()`
- **Detecta** quando `product.platform === 'shopee'`
- **Adiciona** informações específicas sobre a oferta:
  - Taxa de comissão (em %)
  - Tipo de oferta (Coleção ou Categoria)
  - Data de validade
  - Mensagem explicativa sobre múltiplos produtos

#### `getDefaultTemplate()`
- **Template específico para Shopee:**
  ```
  🛍️ **OFERTA ESPECIAL SHOPEE**
  
  📦 **{product_name}**
  
  💰 **Comissão:** X.XX%
  📦 **Tipo:** Coleção de Produtos / Oferta por Categoria
  ⏰ **Válido até:** DD/MM/YYYY HH:MM
  
  🔍 **Esta é uma oferta especial da Shopee com múltiplos produtos!**
  Clique no link para ver todos os produtos disponíveis.
  
  🔗 **Acesse a oferta:**
  {affiliate_link}
  
  ⚡ Explore todos os produtos disponíveis nesta oferta!
  ```

- **Template padrão** para outras plataformas (mantido)

### 2. `shopeeSync.js` - Preservar Dados Extras

- **Adiciona** dados extras ao objeto retornado:
  - `commission_rate`
  - `offer_type`
  - `period_end`
  - `period_start`
  - `collection_id`

### 3. `autoSyncCron.js` - Passar Dados para Template

- **Preserva** dados extras da Shopee antes de publicar
- **Garante** que o template tenha acesso a todas as informações

## 📊 Estrutura de Dados

### Variáveis Disponíveis no Template Shopee

```javascript
{
  product_name: "Nome da Oferta",
  platform_name: "Shopee",
  affiliate_link: "https://s.shopee.com.br/XXXXX",
  shopee_offer_info: `
    💰 **Comissão:** 3.00%
    📦 **Tipo:** Coleção de Produtos
    ⏰ **Válido até:** 31/12/2025 23:59
    
    🔍 **Esta é uma oferta especial da Shopee com múltiplos produtos!**
    Clique no link para ver todos os produtos disponíveis.
  `,
  is_shopee_offer: "true",
  coupon_section: "" // Se houver cupom
}
```

## 🎨 Template Visual

### Para Shopee:
```
🛍️ **OFERTA ESPECIAL SHOPEE**

📦 **New BAU Comm - Health**

💰 **Comissão:** 3.00%
📦 **Tipo:** Coleção de Produtos
⏰ **Válido até:** 31/12/2025 23:59

🔍 **Esta é uma oferta especial da Shopee com múltiplos produtos!**
Clique no link para ver todos os produtos disponíveis.

🔗 **Acesse a oferta:**
https://s.shopee.com.br/XXXXX

⚡ Explore todos os produtos disponíveis nesta oferta!
```

### Para Outras Plataformas (mantido):
```
🔥 **NOVA PROMOÇÃO AUTOMÁTICA**

📦 Nome do Produto

💰 **R$ 99,90** ~~R$ 149,90~~
🏷️ **33% OFF**

🛒 Plataforma: Mercado Livre

🔗 https://produto.com.br

⚡ Aproveite antes que acabe!
```

## ✅ Benefícios

1. **Clareza**: Usuários sabem que é uma oferta/coleção, não produto único
2. **Transparência**: Mostra taxa de comissão e tipo de oferta
3. **Informação**: Data de validade da oferta
4. **Call-to-Action**: Incentiva a explorar todos os produtos

## 🔧 Configuração

O template é **automático** - não requer configuração adicional. O sistema detecta automaticamente quando é Shopee e usa o template apropriado.

## 📝 Notas Importantes

1. **Dados Extras**: `commission_rate`, `offer_type`, `period_end` não são salvos no banco, mas são preservados em memória para o template
2. **Compatibilidade**: Templates customizados no painel admin continuam funcionando
3. **Fallback**: Se não houver template customizado, usa o template padrão específico para Shopee
