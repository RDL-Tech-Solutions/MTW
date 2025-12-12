# 🗄️ Executar Migrations - Guia Rápido

## 📋 Ordem de Execução

Execute as migrations **nesta ordem exata**:

1. ✅ **Schema Principal** - `database/schema.sql`
2. ✅ **Bots** - `database/migrations/001_add_bot_tables.sql`

---

## 🚀 Passo a Passo

### 1️⃣ Acessar Supabase Dashboard

1. Acesse: https://app.supabase.com/
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**

---

### 2️⃣ Executar Schema Principal

**Arquivo**: `database/schema.sql`

1. No SQL Editor, clique em **New Query**
2. Copie **TODO** o conteúdo de `database/schema.sql`
3. Cole no editor
4. Clique em **Run** (ou pressione Ctrl+Enter)
5. Aguarde a execução (pode levar 10-20 segundos)
6. ✅ Verifique se apareceu "Success. No rows returned"

**O que este script cria:**
- ✅ Tabela `users`
- ✅ Tabela `categories`
- ✅ Tabela `products`
- ✅ Tabela `coupons`
- ✅ Tabela `notifications`
- ✅ Tabela `click_tracking`
- ✅ Tabela `price_history`
- ✅ Índices otimizados
- ✅ Triggers automáticos
- ✅ Views úteis
- ✅ Funções SQL
- ✅ Políticas RLS (Row Level Security)

---

### 3️⃣ Executar Migration dos Bots

**Arquivo**: `database/migrations/001_add_bot_tables.sql`

1. No SQL Editor, clique em **New Query** novamente
2. Copie **TODO** o conteúdo de `database/migrations/001_add_bot_tables.sql`
3. Cole no editor
4. Clique em **Run** (ou pressione Ctrl+Enter)
5. Aguarde a execução
6. ✅ Verifique se apareceu "Success. No rows returned"

**O que este script cria:**
- ✅ Tabela `bot_channels` (canais de bot)
- ✅ Tabela `notification_logs` (logs de notificações)
- ✅ Índices otimizados
- ✅ Triggers de atualização
- ✅ Políticas RLS
- ✅ Função de limpeza automática de logs

---

### 4️⃣ Verificar Tabelas Criadas

Execute este comando no SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Você deve ver estas 9 tabelas:**
- ✅ bot_channels
- ✅ categories
- ✅ click_tracking
- ✅ coupons
- ✅ notification_logs
- ✅ notifications
- ✅ price_history
- ✅ products
- ✅ users

---

### 5️⃣ Verificar Políticas RLS

Execute:

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

Você deve ver várias políticas de segurança configuradas.

---

### 6️⃣ Criar Usuário Admin (Opcional)

Se quiser criar um usuário admin para testes:

```sql
-- Inserir usuário admin
INSERT INTO users (
  email,
  password_hash,
  full_name,
  role,
  is_active
) VALUES (
  'admin@mtwpromo.com',
  '$2a$10$YourHashedPasswordHere', -- Você vai criar via API depois
  'Administrador',
  'admin',
  true
);
```

**Nota**: É melhor criar o usuário admin via API depois que o backend estiver rodando.

---

## ✅ Checklist de Verificação

Após executar as migrations, verifique:

- [ ] Schema principal executado sem erros
- [ ] Migration dos bots executada sem erros
- [ ] 9 tabelas criadas (verificado via SQL)
- [ ] Políticas RLS ativas
- [ ] Sem mensagens de erro no console do Supabase

---

## 🐛 Problemas Comuns

### Erro: "relation already exists"

**Causa**: Tabela já existe
**Solução**: Tudo bem, significa que a tabela já foi criada antes. Continue.

### Erro: "permission denied"

**Causa**: Falta de permissões
**Solução**: 
1. Verifique se está usando o projeto correto
2. Use o SQL Editor (não o Table Editor)
3. Tente novamente

### Erro: "syntax error"

**Causa**: SQL copiado incorretamente
**Solução**:
1. Copie novamente o arquivo completo
2. Certifique-se de copiar desde o início até o final
3. Não edite o SQL

---

## 🎯 Próximo Passo

Após executar as migrations com sucesso:

```bash
# No terminal, dentro da pasta backend
npm run dev
```

Isso iniciará o servidor na porta 3000.

---

## 📞 Verificação Rápida

Para verificar se tudo está OK:

```bash
# Em outro terminal
npm run check
```

Ou acesse no navegador:
```
http://localhost:3000/
http://localhost:3000/api/health
```

---

## 📚 Documentação

- [SETUP_LOCAL.md](backend/SETUP_LOCAL.md) - Guia completo de setup
- [BOTS_QUICK_START.md](BOTS_QUICK_START.md) - Configurar bots depois

---

**✅ Migrations executadas? Vamos iniciar o servidor!**
