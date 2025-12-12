# ⚡ Comandos Rápidos - MTW Promo

## 🚀 Iniciar Desenvolvimento

### Backend

```bash
# Navegar para o backend
cd backend

# Instalar dependências (primeira vez)
npm install

# Iniciar servidor em modo desenvolvimento
npm run dev

# Iniciar com debugger
npm run dev:debug
```

### Verificar se está funcionando

```bash
# Opção 1: Health check automático
npm run check

# Opção 2: PowerShell script (Windows)
.\test-backend.ps1

# Opção 3: Navegador
# Abra: http://localhost:3000
```

---

## 🗄️ Banco de Dados

### Executar Migrations

1. Acesse: https://app.supabase.com/
2. Vá em **SQL Editor**
3. Execute na ordem:
   - `database/schema.sql`
   - `database/migrations/001_add_bot_tables.sql`

### Verificar Tabelas

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Listar Migrations Disponíveis

```bash
npm run db:migrate
```

---

## 🧪 Testes

### Testar API

```bash
# Health check
curl http://localhost:3000/api/health

# Ou no PowerShell
Invoke-WebRequest http://localhost:3000/api/health
```

### Testar Endpoints dos Bots

```bash
# Listar canais (precisa de autenticação)
curl http://localhost:3000/api/bots/channels -H "Authorization: Bearer SEU_TOKEN"

# Status dos bots
curl http://localhost:3000/api/bots/status -H "Authorization: Bearer SEU_TOKEN"
```

---

## 📊 Logs

### Ver Logs em Tempo Real

```bash
# Linux/Mac
npm run logs

# Windows PowerShell
Get-Content logs/app.log -Wait -Tail 50
```

### Ver Apenas Erros

```bash
# Linux/Mac
npm run logs:error

# Windows PowerShell
Get-Content logs/app.log -Wait | Select-String "ERROR"
```

---

## 🔧 Utilitários

### Verificar Configuração

```bash
npm run setup
```

### Verificar Versão do Node

```bash
node --version
# Deve ser >= 18.0.0
```

### Limpar e Reinstalar

```bash
# Remover node_modules
rm -rf node_modules package-lock.json

# Reinstalar
npm install
```

---

## 🤖 Bots (Depois que o backend estiver rodando)

### Configurar Telegram

1. Fale com @BotFather no Telegram
2. Crie um bot: `/newbot`
3. Copie o token
4. Adicione ao `.env`: `TELEGRAM_BOT_TOKEN=seu_token`

### Obter Chat ID

1. Adicione @getidsbot ao seu grupo
2. Copie o Chat ID (começa com `-`)
3. Remova o bot do grupo

### Cadastrar Canal

```bash
curl -X POST http://localhost:3000/api/bots/channels \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "identifier": "-1001234567890",
    "name": "Grupo Principal",
    "is_active": true
  }'
```

### Testar Bot

```bash
curl -X POST http://localhost:3000/api/bots/test \
  -H "Authorization: Bearer TOKEN"
```

---

## 🐛 Troubleshooting

### Porta 3000 já está em uso

```powershell
# Ver processo usando a porta
netstat -ano | findstr :3000

# Matar processo
taskkill /PID <PID> /F

# Ou mudar porta no .env
# PORT=3001
```

### Erro de conexão com Supabase

1. Verifique `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
2. Teste no navegador: `https://seu-projeto.supabase.co`
3. Verifique se o projeto está ativo

### Cron jobs não funcionam

Verifique no `.env`:
```
ENABLE_CRON_JOBS=true
```

---

## 📁 Estrutura de Pastas

```
backend/
├── src/
│   ├── config/          # Configurações
│   ├── controllers/     # Lógica de negócio
│   ├── middlewares/     # Middlewares
│   ├── models/          # Models do banco
│   ├── routes/          # Rotas da API
│   ├── services/        # Serviços (bots, cron, etc)
│   ├── utils/           # Utilitários
│   └── server.js        # Entry point
├── scripts/             # Scripts utilitários
├── logs/                # Logs da aplicação
├── .env                 # Variáveis de ambiente
└── package.json         # Dependências
```

---

## 🎯 Fluxo de Trabalho Típico

### 1. Primeira Vez

```bash
cd backend
npm install
npm run setup
# Configurar .env
# Executar migrations no Supabase
npm run dev
npm run check
```

### 2. Desenvolvimento Diário

```bash
cd backend
npm run dev
# Desenvolver...
npm run logs  # Em outro terminal
```

### 3. Antes de Commit

```bash
npm run lint
npm test
```

---

## 📚 Documentação

- [SETUP_LOCAL.md](backend/SETUP_LOCAL.md) - Setup completo
- [EXECUTAR_MIGRATIONS.md](EXECUTAR_MIGRATIONS.md) - Migrations
- [BOTS_QUICK_START.md](BOTS_QUICK_START.md) - Configurar bots
- [BOTS_DOCUMENTATION.md](BOTS_DOCUMENTATION.md) - Referência completa
- [PROGRESSO.md](PROGRESSO.md) - Status do projeto

---

## 🔑 Variáveis de Ambiente Essenciais

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_KEY=sua_service_key

# JWT
JWT_SECRET=seu_secret_aqui
JWT_REFRESH_SECRET=outro_secret_aqui

# Server
NODE_ENV=development
PORT=3000

# Cron Jobs
ENABLE_CRON_JOBS=true

# Bots (opcional)
TELEGRAM_BOT_TOKEN=seu_token
```

---

## ⚡ Atalhos Úteis

```bash
# Desenvolvimento
npm run dev              # Iniciar servidor
npm run dev:debug        # Com debugger
npm run logs             # Ver logs

# Testes
npm run check            # Health check
npm test                 # Testes unitários

# Qualidade
npm run lint             # Verificar código
npm run lint:fix         # Corrigir automaticamente

# Utilitários
npm run setup            # Verificar setup
npm run db:migrate       # Ver migrations
```

---

**💡 Dica**: Mantenha este arquivo aberto para referência rápida!
