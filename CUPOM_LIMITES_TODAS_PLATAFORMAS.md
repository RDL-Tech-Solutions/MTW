# Limites de Cupons para Todas as Plataformas

## 📋 Resumo

Os campos `min_purchase` (compra mínima) e `max_discount_value` (desconto máximo) que antes estavam disponíveis apenas para Mercado Livre e Shopee agora estão disponíveis para **todas as plataformas**.

---

## 🎯 Objetivo

Permitir que administradores configurem limites de compra e desconto para cupons de qualquer plataforma (Amazon, AliExpress, Kabum, Magazine Luiza, Pichau, etc.), não apenas Mercado Livre e Shopee.

---

## 🔧 Alterações Realizadas

### 1. Banco de Dados

**Arquivo:** `backend/database/migrations/add_coupon_purchase_limits.sql`

- ✅ Adiciona coluna `min_purchase` (DECIMAL 10,2) - Valor mínimo de compra em R$
- ✅ Adiciona coluna `max_discount_value` (DECIMAL 10,2) - Valor máximo de desconto em R$
- ✅ Cria índices para melhor performance
- ✅ Define valor padrão 0 para `min_purchase`
- ✅ Define valor padrão NULL para `max_discount_value`
- ✅ Adiciona comentários descritivos nas colunas

**Script de Aplicação:** `backend/scripts/apply-coupon-limits-migration.js`

```bash
# Para aplicar a migration:
cd backend
node scripts/apply-coupon-limits-migration.js
```

---

### 2. Admin Panel

**Arquivo:** `admin-panel/src/pages/Coupons.jsx`

#### Antes:
```jsx
{(formData.platform === 'mercadolivre' || formData.platform === 'shopee') && (
  <>
    <div className="space-y-2">
      <Label htmlFor="min_purchase">Compra Mínima (R$)</Label>
      <Input ... />
    </div>
    <div className="space-y-2">
      <Label htmlFor="max_discount_value">Limite Máximo de Desconto (R$)</Label>
      <Input ... />
    </div>
  </>
)}
```

#### Depois:
```jsx
{/* Campos de limites disponíveis para todas as plataformas */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="min_purchase">Compra Mínima (R$)</Label>
    <Input ... />
    <p className="text-xs text-muted-foreground">
      Valor mínimo de compra para usar o cupom
    </p>
  </div>
  <div className="space-y-2">
    <Label htmlFor="max_discount_value">Limite Máximo de Desconto (R$)</Label>
    <Input ... />
    <p className="text-xs text-muted-foreground">
      Valor máximo de desconto que pode ser aplicado
    </p>
  </div>
</div>
```

**Mudanças:**
- ✅ Removida condição `(formData.platform === 'mercadolivre' || formData.platform === 'shopee')`
- ✅ Campos agora aparecem para todas as plataformas
- ✅ Adicionadas descrições explicativas
- ✅ Layout em grid responsivo (2 colunas em desktop, 1 em mobile)
- ✅ Aplicado tanto no modal de criação quanto no modal de edição

---

### 3. App Mobile

#### 3.1 Tela de Cupons (`app/src/screens/coupons/CouponsScreen.js`)

**Antes:**
```jsx
{coupon.min_purchase > 0 && (
  <InfoRow icon="wallet-outline" label="Compra mínima" value={formatPrice(coupon.min_purchase)} colors={colors} />
)}
```

**Depois:**
```jsx
{coupon.min_purchase > 0 && (
  <InfoRow icon="wallet-outline" label="Compra mínima" value={formatPrice(coupon.min_purchase)} colors={colors} />
)}
{coupon.max_discount_value > 0 && (
  <InfoRow icon="trending-down-outline" label="Desconto máximo" value={formatPrice(coupon.max_discount_value)} colors={colors} />
)}
```

#### 3.2 Detalhes do Cupom (`app/src/screens/coupon/CouponDetailsScreen.js`)

**Antes:**
```jsx
{coupon.min_purchase > 0 && (
  <View style={s.conditionRow}>
    <Ionicons name="wallet-outline" size={16} color="#9CA3AF" />
    <Text style={s.conditionText}>Compra mínima: {formatPrice(coupon.min_purchase)}</Text>
  </View>
)}
```

