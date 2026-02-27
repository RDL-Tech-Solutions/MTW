# Guia Rápido de Testes - Sistema de Cupons

## Checklist de Testes

### 1. Tela Home (Grid de Produtos)

#### Teste 1.1: Produto com Cupom Único
- [ ] Abrir app e ir para Home
- [ ] Localizar produto com 1 cupom ativo
- [ ] **Verificar:** Badge mostra código do cupom + percentual (ex: "CUPOM20 -20%")
- [ ] **Verificar:** Preço exibido é o preço COM cupom (menor)
- [ ] **Verificar:** Preço riscado é o preço SEM cupom (original)

**Exemplo esperado:**
```
┌─────────────────┐
│  [Imagem]       │
├─────────────────┤
│ Produto X       │
│ R$ 100,00       │ ← Riscado (preço sem cupom)
│ R$ 80           │ ← Destaque (preço com cupom)
│ [CUPOM20 -20%]  │ ← Badge verde
└─────────────────┘
```

#### Teste 1.2: Produto com Múltiplos Cupons
- [ ] Localizar produto com 2+ cupons ativos
- [ ] **Verificar:** Badge mostra o cupom com MAIOR desconto
- [ ] **Verificar:** Preço exibido usa o MELHOR cupom

**Exemplo:**
- Cupom A: 15% OFF
- Cupom B: 20% OFF
- **Esperado:** Badge mostra "CUPOM B -20%"

#### Teste 1.3: Produto sem Cupom
- [ ] Localizar produto sem cupons
- [ ] **Verificar:** Sem badge de cupom
- [ ] **Verificar:** Preço exibido é o current_price
- [ ] **Verificar:** Se houver old_price, ele aparece riscado

#### Teste 1.4: Produto com Cupom Esgotado
- [ ] Criar cupom com `is_out_of_stock = true`
- [ ] Vincular ao produto
- [ ] **Verificar:** Cupom NÃO aparece no badge
- [ ] **Verificar:** Preço exibido é o current_price (sem cupom)

---

### 2. Tela de Cupons

#### Teste 2.1: Listagem de Cupons Ativos
- [ ] Ir para aba "Cupons"
- [ ] **Verificar:** Apenas cupons ativos aparecem
- [ ] **Verificar:** Cupons esgotados NÃO aparecem na lista

#### Teste 2.2: Filtro de Cupons Esgotados
- [ ] Marcar cupom como esgotado no banco: `UPDATE coupons SET is_out_of_stock = true WHERE id = X`
- [ ] Fazer pull-to-refresh na tela
- [ ] **Verificar:** Cupom esgotado desaparece da lista

#### Teste 2.3: Modal de Detalhes do Cupom
- [ ] Clicar em um cupom
- [ ] **Verificar:** Modal abre com detalhes
- [ ] **Verificar:** Botão "Copiar Código" funciona
- [ ] **Verificar:** Se cupom esgotado, botão mostra "Cupom Esgotado" (desabilitado)

---

### 3. Tela de Produtos Vinculados

#### Teste 3.1: Produtos com Cupom
- [ ] Abrir cupom com produtos vinculados
- [ ] Clicar em "Ver X produtos vinculados"
- [ ] **Verificar:** Lista de produtos abre
- [ ] **Verificar:** Cada produto mostra preço COM cupom
- [ ] **Verificar:** Preço original aparece riscado
- [ ] **Verificar:** Badge do cupom aparece

**Exemplo esperado:**
```
┌────────────────────────────────┐
│ [IMG] Produto Y                │
│       R$ 100,00  R$ 80,00      │
│       [CUPOM20]                │
└────────────────────────────────┘
         ↑ riscado  ↑ destaque
```

#### Teste 3.2: Produtos com Múltiplos Cupons
- [ ] Produto vinculado a 2+ cupons
- [ ] **Verificar:** Badge mostra o MELHOR cupom
- [ ] **Verificar:** Preço usa o MELHOR cupom

---

### 4. Testes de Cálculo de Melhor Cupom

#### Teste 4.1: Comparação Percentual vs Fixo
**Setup:**
- Produto: R$ 100,00
- Cupom A: 20% OFF
- Cupom B: R$ 25 OFF (fixo)

**Esperado:**
- Cupom A: 20% = R$ 20 de desconto
- Cupom B: R$ 25 = 25% de desconto equivalente
- **Melhor:** Cupom B (25% > 20%)
- **Badge:** "CUPOM B -25%"
- **Preço:** R$ 75,00

#### Teste 4.2: Múltiplos Cupons Percentuais
**Setup:**
- Produto: R$ 100,00
- Cupom A: 10% OFF
- Cupom B: 15% OFF
- Cupom C: 20% OFF

**Esperado:**
- **Melhor:** Cupom C (20%)
- **Badge:** "CUPOM C -20%"
- **Preço:** R$ 80,00

#### Teste 4.3: Cupom com Valor Mínimo
**Setup:**
- Produto: R$ 50,00
- Cupom A: 20% OFF (min_purchase: R$ 100)
- Cupom B: 10% OFF (sem mínimo)

**Esperado:**
- Cupom A: NÃO aplicável (produto < mínimo)
- **Melhor:** Cupom B (10%)
- **Badge:** "CUPOM B -10%"
- **Preço:** R$ 45,00

---

### 5. Testes de Performance

