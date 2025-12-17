# 🗄️ Configuração do Banco de Dados

Guia completo para configurar o banco de dados Supabase.

## 📋 Pré-requisitos

- Conta no [Supabase](https://supabase.com)
- Projeto criado no Supabase

## 🚀 Setup Inicial

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Clique em "New Project"
3. Preencha:
   - **Name**: MTW Promo
   - **Database Password**: (anote esta senha!)
   - **Region**: Escolha a mais próxima
4. Aguarde a criação (2-3 minutos)

### 2. Obter Credenciais

No dashboard do Supabase:
1. Vá em **Settings** > **API**
2. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY` (⚠️ Secreta!)

### 3. Executar Schema

1. No Supabase, vá em **SQL Editor**
2. Abra o arquivo `database/schema.sql`
3. Cole o conteúdo e execute
4. Verifique se todas as tabelas foram criadas

### 4. Executar Migrations

Execute as migrations em ordem numérica:

```sql
-- Migration 001
-- Migration 002
-- ...
-- Migration 019
```

**Importante**: Execute na ordem correta!

## 📊 Estrutura do Banco

### Tabelas Principais

- `users` - Usuários do sistema
- `products` - Produtos em promoção
- `coupons` - Cupons de desconto
- `categories` - Categorias de produtos
- `notifications` - Notificações do sistema
- `bot_channels` - Canais de bots
- `bot_message_templates` - Templates de mensagens
- `telegram_channels` - Canais Telegram monitorados
- `telegram_collector_config` - Configuração do coletor
- `app_settings` - Configurações gerais

### Tabelas de Suporte

- `favorites` - Produtos favoritos
- `click_tracking` - Rastreamento de cliques
- `notification_logs` - Logs de notificações
- `sync_logs` - Logs de sincronização
- `coupon_sync_logs` - Logs de captura de cupons

## 🔐 Segurança (RLS)

O Supabase usa Row Level Security (RLS). As políticas estão definidas no schema.

**Importante**: Não desative o RLS sem entender as implicações de segurança!

## 🔄 Migrations

### Executar Manualmente

1. Abra o SQL Editor no Supabase
2. Cole o conteúdo da migration
3. Execute

### Executar via Script

```bash
cd backend
npm run db:migrate
```

## 📝 Seed de Dados

### Criar Admin Inicial

```bash
cd backend
node scripts/create-admin.js
```

Ou execute diretamente no SQL Editor:

```sql
-- Ver database/seed-admin.sql
```

## ✅ Verificação

Após configurar, verifique:

1. **Tabelas criadas**: Vá em **Table Editor** e confirme todas as tabelas
2. **Admin criado**: Faça login no admin panel
3. **Conexão funcionando**: Backend deve conectar sem erros

## 🆘 Problemas Comuns

### Erro de Conexão
- Verifique `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`
- Confirme que o projeto está ativo

### Tabelas não criadas
- Execute o schema novamente
- Verifique erros no SQL Editor

### RLS bloqueando acesso
- Verifique as políticas no Supabase
- Confirme que está usando a chave correta

## 📚 Próximos Passos

1. [Configurar Variáveis de Ambiente](./environment.md)
2. [Criar Usuário Admin](./admin-user.md)
3. [Testar Conexão](./quick-test.md)

---

**Próximo**: [Variáveis de Ambiente](./environment.md)





