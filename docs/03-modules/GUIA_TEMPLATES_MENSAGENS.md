# 📋 Guia Completo: Templates de Mensagem para Bots

## 📌 Visão Geral

O sistema possui **4 tipos de templates** de mensagens para os bots (Telegram/WhatsApp):

| Tipo | Quando é usado | Estado |
|------|----------------|--------|
| `new_promotion` | Produto **SEM** cupom vinculado | ✅ Completo (3 modelos) |
| `promotion_with_coupon` | Produto **COM** cupom vinculado | ✅ Completo (3 modelos) |
| `new_coupon` | Novo cupom criado | ✅ Completo (3 modelos) |
| `expired_coupon` | Cupom expirado | ✅ Completo (3 modelos) |

## 🎯 Como o Sistema Escolhe o Template

### Para Produtos (Promoções)

O sistema verifica automaticamente se o produto tem cupom vinculado:

```javascript
// No backend: notificationDispatcher.js e publishService.js

if (product.coupon_id) {
  templateType = 'promotion_with_coupon';  // ← Produto COM cupom
} else {
  templateType = 'new_promotion';           // ← Produto SEM cupom
}
```

**Exemplo prático:**

1. **Produto aprovado SEM cupom:**
   - Template usado: `new_promotion`
   - Mostra: Nome, preço, desconto, link
   - NÃO mostra: informações de cupom

2. **Produto aprovado COM cupom:**
   - Template usado: `promotion_with_coupon`
   - Mostra: Nome, preço original, preço com cupom, código do cupom, link
   - Destaca a "economia dupla"

---

## 📝 Templates Padrão Disponíveis

### 1️⃣ Nova Promoção (SEM Cupom)
**Tipo:** `new_promotion`

#### Modelo 1: Simples e Direto (ATIVO)
```
🔥 **PROMOÇÃO IMPERDÍVEL!**

📦 {product_name}

💰 **{current_price}**{old_price}
🏷️ **{discount_percentage}% OFF**

🛒 {platform_name}

🔗 {affiliate_link}

⚡ Corre que está acabando!
```

#### Modelo 2: Detalhado e Informativo
```
🎯 **OFERTA ESPECIAL ENCONTRADA!**

━━━━━━━━━━━━━━━━━━━━
📦 **PRODUTO**
{product_name}
━━━━━━━━━━━━━━━━━━━━

💰 **PREÇO ATUAL:** {current_price}{old_price}
🎁 **DESCONTO:** {discount_percentage}% OFF

🏪 **LOJA:** {platform_name}

🔗 **COMPRAR AGORA:**
{affiliate_link}

⏰ **Oferta limitada! Não perca!**
```

#### Modelo 3: Urgente e Ação
```
⚡ **ALERTA DE OFERTA!** ⚡

🎁 {product_name}

💸 De {old_price} por apenas **{current_price}**
🔥 **ECONOMIZE {discount_percentage}%!**

🛒 {platform_name}
🔗 {affiliate_link}

⏰ **ÚLTIMAS HORAS! Aproveite agora!**
```

---

### 2️⃣ Promoção + Cupom (COM Cupom) ✨ NOVO
**Tipo:** `promotion_with_coupon`

#### Modelo 1: Simples e Direto (ATIVO)
```
🔥 **PROMOÇÃO + CUPOM!**

📦 {product_name}

💰 **Preço Original:** {current_price}
🎟️ **Com Cupom:** {price_with_coupon}
{old_price}
🏷️ **{discount_percentage}% OFF**

{coupon_section}

🛒 {platform_name}

🔗 {affiliate_link}

⚡ Economia dupla! Corre que está acabando!
```

