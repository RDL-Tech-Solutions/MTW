# 🚨 Problema: Cupons não estão sendo publicados no WhatsApp Web

## Diagnóstico Realizado

Executamos o script `backend/scripts/diagnose-whatsapp-coupons.js` e identificamos o problema.

## ❌ Problema Identificado

**TODOS os canais WhatsApp Web têm filtro de categoria configurado:**

### Canal 1: PrecoCerto
- Aceita cupons: ✅ SIM
- Filtro de categoria: **8 categorias específicas**
- ⚠️ **Cupons SEM categoria serão BLOQUEADOS**

### Canal 2: PreçoCerto Gamer  
- Aceita cupons: ✅ SIM
- Filtro de categoria: **3 categorias específicas**
- ⚠️ **Cupons SEM categoria serão BLOQUEADOS**

## 🔍 Por que isso acontece?

Quando você cria um cupom pela plataforma admin ou pelos bots do Telegram, se **não definir uma categoria**, o cupom fica sem `category_id`.

O código do `notificationDispatcher.js` (linha 370-390) verifica:

```javascript
// Se o cupom TEM categoria
if (data.category_id) {
  // Verifica se a categoria está na lista permitida do canal
  if (!allowedCategories.includes(itemCategoryId)) {
    // BLOQUEIA o cupom
    continue;
  }
} else {
  // Se o cupom NÃO TEM categoria E o canal tem filtro
  if (channel.category_filter && channel.category_filter.length > 0) {
    // BLOQUEIA o cupom
    continue;
  }
}
```

## ✅ Soluções Possíveis

### Solução 1: Adicionar categoria aos cupons (RECOMENDADO)

Sempre defina uma categoria ao criar cupons:
- No painel admin: selecione a categoria no formulário
- Nos bots do Telegram/WhatsApp: adicione a categoria durante a criação

### Solução 2: Remover filtro de categoria de um canal

Se você quer que cupons sem categoria sejam publicados, remova o filtro de pelo menos um canal:

```sql
-- Remover filtro de categoria do canal "PrecoCerto"
UPDATE bot_channels 
SET category_filter = NULL 
WHERE id = '20d23b2b-c0bd-4d0b-b9f1-a1973815af2d';
```

### Solução 3: Criar um canal específico para cupons gerais

Crie um novo canal WhatsApp Web sem filtro de categoria para receber todos os cupons.

## 🛠️ Script de Correção Automática

Criamos um script para ajudar a corrigir cupons existentes sem categoria:

```bash
cd backend
node scripts/fix-coupons-without-category.js
```

## 📊 Categorias Aceitas pelos Canais

### Canal PrecoCerto aceita:
- b478b692-84df-4281-b20f-2722d8f1d356
- d577278a-3c1a-4eff-b486-effcad04c7ff
- df5861f9-e361-433f-983a-36bb87248c56
- 3bc68bd2-9e4d-4fec-b7c4-59eef8478a6c
- f5931bf7-759f-4c36-ae74-4e1d12db5873
- d35a8047-56b7-4479-9fb1-506ef6f81d14
- daef9c6c-9b0a-4d6a-b694-9268bd60ea4a
- 680f828c-2c95-4094-9585-abd291252779

### Canal PreçoCerto Gamer aceita:
- 0d216f78-9a48-4a2a-8262-ae4f06fb67c7
- f5931bf7-759f-4c36-ae74-4e1d12db5873
- ae9ecaf7-c5fa-4717-8a2c-62a5d0b939c3

## 🔄 Como Testar

Após aplicar a correção, teste criando um cupom:

1. Crie um cupom COM categoria
2. Verifique se foi publicado nos canais WhatsApp Web
3. Verifique os logs do servidor para confirmar

## 📝 Logs Úteis

Para ver o que está acontecendo durante a publicação:

```bash
# Ver logs em tempo real
tail -f backend/logs/combined.log | grep -i "cupom\|coupon\|whatsapp"
```

## ✅ Verificação Final

Execute o diagnóstico novamente para confirmar:

```bash
cd backend
node scripts/diagnose-whatsapp-coupons.js
```