#### Teste 5.1: Scroll no Grid
- [ ] Abrir Home com 50+ produtos
- [ ] Fazer scroll rápido
- [ ] **Verificar:** Sem lag ou travamento
- [ ] **Verificar:** Cards renderizam suavemente

#### Teste 5.2: Produtos com Muitos Cupons
- [ ] Produto com 10+ cupons
- [ ] **Verificar:** Seleção do melhor cupom é rápida (< 1s)
- [ ] **Verificar:** Sem delay na renderização

---

### 6. Testes de Edge Cases

#### Teste 6.1: Produto sem Preço
- [ ] Produto com `current_price = 0` ou `null`
- [ ] **Verificar:** Não quebra o app
- [ ] **Verificar:** Exibe "Preço indisponível" ou similar

#### Teste 6.2: Cupom sem Código
- [ ] Cupom com `code = null`
- [ ] **Verificar:** Badge não aparece
- [ ] **Verificar:** Preço com cupom ainda é aplicado

#### Teste 6.3: Array de Cupons Vazio
- [ ] Produto com `coupons = []`
- [ ] **Verificar:** Sem badge
- [ ] **Verificar:** Preço normal exibido

#### Teste 6.4: Todos os Cupons Esgotados
- [ ] Produto com 3 cupons, todos esgotados
- [ ] **Verificar:** Sem badge
- [ ] **Verificar:** Preço normal exibido

---

## Comandos SQL para Testes

### Criar Cupom de Teste
```sql
INSERT INTO coupons (
  code, 
  discount_type, 
  discount_value, 
  platform, 
  is_active, 
  is_out_of_stock,
  valid_until
) VALUES (
  'TESTE20',
  'percentage',
  20,
  'shopee',
  true,
  false,
  NOW() + INTERVAL '30 days'
);
```

### Vincular Cupom a Produto
```sql
UPDATE products 
SET coupon_id = (SELECT id FROM coupons WHERE code = 'TESTE20')
WHERE id = 123;
```

### Marcar Cupom como Esgotado
```sql
UPDATE coupons 
SET is_out_of_stock = true 
WHERE code = 'TESTE20';
```

### Criar Múltiplos Cupons para Teste
```sql
-- Cupom 10%
INSERT INTO coupons (code, discount_type, discount_value, platform, is_active, is_out_of_stock)
VALUES ('TESTE10', 'percentage', 10, 'shopee', true, false);

-- Cupom 15%
INSERT INTO coupons (code, discount_type, discount_value, platform, is_active, is_out_of_stock)
VALUES ('TESTE15', 'percentage', 15, 'shopee', true, false);

-- Cupom 20%
INSERT INTO coupons (code, discount_type, discount_value, platform, is_active, is_out_of_stock)
VALUES ('TESTE20', 'percentage', 20, 'shopee', true, false);

-- Vincular todos ao mesmo produto
UPDATE products 
SET coupon_id = (SELECT id FROM coupons WHERE code = 'TESTE20')
WHERE id = 123;

-- Adicionar outros cupons ao array applicable_products
UPDATE coupons 
SET applicable_products = ARRAY[123]
WHERE code IN ('TESTE10', 'TESTE15');
```

---

## Verificação de Logs

### Backend
```bash
# Ver logs de cálculo de cupons
tail -f backend/logs/app.log | grep "cupom\|coupon\|price_with_coupon"

# Ver produtos retornados
tail -f backend/logs/app.log | grep "produtos encontrados"
```

### Frontend (React Native Debugger)
```javascript
// Adicionar console.log temporário em ProductCard.js
console.log('Produto:', product.name);
console.log('Cupons disponíveis:', product.coupons);
console.log('Melhor cupom:', bestCoupon);
console.log('Preço exibido:', displayPrice);
```

---

## Checklist Final

### Funcionalidades
- [ ] Preço com cupom exibido corretamente no grid
- [ ] Melhor cupom selecionado automaticamente
- [ ] Badge mostra código + desconto
- [ ] Cupons esgotados não aparecem
- [ ] Produtos vinculados mostram preço correto
- [ ] Modal de cupom funciona
- [ ] Copiar código funciona

### Performance
- [ ] Scroll suave no grid
- [ ] Sem lag ao renderizar
- [ ] Cálculo de melhor cupom rápido

### Edge Cases
- [ ] Produto sem cupom funciona
- [ ] Produto com cupom esgotado funciona
- [ ] Múltiplos cupons funcionam
- [ ] Cupom sem código funciona

### Visual
- [ ] Badge verde visível
- [ ] Preço riscado legível
- [ ] Preço com cupom em destaque
- [ ] Layout não quebra

---

## Problemas Conhecidos e Soluções

### Problema: Badge não aparece
**Solução:** Verificar se `product.coupons` existe e não está vazio

### Problema: Preço errado
**Solução:** Verificar se backend está retornando `price_with_coupon`

### Problema: Cupom esgotado aparece
**Solução:** Verificar filtro em `CouponsScreen.js` linha 1046

### Problema: Performance ruim
**Solução:** Adicionar `useMemo` na função `getBestCoupon()`

---

## Contato para Suporte

Em caso de problemas:
1. Verificar logs do backend
2. Verificar console do React Native
3. Consultar `COUPON_SYSTEM_IMPROVEMENTS.md`
4. Contatar equipe de desenvolvimento

---

**Última Atualização:** 27 de Fevereiro de 2026