**Depois:**
```jsx
{coupon.min_purchase > 0 && (
  <View style={s.conditionRow}>
    <Ionicons name="wallet-outline" size={16} color="#9CA3AF" />
    <Text style={s.conditionText}>Compra mínima: {formatPrice(coupon.min_purchase)}</Text>
  </View>
)}
{coupon.max_discount_value > 0 && (
  <View style={s.conditionRow}>
    <Ionicons name="trending-down-outline" size={16} color="#9CA3AF" />
    <Text style={s.conditionText}>Desconto máximo: {formatPrice(coupon.max_discount_value)}</Text>
  </View>
)}
```

#### 3.3 Card de Cupom (`app/src/components/coupons/CouponCard.js`)

**Antes:**
```jsx
{coupon.min_purchase > 0 && (
  <Text style={s.conditionText}>
    Mín. R${coupon.min_purchase.toFixed(0)}
  </Text>
)}
```

**Depois:**
```jsx
{coupon.min_purchase > 0 && (
  <Text style={s.conditionText}>
    Mín. R${coupon.min_purchase.toFixed(0)}
  </Text>
)}
{coupon.max_discount_value > 0 && (
  <Text style={s.conditionText}>
    Máx. R${coupon.max_discount_value.toFixed(0)}
  </Text>
)}
```

---

## 📊 Estrutura dos Dados

### Tabela `coupons`

```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY,
  code VARCHAR(50),
  platform VARCHAR(50),
  discount_type VARCHAR(20), -- 'percentage' ou 'fixed'
  discount_value DECIMAL(10, 2),
  min_purchase DECIMAL(10, 2) DEFAULT 0 NOT NULL,      -- NOVO
  max_discount_value DECIMAL(10, 2) DEFAULT NULL,      -- NOVO
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  -- ... outros campos
);
```

### Exemplo de Cupom

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "code": "TECH50",
  "platform": "amazon",
  "discount_type": "percentage",
  "discount_value": 50,
  "min_purchase": 299.00,           // Compra mínima de R$ 299
  "max_discount_value": 150.00,     // Desconto máximo de R$ 150
  "valid_from": "2026-02-28T00:00:00Z",
  "valid_until": "2026-03-31T23:59:59Z",
  "is_active": true
}
```

**Cálculo do desconto:**
- Produto de R$ 500: 50% = R$ 250, mas limitado a R$ 150 → **Desconto final: R$ 150**
- Produto de R$ 200: 50% = R$ 100 → **Desconto final: R$ 100**
- Produto de R$ 100: Não atinge compra mínima → **Cupom não aplicável**

---

## 🎨 Interface do Usuário

### Admin Panel

**Formulário de Cupom:**
```
┌─────────────────────────────────────────────────────┐
│ Código do Cupom: [TECH50____________]              │
│                                                     │
│ Plataforma: [Amazon ▼]                             │
│                                                     │
│ Tipo de Desconto: [Porcentagem ▼]                  │
│ Valor do Desconto: [50___] %                       │
│                                                     │
│ ┌──────────────────┬──────────────────────────┐   │
│ │ Compra Mínima    │ Desconto Máximo          │   │
│ │ [299.00_______]  │ [150.00_______________]  │   │
│ │ R$               │ R$                       │   │
│ │ Valor mínimo de  │ Valor máximo de desconto │   │
│ │ compra para usar │ que pode ser aplicado    │   │
│ │ o cupom          │                          │   │
│ └──────────────────┴──────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### App Mobile

**Card de Cupom:**
```
┌─────────────────────────────────────┐
│ 🏷️ TECH50                          │
│ 50% OFF em Eletrônicos             │
│                                     │
│ 💰 Mín. R$299  📉 Máx. R$150       │
│ 📅 Válido até 31/03/2026           │
└─────────────────────────────────────┘
```

**Detalhes do Cupom:**
```
┌─────────────────────────────────────┐
│ Condições:                          │
│ 💰 Compra mínima: R$ 299,00        │
│ 📉 Desconto máximo: R$ 150,00      │
│ 📅 Válido até: 31/03/2026          │
└─────────────────────────────────────┘
```

---

## 🚀 Como Usar

