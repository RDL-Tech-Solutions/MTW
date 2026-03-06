# Correção: Erro 400 ao Criar Cupom

## Problema
Ao tentar criar um cupom no painel admin, a requisição retornava erro 400 Bad Request.

## Causa Raiz
O frontend enviava o campo `skip_notifications` no payload, mas o schema de validação Joi no backend não incluía esse campo na lista de campos permitidos. Isso causava a rejeição da requisição antes mesmo de chegar ao controller.

## Análise
1. Frontend (`admin-panel/src/pages/Coupons.jsx`) enviava:
   ```javascript
   {
     code: "PROMO77",
     platform: "mercadolivre",
     discount_type: "percentage",
     discount_value: 10,
     // ... outros campos
     skip_notifications: false  // ❌ Campo não permitido no schema
   }
   ```

2. Backend (`backend/src/middleware/validation.js`) validava com schema que não incluía `skip_notifications`

3. Middleware `validate()` rejeitava a requisição com 400 antes de chegar ao controller

## Solução Implementada
Adicionado campo `skip_notifications` ao schema de validação de criação de cupons:

```javascript
export const createCouponSchema = Joi.object({
  // ... campos existentes
  skip_notifications: Joi.boolean().default(false) // Flag para pular notificações
})
```

## Arquivos Modificados
- `backend/src/middleware/validation.js` - Adicionado `skip_notifications` ao `createCouponSchema`

## Comportamento
- `skip_notifications: true` - Cupom criado apenas no app, sem enviar notificações para canais
- `skip_notifications: false` (padrão) - Cupom criado e notificações enviadas normalmente

## Teste
1. Abrir painel admin
2. Criar novo cupom com qualquer configuração
3. Verificar que cupom é criado com sucesso (201)
4. Verificar que notificações são enviadas (se skip_notifications = false)

## Status
✅ Corrigido - Cupons podem ser criados normalmente pelo painel admin
