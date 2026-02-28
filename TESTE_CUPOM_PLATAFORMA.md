# Teste: Filtro de Plataforma em Cupons

## 🚀 Como Testar

### 1. Executar Script de Teste Automatizado

```bash
cd backend
node scripts/test-coupon-platform-filter.js
```

**Saída esperada:**
```
🧪 Iniciando teste de filtro de plataforma em cupons...

📦 Buscando produtos de teste...
✅ Encontrados 10 produtos

📊 Produtos por plataforma:
   shopee: 5 produto(s)
   amazon: 3 produto(s)
   mercadolivre: 2 produto(s)

🎫 Buscando cupons gerais...
✅ Encontrados 3 cupons gerais

📊 Cupons por plataforma:
   shopee: 1 cupom(ns)
      - SHOPEE50
   amazon: 1 cupom(ns)
      - AMAZON20
   general: 1 cupom(ns)
      - UNIVERSAL10

🔍 Testando lógica de filtro...

📦 Produto: Fone Bluetooth (shopee)
   Cupons aplicáveis: 2
      ✅ SHOPEE50 (shopee)
      ✅ UNIVERSAL10 (general)
   ✅ Filtro correto: nenhum cupom de outra plataforma

📦 Produto: Notebook Gamer (amazon)
   Cupons aplicáveis: 2
      ✅ AMAZON20 (amazon)
      ✅ UNIVERSAL10 (general)
   ✅ Filtro correto: nenhum cupom de outra plataforma

═══════════════════════════════════════════════════════════
📊 RESUMO DOS TESTES
═══════════════════════════════════════════════════════════
Total de testes: 10
✅ Passou: 10
❌ Falhou: 0

🎉 TODOS OS TESTES PASSARAM!
✅ Cupons gerais estão sendo filtrados corretamente por plataforma
```

---

## 🧪 Teste Manual no Admin Panel

### 1. Criar Cupom de Teste

1. Acesse: http://localhost:5173
2. Vá em **Cupons** → **Novo Cupom**
3. Preencha:
   ```
   Código: TESTE_SHOPEE_GERAL
   Plataforma: Shopee
   Tipo: Porcentagem
   Valor: 50
   Aplicabilidade: Todos os Produtos
   ```
4. Salve o cupom

### 2. Verificar Produtos

1. Vá em **Produtos**
2. Filtre por plataforma: **Shopee**
3. Abra um produto da Shopee
4. ✅ Deve mostrar o cupom `TESTE_SHOPEE_GERAL`

5. Filtre por plataforma: **Amazon**
6. Abra um produto da Amazon
7. ❌ NÃO deve mostrar o cupom `TESTE_SHOPEE_GERAL`

---

## 📱 Teste Manual no App Mobile

### 1. Abrir Produto da Shopee

1. Abra o app
2. Vá em **Produtos**
3. Filtre por **Shopee**
4. Abra um produto
5. Role até a seção de cupons
6. ✅ Deve aparecer: `TESTE_SHOPEE_GERAL`

### 2. Abrir Produto de Outra Plataforma

1. Volte para **Produtos**
2. Filtre por **Amazon**
3. Abra um produto
4. Role até a seção de cupons
5. ❌ NÃO deve aparecer: `TESTE_SHOPEE_GERAL`

---

## 🔧 Teste via API

### 1. Buscar Produto da Shopee

```bash
# Substitua {product-id} por um ID real de produto Shopee
curl http://localhost:3000/api/products/{product-id}
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Produto Shopee",
    "platform": "shopee",
    "applicable_coupons": [
      {
        "code": "TESTE_SHOPEE_GERAL",
        "platform": "shopee",
        "is_general": true
      }
    ]
  }
}
```

### 2. Buscar Produto da Amazon

```bash
# Substitua {product-id} por um ID real de produto Amazon
curl http://localhost:3000/api/products/{product-id}
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Produto Amazon",
    "platform": "amazon",
    "applicable_coupons": [
      // NÃO deve incluir TESTE_SHOPEE_GERAL
    ]
  }
}
```

---

## 🎯 Cenários de Teste

### Cenário 1: Cupom Geral da Shopee
```
Cupom: SHOPEE50 (shopee, is_general=true)

Produto Shopee:    ✅ Deve aparecer
Produto Amazon:    ❌ NÃO deve aparecer
Produto ML:        ❌ NÃO deve aparecer
```

### Cenário 2: Cupom Universal
```
Cupom: UNIVERSAL10 (general, is_general=true)

Produto Shopee:    ✅ Deve aparecer
Produto Amazon:    ✅ Deve aparecer
Produto ML:        ✅ Deve aparecer
```

### Cenário 3: Cupom Específico
```
Cupom: PRODUTO123 (amazon, is_general=false, applicable_products=[id1, id2])

Produto id1:       ✅ Deve aparecer
Produto id2:       ✅ Deve aparecer
Outros produtos:   ❌ NÃO deve aparecer
```

---

## ✅ Checklist de Validação

- [ ] Script de teste executado com sucesso
- [ ] Todos os testes automatizados passaram
- [ ] Cupom Shopee aparece em produtos Shopee
- [ ] Cupom Shopee NÃO aparece em produtos Amazon
- [ ] Cupom universal aparece em todos os produtos
- [ ] API retorna cupons corretos
- [ ] App mobile exibe cupons corretos
- [ ] Admin panel mostra vinculações corretas

---

## 🐛 Solução de Problemas

### Problema: Cupom aparece em plataforma errada

**Verificar:**
1. Campo `platform` do cupom está correto?
2. Campo `is_general` está como `true`?
3. Backend foi reiniciado após a correção?

**Solução:**
```bash
# Reiniciar backend
cd backend
pm2 restart backend
# ou
npm run dev
```

### Problema: Script de teste falha

**Verificar:**
1. Variáveis de ambiente configuradas?
2. Supabase acessível?
3. Produtos e cupons existem no banco?

**Solução:**
```bash
# Verificar .env
cat backend/.env | grep SUPABASE

# Testar conexão
node -e "import('dotenv').then(d => d.config()); console.log(process.env.SUPABASE_URL)"
```

### Problema: Nenhum cupom encontrado

**Criar cupom de teste:**
```sql
-- No Supabase SQL Editor
INSERT INTO coupons (
  code, platform, discount_type, discount_value,
  is_general, is_active, valid_from
) VALUES (
  'TESTE_AUTO', 'shopee', 'percentage', 50,
  true, true, NOW()
);
```

---

## 📊 Logs de Debug

Para ver logs detalhados durante o teste:

```bash
# Backend
tail -f backend/logs/app.log

# Filtrar apenas logs de cupons
tail -f backend/logs/app.log | grep -i coupon
```

---

## 🎉 Resultado Esperado

Após a correção:
- ✅ Cupons gerais respeitam a plataforma
- ✅ Cupons universais (platform='general') funcionam em todos
- ✅ Cupons específicos continuam funcionando
- ✅ Experiência do usuário mais consistente
- ✅ Menos confusão com cupons incompatíveis

---

## 📚 Documentação Relacionada

- `CORRECAO_CUPOM_PLATAFORMA.md` - Documentação completa da correção
- `backend/src/models/Coupon.js` - Código corrigido
- `backend/scripts/test-coupon-platform-filter.js` - Script de teste