#### Modelo 2: Detalhado e Informativo
```
🎯 **OFERTA ESPECIAL + CUPOM EXCLUSIVO!**

━━━━━━━━━━━━━━━━━━━━
📦 **PRODUTO**
{product_name}
━━━━━━━━━━━━━━━━━━━━

💰 **PREÇO NORMAL:** {current_price}
🎟️ **PREÇO COM CUPOM:** {price_with_coupon}
{old_price}
🎁 **DESCONTO DO PRODUTO:** {discount_percentage}% OFF

{coupon_section}

━━━━━━━━━━━━━━━━━━━━
🏪 **LOJA:** {platform_name}
━━━━━━━━━━━━━━━━━━━━

🔗 **COMPRAR AGORA:**
{affiliate_link}

⏰ **Oferta limitada com cupom! Não perca!**
```

#### Modelo 3: Urgente e Ação
```
⚡ **ECONOMIA DUPLA!** ⚡

🎁 {product_name}

💸 De {old_price}
💰 Por {current_price}
🎟️ **COM CUPOM: {price_with_coupon}**
🔥 **ECONOMIZE {discount_percentage}% + CUPOM EXTRA!**

{coupon_section}

🛒 {platform_name}
🔗 {affiliate_link}

⏰ **ÚLTIMA CHANCE! Use o cupom agora antes que acabe!**
```

---

### 3️⃣ Novo Cupom
**Tipo:** `new_coupon`

#### Modelo 1: Simples e Direto (ATIVO)
```
🎟️ **NOVO CUPOM DISPONÍVEL!**

🏪 {platform_name}

💬 **CÓDIGO:**
`{coupon_code}`

💰 **DESCONTO:** {discount_value} OFF
{min_purchase}
{applicability}

📝 {coupon_title}
{coupon_description}

🔗 {affiliate_link}

⚡ Use agora e economize!
```

#### Modelo 2: Detalhado e Informativo
```
🎁 **CUPOM DE DESCONTO ATIVO!**

━━━━━━━━━━━━━━━━━━━━
🏪 **PLATAFORMA:** {platform_name}
━━━━━━━━━━━━━━━━━━━━

💬 **COPIE O CÓDIGO:**
`{coupon_code}`

💰 **VALOR DO DESCONTO:** {discount_value} OFF
{min_purchase}
{applicability}

📋 **DETALHES:**
{coupon_title}
{coupon_description}

🔗 **LINK PARA USAR:**
{affiliate_link}

✅ **Cupom pronto para uso!**
```

#### Modelo 3: Urgente e Ação
```
⚡ **CUPOM LIBERADO!** ⚡

🎟️ **CÓDIGO EXCLUSIVO:**
`{coupon_code}`

🏪 {platform_name}
💰 {discount_value} OFF
{min_purchase}
{applicability}

{coupon_title}
{coupon_description}

🔗 {affiliate_link}

⏰ **Use antes que expire!**
```

---

### 4️⃣ Cupom Expirado
**Tipo:** `expired_coupon`

#### Modelo 1: Simples e Direto (ATIVO)
```
⚠️ **CUPOM EXPIROU**

🏪 {platform_name}
💬 Código: `{coupon_code}`
📅 Expirado em: {expired_date}

😔 Este cupom não está mais disponível.
🔔 Fique atento às próximas promoções!
```

#### Modelo 2: Informativo
```
📢 **AVISO: CUPOM EXPIRADO**

━━━━━━━━━━━━━━━━━━━━
🏪 **Plataforma:** {platform_name}
💬 **Código:** `{coupon_code}`
📅 **Data de Expiração:** {expired_date}
━━━━━━━━━━━━━━━━━━━━

ℹ️ Este cupom de desconto não está mais válido.

🔔 **Não se preocupe!** Novos cupons são adicionados regularmente. Fique de olho!
```

#### Modelo 3: Motivacional
```
⏰ **CUPOM EXPIRADO**

🏪 {platform_name}
💬 `{coupon_code}`
📅 {expired_date}

😢 Infelizmente este cupom expirou.

✨ Mas não desanime! Novas oportunidades estão chegando. Continue acompanhando para não perder as próximas ofertas! 🎁
```

