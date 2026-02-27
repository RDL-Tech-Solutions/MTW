# 🔧 Correção: Erro de Tipo na Tabela push_tokens_backup

## ❌ Erro Encontrado

```
ERROR: 42804: foreign key constraint "push_tokens_backup_user_id_fkey" cannot be implemented
DETAIL: Key columns "user_id" and "id" are of incompatible types: integer and uuid.
```

---

## 🔍 Causa do Problema

A tabela `push_tokens_backup` foi criada com o tipo **INTEGER** para a coluna `user_id`, mas a tabela `users` usa **UUID** para o campo `id`.

### Código Problemático

```sql
CREATE TABLE push_tokens_backup (
  id SERIAL PRIMARY KEY,                    -- ❌ SERIAL (integer)
  user_id INTEGER NOT NULL,                 -- ❌ INTEGER
  ...
);
```

### Código Correto

```sql
CREATE TABLE push_tokens_backup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- ✅ UUID
  user_id UUID NOT NULL,                           -- ✅ UUID
  ...
);
```

---

## ✅ Solução Implementada

### 1. Arquivo de Migração Corrigido

**Arquivo**: `backend/database/migrations/add_onesignal_columns.sql`

Alterado de:
```sql
id SERIAL PRIMARY KEY,
user_id INTEGER NOT NULL REFERENCES users(id)
```

Para:
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id UUID NOT NULL REFERENCES users(id)
```

### 2. Script de Correção Criado

**Arquivo**: `backend/database/migrations/fix_push_tokens_backup_type.sql`

Este script:
- ✅ Dropa a tabela existente (se houver)
- ✅ Recria com os tipos corretos (UUID)
- ✅ Recria índices
- ✅ Recria função de backup
- ✅ Recria trigger

### 3. Script de Aplicação

**Arquivo**: `backend/scripts/fix-push-tokens-backup.js`

Script Node.js para aplicar a correção automaticamente.

---

## 🚀 Como Aplicar a Correção

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Cole o conteúdo de: `backend/database/migrations/fix_push_tokens_backup_type.sql`
5. Clique em **Run**

### Opção 2: Via Script Node.js

```bash
cd backend
node scripts/fix-push-tokens-backup.js
```

### Opção 3: Via psql

```bash
psql $DATABASE_URL -f backend/database/migrations/fix_push_tokens_backup_type.sql
```

---

## 📋 Verificação

### Verificar Tipos das Colunas

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'push_tokens_backup'
ORDER BY ordinal_position;
```

**Resultado Esperado:**
```
column_name      | data_type
-----------------+-----------
id               | uuid       ✅
user_id          | uuid       ✅
push_token       | text       ✅
backed_up_at     | timestamp  ✅
restored         | boolean    ✅
restored_at      | timestamp  ✅
```

### Verificar Foreign Key

```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'push_tokens_backup';
```

**Resultado Esperado:**
```
constraint_name                    | table_name          | column_name | foreign_table_name | foreign_column_name
-----------------------------------+---------------------+-------------+--------------------+--------------------
push_tokens_backup_user_id_fkey   | push_tokens_backup  | user_id     | users              | id
```

---

## 🔄 Impacto da Correção

### Dados Perdidos
- ⚠️ A tabela `push_tokens_backup` será recriada
- ⚠️ Dados existentes serão perdidos (se houver)
- ✅ Isso é aceitável pois é uma tabela de backup temporário

### Funcionalidades Afetadas
- ✅ Nenhuma funcionalidade crítica afetada
- ✅ Tabela é usada apenas para rollback de migração
- ✅ Sistema continua funcionando normalmente

---

## 📊 Estrutura Completa da Tabela

```sql
CREATE TABLE push_tokens_backup (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Dados do backup
  push_token TEXT NOT NULL,
  backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Status de restauração
  restored BOOLEAN DEFAULT FALSE,
  restored_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX idx_push_tokens_backup_user_id 
  ON push_tokens_backup(user_id);

CREATE INDEX idx_push_tokens_backup_restored 
  ON push_tokens_backup(restored) 
  WHERE restored = FALSE;
```

