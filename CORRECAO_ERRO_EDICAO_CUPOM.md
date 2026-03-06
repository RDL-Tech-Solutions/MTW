# Correção: Erro ao Editar Cupom - skip_notifications is not allowed

## Problema Identificado
```
skip_notifications: skip_notifications is not allowed
```

Ao tentar editar um cupom no painel admin, o sistema retornava erro indicando que o campo `skip_notifications` não é permitido.

## Causa Raiz
O método `update` do `CouponController` estava enviando TODOS os campos recebidos do frontend diretamente para o banco de dados, sem filtrar campos que não existem na tabela `coupons`.

O campo `skip_notifications` é usado apenas no método `create` para controlar se deve enviar notificações ao criar um cupom, mas não deve ser salvo no banco de dados.

### Código Problemático:
```javascript
static async update(req, res, next) {
  try {
    const { id } = req.params;
    const coupon = await Coupon.update(id, req.body); // ❌ Envia TODOS os campos
    // ...
  }
}
```

## Solução Implementada

### Arquivo Modificado: `backend/src/controllers/couponController.js`

#### Antes (com erro):
```javascript
static async update(req, res, next) {
  try {
    const { id } = req.params;
    const coupon = await Coupon.update(id, req.body); // ❌ Sem filtro
    await cacheDelByPattern('coupons:*');

    logger.info(`Cupom atualizado: ${id}`);
    res.json(successResponse(coupon, 'Cupom atualizado com sucesso'));
  } catch (error) {
    next(error);
  }
}
```

#### Depois (corrigido):
```javascript
static async update(req, res, next) {
  try {
    const { id } = req.params;
    
    // Filtrar campos permitidos (remover campos que não existem na tabela)
    const allowedFields = [
      'code',
      'title',
      'description',
      'platform',
      'discount_type',
      'discount_value',
      'min_purchase',
      'max_discount_value',
      'max_uses',
      'usage_limit',
      'valid_from',
      'valid_until',
      'is_active',
      'is_exclusive',
      'is_general',
      'is_out_of_stock',
      'store_name',
      'applicable_products',
      'terms',
      'usage_instructions'
    ];
    
    const filteredUpdates = {};
    for (const key of Object.keys(req.body)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = req.body[key];
      }
    }
    
    const coupon = await Coupon.update(id, filteredUpdates); // ✅ Apenas campos permitidos
    await cacheDelByPattern('coupons:*');

    logger.info(`Cupom atualizado: ${id}`);
    res.json(successResponse(coupon, 'Cupom atualizado com sucesso'));
  } catch (error) {
    next(error);
  }
}
```

## Mudanças Realizadas

### 1. Whitelist de Campos Permitidos
Criada lista explícita de campos que podem ser atualizados na tabela `coupons`:

```javascript
const allowedFields = [
  'code',                    // Código do cupom
  'title',                   // Título
  'description',             // Descrição
  'platform',                // Plataforma (shopee, mercadolivre, etc)
  'discount_type',           // Tipo de desconto (percentage, fixed)
  'discount_value',          // Valor do desconto
  'min_purchase',            // Compra mínima
  'max_discount_value',      // Desconto máximo
  'max_uses',                // Máximo de usos
  'usage_limit',             // Limite de uso
  'valid_from',              // Válido de
  'valid_until',             // Válido até
  'is_active',               // Ativo/Inativo
  'is_exclusive',            // Exclusivo
  'is_general',              // Geral (todos produtos)
  'is_out_of_stock',         // Esgotado
  'store_name',              // Nome da loja
  'applicable_products',     // Produtos aplicáveis
  'terms',                   // Termos e condições
  'usage_instructions'       // Instruções de uso
];
```

### 2. Filtragem de Campos
Apenas campos presentes na whitelist são enviados para o banco:

```javascript
const filteredUpdates = {};
for (const key of Object.keys(req.body)) {
  if (allowedFields.includes(key)) {
    filteredUpdates[key] = req.body[key];
  }
}
```

### 3. Campos Ignorados
Campos que não existem na tabela são automaticamente ignorados:
- `skip_notifications` - Usado apenas na criação
- Qualquer outro campo não listado na whitelist

## Campos da Tabela Coupons

### Campos Editáveis:
- ✅ `code` - Código do cupom
- ✅ `title` - Título
- ✅ `description` - Descrição
- ✅ `platform` - Plataforma
- ✅ `discount_type` - Tipo de desconto
- ✅ `discount_value` - Valor do desconto
- ✅ `min_purchase` - Compra mínima
- ✅ `max_discount_value` - Desconto máximo
- ✅ `max_uses` - Máximo de usos
- ✅ `usage_limit` - Limite de uso
- ✅ `valid_from` - Data início validade
- ✅ `valid_until` - Data fim validade
- ✅ `is_active` - Status ativo
- ✅ `is_exclusive` - Cupom exclusivo
- ✅ `is_general` - Cupom geral
- ✅ `is_out_of_stock` - Cupom esgotado
- ✅ `store_name` - Nome da loja
- ✅ `applicable_products` - IDs dos produtos
- ✅ `terms` - Termos e condições
- ✅ `usage_instructions` - Instruções de uso

### Campos Não Editáveis (gerenciados automaticamente):
- ❌ `id` - ID único (auto-incremento)
- ❌ `created_at` - Data de criação
- ❌ `updated_at` - Data de atualização
- ❌ `current_uses` - Usos atuais (incrementado via método específico)
- ❌ `view_count` - Contagem de visualizações

### Campos Temporários (não salvos no banco):
- ❌ `skip_notifications` - Flag para controlar envio de notificações na criação

## Comportamento Após Correção

### Ao Editar Cupom:
1. ✅ Frontend envia todos os campos (incluindo `skip_notifications`)
2. ✅ Backend filtra apenas campos permitidos
3. ✅ Campos não permitidos são ignorados silenciosamente
4. ✅ Cupom é atualizado com sucesso
5. ✅ Sem erros de validação

### Exemplo de Requisição:
```javascript
// Frontend envia:
{
  code: "DESCONTO10",
  discount_value: 15,
  skip_notifications: true,  // ❌ Será ignorado
  some_random_field: "test"  // ❌ Será ignorado
}

// Backend processa:
{
  code: "DESCONTO10",        // ✅ Permitido
  discount_value: 15         // ✅ Permitido
}
// skip_notifications e some_random_field são ignorados
```

## Segurança

### Proteção Contra Injeção:
- Whitelist previne atualização de campos sensíveis
- Campos do sistema (id, created_at, etc) não podem ser alterados
- Campos inexistentes são ignorados

### Validação de Dados:
- Tipos de dados validados pelo Supabase/PostgreSQL
- Constraints do banco são respeitados
- Erros de validação retornam mensagens claras

## Teste de Validação

### Como testar:
1. Abrir painel admin
2. Editar qualquer cupom
3. Salvar alterações
4. Cupom deve ser atualizado com sucesso
5. Sem erro "skip_notifications is not allowed"

### Verificar no console do backend:
```bash
# Log esperado:
Cupom atualizado: 123
```

## Status
✅ **CORRIGIDO** - Cupons podem ser editados sem erro de validação

## Arquivos Modificados
- `backend/src/controllers/couponController.js`

## Próximos Passos (Opcional)
1. Aplicar mesma validação no método `create` (se necessário)
2. Criar middleware de validação reutilizável
3. Documentar campos permitidos em cada endpoint
