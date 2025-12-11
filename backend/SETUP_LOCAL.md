# 🚀 Guia de Setup Local - Backend MTW Promo

## 📋 Pré-requisitos

- ✅ Node.js >= 18.0.0
- ✅ npm ou yarn
- ✅ Conta no Supabase
- ✅ Git (opcional)

---

## 🔧 Passo 1: Clonar/Baixar o Projeto

```bash
# Se estiver usando Git
git clone <url-do-repositorio>
cd MTW/backend

# Ou apenas navegue até a pasta
cd backend
```

---

## 📦 Passo 2: Instalar Dependências

```bash
npm install
```

Isso instalará todas as dependências listadas no `package.json`:
- Express, Supabase, Redis, JWT, etc.

---

## ⚙️ Passo 3: Configurar Variáveis de Ambiente

### 3.1 Copiar arquivo de exemplo

```bash
cp .env.example .env
```

### 3.2 Configurar Supabase

1. Acesse [Supabase Dashboard](https://app.supabase.com/)
2. Crie um novo projeto ou use um existente
3. Vá em **Settings** → **API**
4. Copie as credenciais:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_KEY=sua_service_key_aqui
```

### 3.3 Configurar JWT

Gere um secret seguro:

```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Adicione ao `.env`:

```env
JWT_SECRET=seu_secret_gerado_aqui
JWT_REFRESH_SECRET=outro_secret_diferente_aqui
```

### 3.4 Configurar Redis (Opcional)

Se você tiver Redis instalado localmente:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

Se não tiver Redis, o sistema funcionará sem cache.

### 3.5 Configurar Bots (Opcional)

Para usar os bots de WhatsApp/Telegram:

```env
# Telegram
TELEGRAM_BOT_TOKEN=seu_token_do_botfather

# WhatsApp
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN=seu_token_meta
WHATSAPP_PHONE_NUMBER_ID=seu_phone_id
```

### 3.6 Habilitar Cron Jobs

```env
ENABLE_CRON_JOBS=true
```

### 3.7 Configurar Ambiente

```env
NODE_ENV=development
PORT=3000
```

---

## 🗄️ Passo 4: Executar Migrations do Banco

### 4.1 Listar migrations disponíveis

```bash
npm run db:migrate
```

### 4.2 Executar no Supabase

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute na ordem:

**Primeiro - Schema Principal:**
```bash
# Copie o conteúdo de:
database/schema.sql
```

**Depois - Migration dos Bots:**
```bash
# Copie o conteúdo de:
database/migrations/001_add_bot_tables.sql
```

### 4.3 Verificar tabelas criadas

No SQL Editor do Supabase, execute:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Você deve ver:
- users
- products
- coupons
- categories
- notifications
- click_tracking
- price_history
- bot_channels ✨
- notification_logs ✨

---

## ✅ Passo 5: Verificar Setup

Execute o script de verificação:

```bash
npm run setup
```

Este script verifica:
- ✅ Versão do Node.js
- ✅ Arquivos essenciais
- ✅ Variáveis de ambiente
- ✅ Diretórios necessários

---

## 🚀 Passo 6: Iniciar o Servidor

### Modo Desenvolvimento (com auto-reload)

```bash
npm run dev
```

### Modo Produção

```bash
npm start
```

### Modo Debug

```bash
npm run dev:debug
```

---

## 🧪 Passo 7: Testar a API

### 7.1 Health Check Automático

```bash
npm run check
```

### 7.2 Teste Manual

Abra o navegador ou use curl:

```bash
# Rota raiz
curl http://localhost:3000/

# Health check
curl http://localhost:3000/api/health
```

Resposta esperada:
```json
{
  "success": true,
  "message": "API MTW Promo está funcionando",
  "timestamp": "2024-12-11T..."
}
```

---

## 📊 Passo 8: Verificar Logs

### Ver logs em tempo real

```bash
npm run logs
```

### Ver apenas erros

```bash
npm run logs:error
```

### Logs manuais

```bash
# Linux/Mac
tail -f logs/app.log

# Windows (PowerShell)
Get-Content logs/app.log -Wait -Tail 50
```

---

## 🤖 Passo 9: Configurar Bots (Opcional)

Se você configurou os tokens dos bots, siga o guia:

```bash
# Ver guia rápido
cat ../BOTS_QUICK_START.md

# Ou abra no navegador/editor
```

Passos resumidos:
1. Criar bot no Telegram (@BotFather)
2. Obter Chat ID do grupo
3. Cadastrar canal via API
4. Testar envio

---

## 🔍 Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Iniciar com auto-reload
npm run dev:debug        # Iniciar com debugger

# Testes
npm test                 # Executar testes
npm run test:watch       # Testes em modo watch
npm run test:coverage    # Cobertura de testes

# Qualidade de Código
npm run lint             # Verificar código
npm run lint:fix         # Corrigir automaticamente

# Utilitários
npm run setup            # Verificar configuração
npm run check            # Health check
npm run db:migrate       # Listar migrations
npm run logs             # Ver logs
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"

```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### Erro: "ECONNREFUSED" ao conectar Supabase

1. Verifique se as credenciais estão corretas no `.env`
2. Teste a conexão no navegador: `https://seu-projeto.supabase.co`
3. Verifique se o projeto Supabase está ativo

### Erro: "Port 3000 already in use"

```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Ou use outra porta no .env
PORT=3001
```

### Cron Jobs não estão rodando

Verifique no `.env`:
```env
ENABLE_CRON_JOBS=true
```

E reinicie o servidor.

### Redis não conecta

Se você não tem Redis instalado, é normal. O sistema funciona sem cache.
Para instalar Redis:

```bash
# Linux
sudo apt-get install redis-server

# Mac
brew install redis

# Windows
# Use Docker ou WSL
```

---

## 📚 Próximos Passos

Após o backend estar rodando:

1. ✅ Testar endpoints da API
2. ✅ Criar usuário admin
3. ✅ Cadastrar categorias
4. ✅ Testar criação de produtos/cupons
5. ✅ Configurar bots (se desejar)
6. 🎯 Iniciar desenvolvimento do Painel Admin
7. 🎯 Iniciar desenvolvimento do Mobile App

---

## 📖 Documentação Adicional

- [README.md](./README.md) - Visão geral do backend
- [BOTS_QUICK_START.md](../BOTS_QUICK_START.md) - Setup rápido dos bots
- [BOTS_DOCUMENTATION.md](../BOTS_DOCUMENTATION.md) - Documentação completa dos bots
- [ARQUITETURA.md](../ARQUITETURA.md) - Arquitetura do sistema

---

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs: `npm run logs`
2. Execute o health check: `npm run check`
3. Revise as variáveis de ambiente
4. Consulte a documentação
5. Verifique se todas as migrations foram executadas

---

## ✅ Checklist de Setup

- [ ] Node.js >= 18 instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env` configurado
- [ ] Credenciais do Supabase adicionadas
- [ ] JWT secrets gerados
- [ ] Migrations executadas no Supabase
- [ ] Servidor iniciado (`npm run dev`)
- [ ] Health check passou (`npm run check`)
- [ ] Logs sem erros (`npm run logs`)
- [ ] Bots configurados (opcional)

---

**🎉 Setup Concluído! Backend pronto para desenvolvimento!**