### 1. Aplicar Migration

```bash
cd backend
node scripts/apply-coupon-limits-migration.js
```

### 2. Criar Cupom com Limites

**Via Admin Panel:**
1. Acesse Cupons → Novo Cupom
2. Preencha os dados básicos
3. Defina a plataforma (qualquer uma)
4. Configure os limites:
   - **Compra Mínima:** Valor mínimo para usar o cupom
   - **Desconto Máximo:** Teto de desconto em reais
5. Salve o cupom

**Via API:**
```javascript
POST /api/coupons
{
  "code": "TECH50",
  "platform": "amazon",
  "discount_type": "percentage",
  "discount_value": 50,
  "min_purchase": 299.00,
  "max_discount_value": 150.00,
  "valid_from": "2026-02-28T00:00:00Z",
  "valid_until": "2026-03-31T23:59:59Z"
}
```

### 3. Visualizar no App

Os usuários verão automaticamente:
- Compra mínima (se > 0)
- Desconto máximo (se > 0)
- Nas listagens e detalhes de cupons

---

## ✅ Benefícios

1. **Flexibilidade:** Limites configuráveis para qualquer plataforma
2. **Controle:** Melhor gestão de promoções e margens
3. **Transparência:** Usuários veem claramente as condições
4. **Consistência:** Mesma funcionalidade em todas as plataformas
5. **Escalabilidade:** Fácil adicionar novas plataformas

---

## 🔍 Validações

### Backend (`backend/src/routes/couponRoutes.js`)

```javascript
// Já implementado no preprocessCouponData
if (req.body.min_purchase !== undefined) {
  if (req.body.min_purchase === '' || req.body.min_purchase === null) {
    req.body.min_purchase = 0;
  } else {
    req.body.min_purchase = parseFloat(req.body.min_purchase) || 0;
  }
}

if (req.body.max_discount_value !== undefined) {
  if (req.body.max_discount_value === '' || req.body.max_discount_value === null) {
    req.body.max_discount_value = null;
  } else {
    req.body.max_discount_value = parseFloat(req.body.max_discount_value) || null;
  }
}
```

### Frontend

- Campos numéricos com `step="0.01"`
- Valores opcionais (podem ficar vazios)
- Formatação automática de moeda no app

---

## 📝 Notas Importantes

1. **Retrocompatibilidade:** Cupons existentes terão `min_purchase = 0` e `max_discount_value = null`
2. **Valores Opcionais:** Ambos os campos são opcionais
3. **Exibição Condicional:** Só aparecem no app se > 0
4. **Backend Preparado:** O backend já processava esses campos corretamente
5. **Sem Breaking Changes:** Nenhuma funcionalidade existente foi quebrada

---

## 🧪 Testes

### Cenários de Teste

1. **Cupom sem limites:**
   - min_purchase = 0
   - max_discount_value = null
   - ✅ Deve funcionar normalmente

2. **Cupom com compra mínima:**
   - min_purchase = 100
   - max_discount_value = null
   - ✅ Deve exigir compra mínima de R$ 100

3. **Cupom com desconto máximo:**
   - min_purchase = 0
   - max_discount_value = 50
   - ✅ Desconto limitado a R$ 50

4. **Cupom com ambos os limites:**
   - min_purchase = 200
   - max_discount_value = 100
   - ✅ Compra mínima R$ 200 e desconto máximo R$ 100

5. **Todas as plataformas:**
   - ✅ Testar com Amazon, AliExpress, Kabum, Magazine Luiza, Pichau

---

## 📚 Referências

- Migration: `backend/database/migrations/add_coupon_purchase_limits.sql`
- Script: `backend/scripts/apply-coupon-limits-migration.js`
- Admin: `admin-panel/src/pages/Coupons.jsx`
- App: 
  - `app/src/screens/coupons/CouponsScreen.js`
  - `app/src/screens/coupon/CouponDetailsScreen.js`
  - `app/src/components/coupons/CouponCard.js`

---

## 🎉 Conclusão

Os campos de limites de cupons agora estão disponíveis para todas as plataformas, proporcionando maior flexibilidade e controle na gestão de promoções. A implementação é retrocompatível e não requer alterações em cupons existentes.