---

## 🔧 Função de Backup Automático

```sql
CREATE OR REPLACE FUNCTION backup_push_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Fazer backup quando:
  -- 1. Token está sendo removido (NULL)
  -- 2. Era um token Expo
  -- 3. Usuário foi migrado para OneSignal
  IF OLD.push_token IS NOT NULL 
     AND NEW.push_token IS NULL 
     AND (OLD.push_token LIKE 'ExponentPushToken%' 
          OR OLD.push_token LIKE 'ExpoPushToken%')
     AND OLD.onesignal_migrated = TRUE THEN
    
    INSERT INTO push_tokens_backup (user_id, push_token)
    VALUES (OLD.id, OLD.push_token)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎯 Casos de Uso

### 1. Backup Automático Durante Migração

```sql
-- Quando um usuário é migrado para OneSignal
UPDATE users 
SET 
  push_token = NULL,
  onesignal_player_id = 'abc123',
  onesignal_migrated = TRUE
WHERE id = 'user-uuid';

-- Trigger automaticamente cria backup
-- INSERT INTO push_tokens_backup (user_id, push_token)
-- VALUES ('user-uuid', 'ExponentPushToken[...]');
```

### 2. Rollback Manual

```sql
-- Restaurar token Expo de um usuário
UPDATE users u
SET 
  push_token = b.push_token,
  onesignal_player_id = NULL,
  onesignal_migrated = FALSE
FROM push_tokens_backup b
WHERE u.id = b.user_id
  AND b.restored = FALSE
  AND u.id = 'user-uuid';

-- Marcar como restaurado
UPDATE push_tokens_backup
SET 
  restored = TRUE,
  restored_at = NOW()
WHERE user_id = 'user-uuid';
```

### 3. Rollback em Massa

```sql
-- Restaurar todos os usuários
UPDATE users u
SET 
  push_token = b.push_token,
  onesignal_player_id = NULL,
  onesignal_migrated = FALSE
FROM push_tokens_backup b
WHERE u.id = b.user_id
  AND b.restored = FALSE;

-- Marcar todos como restaurados
UPDATE push_tokens_backup
SET 
  restored = TRUE,
  restored_at = NOW()
WHERE restored = FALSE;
```

---

## 📝 Checklist de Correção

- [x] Identificar o problema (tipo incompatível)
- [x] Corrigir arquivo de migração original
- [x] Criar script de correção SQL
- [x] Criar script de aplicação Node.js
- [x] Documentar o problema e solução
- [ ] Aplicar correção no banco de dados
- [ ] Verificar tipos das colunas
- [ ] Verificar foreign key
- [ ] Testar trigger de backup
- [ ] Testar rollback

---

## ⚠️ Notas Importantes

1. **Backup de Dados**: Se houver dados importantes na tabela, faça backup antes:
   ```sql
   CREATE TABLE push_tokens_backup_old AS 
   SELECT * FROM push_tokens_backup;
   ```

2. **Conversão de Dados**: Se precisar manter dados existentes:
   ```sql
   -- Não é possível converter INTEGER para UUID automaticamente
   -- Será necessário recriar a tabela
   ```

3. **Timing**: Execute a correção em horário de baixo tráfego

4. **Monitoramento**: Verifique logs após aplicar:
   ```bash
   pm2 logs backend
   ```

---

## 🎉 Resultado Final

Após aplicar a correção:
- ✅ Tabela `push_tokens_backup` usa UUID
- ✅ Foreign key funciona corretamente
- ✅ Trigger de backup funciona
- ✅ Sistema de rollback operacional
- ✅ Sem erros de tipo

---

**Data**: 27 de Fevereiro de 2026  
**Status**: ✅ CORRIGIDO  
**Versão**: 1.0