---

## 🔧 Variáveis Disponíveis

### Para `new_promotion` (SEM cupom)
```json
{
  "product_name": "Nome do produto",
  "current_price": "R$ 159,90",
  "old_price": " (era R$ 199,90)",
  "discount_percentage": "20",
  "platform_name": "Mercado Livre",
  "affiliate_link": "https://..."
}
```

### Para `promotion_with_coupon` (COM cupom) ✨
```json
{
  "product_name": "Nome do produto",
  "current_price": "R$ 159,90",
  "price_with_coupon": "R$ 139,90",
  "final_price": "R$ 139,90",
  "original_price": "R$ 159,90",
  "old_price": " (era R$ 199,90)",
  "discount_percentage": "20",
  "platform_name": "Mercado Livre",
  "affiliate_link": "https://...",
  "coupon_code": "DESCONTO10",
  "coupon_discount": "10% OFF",
  "coupon_section": "🎟️ **CUPOM DISPONÍVEL**\n\n💬 Use o código: `DESCONTO10`\n💰 Desconto: 10% OFF"
}
```

### Para `new_coupon`
```json
{
  "platform_name": "Mercado Livre",
  "coupon_code": "DESCONTO10",
  "discount_value": "10%",
  "min_purchase": "💳 Compra mínima: R$ 100,00",
  "applicability": "✅ Válido para todos os produtos",
  "coupon_title": "Titulo do cupom",
  "coupon_description": "Descrição do cupom",
  "affiliate_link": "https://..."
}
```

### Para `expired_coupon`
```json
{
  "platform_name": "Mercado Livre",
  "coupon_code": "DESCONTO10",
  "expired_date": "29/12/2025"
}
```

---

## 🚀 Como Usar

### 1. Execute o SQL no Supabase

Execute o arquivo `EXECUTE_NOW_FINAL_promotion_with_coupon_templates.sql` no Supabase SQL Editor.

### 2. Verifique no Painel Admin

Acesse: **Configurações > Templates de Mensagem**

Você verá todos os 12 templates (3 para cada tipo).

### 3. Ative/Desative Templates

- Apenas **1 template ativo por tipo** por vez
- Os templates "Modelo 1" já estão ativos por padrão
- Você pode trocar ou personalizar no painel

### 4. Personalize (Opcional)

- Edite o texto dos templates
- Adicione emojis personalizados
- Reorganize as seções
- **NÃO remova** as variáveis `{variavel}` - elas são substituídas automaticamente

### 5. Teste

1. Aprove um produto **SEM cupom** → Verá template `new_promotion`
2. Aprove um produto **COM cupom** → Verá template `promotion_with_coupon`

---

## 🐛 Troubleshooting

### Problema: Bot não está usando template correto

**Verificar:**
1. Logs do backend: `coupon_id: ${fullProduct.coupon_id || 'NÃO DEFINIDO'}`
2. Logs do backend: `Template esperado: promotion_with_coupon ✅`
3. Se está usando o template ativo correto no painel admin

**Solução:**
- Se `coupon_id` está definido mas usa `new_promotion`, reinicie o backend
- Verifique se há template ATIVO do tipo correto no banco

### Problema: Variáveis não são substituídas

**Verificar:**
1. Nome da variável está correto: `{product_name}` (não `{productName}`)
2. Variável existe nas `available_variables` do template
3. Dados do produto/cupom estão completos

---

## 📊 Resumo Final

✅ **4 tipos de templates** completamente implementados
✅ **12 modelos padrão** (3 por tipo)
✅ **Seleção automática** baseada em `product.coupon_id`
✅ **Variáveis dinâmicas** para personalização
✅ **Gerenciamento** via painel admin

---

**Desenvolvido por:** RDL Tech Solutions  
**Data:** 29/12/2025  
**Versão:** 1.0.0
