# 🗄️ Banco de Dados de Produção

Esta pasta contém os scripts oficiais para configurar o banco de dados no Supabase.

## 🚀 Como Usar

No painel do Supabase (SQL Editor), execute os scripts na seguinte ordem:

### 1. Limpeza (Opcional)
Arquivo: `00_reset.sql`
- **Use com cuidado!**
- Apaga todas as tabelas e dados existentes.
- Execute apenas se quiser começar do zero.

### 2. Schema Principal (Obrigatório)
Arquivo: `01_schema.sql`
- Cria todas as tabelas, índices, funções e dados iniciais.
- Inclui: users, products, coupons, categories, bot_config, sync_config, sync_logs, etc.
- É seguro rodar múltiplas vezes (usa `IF NOT EXISTS`).

### 3. Storage (Opcional)
Arquivo: `02_storage.sql`
- Cria os buckets de armazenamento de imagens (`products`, `temp`) e avatares (`avatars`).
- Configura permissões de acesso e segurança por usuário.

### 4. Templates de Mensagem (Recomendado)
Arquivo: `03_templates.sql`
- Insere os modelos padrão de mensagens para os bots (Telegram/WhatsApp).
- Essencial para que as notificações funcionem corretamente desde o início.

---

## ⚠️ Notes
- Se der erro de "timeout" no script principal, você pode rodá-lo em partes, mas geralmente funciona inteiro.
- Após rodar o `01_schema.sql`, o usuário admin padrão será:
  - **Email:** `admin@mtwpromo.com`
  - **Senha:** `admin123` (Altere imediatamente após o login)

## 📁 Estrutura
```
database/
├── production/     ← USE PARA PRODUÇÃO
│   ├── 00_reset.sql
│   ├── 01_schema.sql
│   ├── 02_storage.sql
│   ├── 03_templates.sql
│   └── README.md
└── archive/        ← Histórico (não usar)
```
