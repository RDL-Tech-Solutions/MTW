# Migração: Criar Tabela fcm_tokens

## PROBLEMA IDENTIFICADO

A tabela `fcm_tokens` não existe no banco de dados!

**Erro**:
```
ERROR: 42P01: relation "fcm_tokens" does not exist
```

## CAUSA

O sistema foi desenvolvido para usar uma tabela separada `fcm_tokens` para armazenar tokens FCM por dispositivo, mas a migração nunca foi aplicada.

Atualmente, a tabela `users` tem apenas um campo `push_token` que não suporta múltiplos dispositivos por usuário.

## SOLUÇÃO

Criar a tabela `fcm_tokens` com suporte a múltiplos dispositivos por usuário.

## COMO APLICAR A MIGRAÇÃO

### Opção 1: Via Script (Recomendado)

```bash
cd backend
node scripts/apply-fcm-migration.js
```

**O que o script faz**:
1. Lê o arquivo de migração SQL
2. Cria a tabela `fcm_tokens`
3. Cria índices para performance
4. Migra tokens existentes de `users.push_token`
5. Cria triggers e funções auxiliares
6. Verifica se tudo funcionou

**Resultado esperado**:
```
✅ Tabela fcm_tokens criada com sucesso
   - Índices criados
   - Triggers configurados
   - Tokens existentes migrados de users.push_token

📊 Tokens migrados: X
```

---

### Opção 2: Via Supabase Dashboard (Manual)

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Clique em **New Query**
5. Cole o conteúdo de `backend/database/migrations/create_fcm_tokens_table.sql`
6. Clique em **Run**

**Verificar se funcionou**:
```sql
SELECT * FROM fcm_tokens;
```

Se não der erro, a tabela foi criada com sucesso!

---

## ESTRUTURA DA TABELA

```sql
CREATE TABLE fcm_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  fcm_token TEXT NOT NULL UNIQUE,
  platform VARCHAR(20), -- 'android', 'ios', 'web'
  device_id TEXT,
  device_name TEXT,
  app_version TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_used_at TIMESTAMP
);
```

**Vantagens**:
- ✅ Suporta múltiplos dispositivos por usuário
- ✅ Rastreia plataforma (Android/iOS)
- ✅ Rastreia último uso (para limpar tokens antigos)
- ✅ Armazena informações do dispositivo

## MIGRAÇÃO DE DADOS

A migração automaticamente copia tokens existentes de `users.push_token` para `fcm_tokens`:

```sql
INSERT INTO fcm_tokens (user_id, fcm_token, platform, created_at)
SELECT 
  id as user_id,
  push_token as fcm_token,
  'android' as platform,
  created_at
FROM users
WHERE push_token IS NOT NULL 
  AND push_token != ''
  AND LENGTH(push_token) > 20
ON CONFLICT (fcm_token) DO NOTHING;
```

## APÓS A MIGRAÇÃO

### 1. Verificar Tokens Migrados

```bash
cd backend
node scripts/debug-notifications.js
```

Deve mostrar:
```
📊 Total de tokens registrados: X
👥 Usuários com tokens: X
```

### 2. Registrar Novos Tokens

Usuários precisam:
1. Abrir o app
2. Fazer login
3. Aceitar permissão de notificações

O app automaticamente registrará o token via:
```
POST /api/fcm/register
{
  "fcm_token": "...",
  "platform": "android",
  "device_id": "...",
  "device_name": "Samsung Galaxy S21",
  "app_version": "1.0.0"
}
```

### 3. Testar Notificações

```bash
node scripts/test-all-notifications-user.js
```

Deve enviar 10 notificações de teste.

## LIMPEZA DE TOKENS ANTIGOS

A migração cria uma função para limpar tokens não usados há mais de 90 dias:

```sql
SELECT cleanup_old_fcm_tokens();
```

**Recomendação**: Execute mensalmente ou configure um cron job.

## TROUBLESHOOTING

### Erro: "permission denied for table fcm_tokens"

**Causa**: Service key do Supabase não tem permissões

**Solução**: Use a opção 2 (Supabase Dashboard) para aplicar manualmente

---

### Erro: "function exec_sql does not exist"

**Causa**: RPC não está disponível

**Solução**: O script tentará executar statements individuais automaticamente

---

### Erro: "already exists"

**Causa**: Tabela já foi criada

**Solução**: Tudo certo! Pule para "Após a Migração"

---

### Tokens não aparecem após migração

**Causa**: Campo `users.push_token` estava vazio

**Solução**: Normal! Usuários precisam abrir o app e fazer login para registrar tokens FCM

## VERIFICAÇÃO FINAL

Execute estas queries no Supabase SQL Editor:

### 1. Verificar estrutura da tabela
```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'fcm_tokens'
ORDER BY ordinal_position;
```

### 2. Verificar tokens
```sql
SELECT 
  u.email,
  ft.platform,
  ft.device_id,
  ft.created_at,
  LEFT(ft.fcm_token, 30) || '...' as token_preview
FROM fcm_tokens ft
JOIN users u ON u.id = ft.user_id
ORDER BY ft.created_at DESC;
```

### 3. Verificar índices
```sql
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'fcm_tokens';
```

## ROLLBACK (Se Necessário)

Se algo der errado, você pode remover a tabela:

```sql
DROP TABLE IF EXISTS fcm_tokens CASCADE;
```

**ATENÇÃO**: Isso apagará todos os tokens FCM registrados!

## PRÓXIMOS PASSOS

Após aplicar a migração:

1. ✅ Execute `node scripts/debug-notifications.js`
2. ✅ Abra o app e faça login
3. ✅ Verifique se token foi registrado
4. ✅ Teste notificações com `node scripts/test-all-notifications-user.js`
5. ✅ Aprove um produto e verifique se notificação chega

## ARQUIVOS RELACIONADOS

- `backend/database/migrations/create_fcm_tokens_table.sql` - Migração SQL
- `backend/scripts/apply-fcm-migration.js` - Script de aplicação
- `backend/scripts/debug-notifications.js` - Script de debug
- `README_NOTIFICACOES_PUSH.md` - Guia completo

## SUPORTE

Se tiver problemas ao aplicar a migração:

1. Compartilhe o erro completo
2. Compartilhe a saída de:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
   ```
3. Tente a opção 2 (Supabase Dashboard manual)
