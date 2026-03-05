# ✅ Correção da Migração de Template

## 🔍 Problema Identificado

**Erro original:**
```
ERROR: 42P01: relation "bot_templates" does not exist
```

**Causa:**
- A tabela correta é `bot_message_templates` (não `bot_templates`)
- A coluna de conteúdo é `template` (não `content`)
- A constraint CHECK não incluía `out_of_stock_coupon`

## ✅ Correções Aplicadas

### 1. Nome da Tabela
```diff
- FROM bot_templates
+ FROM bot_message_templates
```

### 2. Nome das Colunas
```diff
- INSERT INTO bot_message_templates (type, platform, content, ...)
+ INSERT INTO bot_message_templates (template_type, platform, template, ...)
```

### 3. Constraint CHECK
A migração agora:
1. Remove a constraint antiga
2. Adiciona nova constraint incluindo `out_of_stock_coupon`
3. Cria os templates

## 🚀 Aplicar Migração Corrigida

```bash
cd backend
node scripts/apply-out-of-stock-template.js
```

**Ou manualmente:**
```bash
psql -h <host> -U <user> -d <database> -f backend/database/migrations/add_out_of_stock_template.sql
```

## 📊 Estrutura da Tabela

```sql
CREATE TABLE bot_message_templates (
  id UUID PRIMARY KEY,
  template_type VARCHAR(50) NOT NULL,  -- 'out_of_stock_coupon'
  platform VARCHAR(20),                 -- 'telegram' ou 'whatsapp'
  template TEXT NOT NULL,               -- Conteúdo do template
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,
  description TEXT,
  available_variables JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## ✅ Verificar Sucesso

```bash
# Executar teste
node backend/scripts/test-bug-fixes.js
```

**Resultado esperado:**
```
📋 Teste 1: Template out_of_stock_coupon
   ✅ Templates encontrados e ativos
      - Telegram: ⚠️ *CUPOM ESGOTADO* ⚠️...
      - WhatsApp: ⚠️ *CUPOM ESGOTADO* ⚠️...
```

## 🔍 Verificação Manual

```sql
-- Verificar templates criados
SELECT 
  template_type, 
  platform, 
  is_active,
  LEFT(template, 50) as preview
FROM bot_message_templates 
WHERE template_type = 'out_of_stock_coupon';
```

**Resultado esperado:**
```
template_type        | platform  | is_active | preview
---------------------|-----------|-----------|------------------
out_of_stock_coupon  | telegram  | t         | ⚠️ *CUPOM ESGOTADO* ⚠️...
out_of_stock_coupon  | whatsapp  | t         | ⚠️ *CUPOM ESGOTADO* ⚠️...
```

## 📝 Notas

- A migração é idempotente (pode ser executada múltiplas vezes)
- Templates são marcados como `is_system = true`
- Constraint CHECK agora permite 5 tipos de template:
  - `new_promotion`
  - `promotion_with_coupon`
  - `new_coupon`
  - `expired_coupon`
  - `out_of_stock_coupon` ✨ NOVO

## 🎯 Próximos Passos

1. ✅ Migração corrigida
2. ⏳ Aplicar migração
3. ⏳ Testar notificação de cupom esgotado
4. ⏳ Verificar logs

---

**Status:** ✅ Pronto para aplicação
