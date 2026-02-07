# 🔧 Correção do Erro: max_discount_value

## ❌ Erro Encontrado
```
error: Error: Could not find the 'max_discount_value' column of 'coupons' in the schema cache
```

## 🔍 Causa
O esquema do banco de dados tinha a coluna `max_discount` mas o código da aplicação espera `max_discount_value`.

## ✅ Solução Aplicada

### 1. Arquivos Atualizados

#### `database/production/01_schema.sql` (Linha 320)
- **Antes:** `max_discount DECIMAL(10,2),`
- **Depois:** `max_discount_value DECIMAL(10,2),`

#### `database/production/02_fix_max_discount_column.sql` (NOVO)
- Migração criada para renomear/criar a coluna no banco de dados existente
- Safe para executar múltiplas vezes
- Verifica automaticamente o estado atual da coluna

### 2. Como Aplicar a Correção

#### **Opção A: Via Supabase SQL Editor (Recomendado)**

1. Acesse seu projeto no Supabase
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `database/production/02_fix_max_discount_column.sql`
4. Execute o script
5. Verifique a mensagem de sucesso

#### **Opção B: Via Backend Script**

```bash
cd backend
node apply-migration.js
```

**Nota:** Esta opção pode não funcionar se você não tiver permissões diretas. Use a Opção A se houver problemas.

### 3. Verificação

Após aplicar a migração, o erro `Could not find the 'max_discount_value' column` deve desaparecer.

Para verificar manualmente se a coluna existe:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'coupons' 
  AND column_name = 'max_discount_value';
```

## 📝 Notas Importantes

- ✅ A migração é **idempotente** (seguro executar múltiplas vezes)
- ✅ O schema principal (`01_schema.sql`) foi atualizado para novos deployments
- ✅ A documentação (`README.md`) foi atualizada com instruções
- ✅ Se você recriar o banco do zero, agora usará `max_discount_value` desde o início

## 🎯 Próximos Passos

1. Execute a migração no Supabase SQL Editor
2. Reinicie seu backend se estiver rodando
3. Teste a aplicação para confirmar que o erro foi resolvido

---

**Data da Correção:** 2026-01-06  
**Arquivos Modificados:**
- `database/production/01_schema.sql`
- `database/production/02_fix_max_discount_column.sql` (novo)
- `database/production/README.md`
- `backend/apply-migration.js` (novo)
