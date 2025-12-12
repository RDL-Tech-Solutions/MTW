# ✅ Checklist de Setup - MTW Promo Backend

## 📋 Status Atual

### ✅ Concluído
- [x] ✅ npm install executado
- [x] ✅ .env configurado com Supabase

### 🔥 Próximos Passos

---

## 🗄️ Passo 1: Executar Migrations no Supabase

### 1.1 Acessar Supabase
- [ ] Acessar https://app.supabase.com/
- [ ] Selecionar projeto
- [ ] Ir em **SQL Editor**

### 1.2 Executar Schema Principal
- [ ] Clicar em **New Query**
- [ ] Abrir arquivo: `database/schema.sql`
- [ ] Copiar **TODO** o conteúdo
- [ ] Colar no SQL Editor
- [ ] Clicar em **Run** (Ctrl+Enter)
- [ ] Verificar mensagem de sucesso

**Tempo estimado**: 2 minutos

### 1.3 Executar Migration dos Bots
- [ ] Clicar em **New Query** novamente
- [ ] Abrir arquivo: `database/migrations/001_add_bot_tables.sql`
- [ ] Copiar **TODO** o conteúdo
- [ ] Colar no SQL Editor
- [ ] Clicar em **Run** (Ctrl+Enter)
- [ ] Verificar mensagem de sucesso

**Tempo estimado**: 1 minuto

### 1.4 Verificar Tabelas Criadas
- [ ] No SQL Editor, executar:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```
- [ ] Confirmar que existem **9 tabelas**:
  - bot_channels ✨
  - categories
  - click_tracking
  - coupons
  - notification_logs ✨
  - notifications
  - price_history
  - products
  - users

**Tempo estimado**: 30 segundos

---

## 🚀 Passo 2: Iniciar o Servidor

### 2.1 Abrir Terminal
- [ ] Abrir terminal/PowerShell
- [ ] Navegar para pasta backend:
```bash
cd backend
```

### 2.2 Iniciar Servidor
- [ ] Executar:
```bash
npm run dev
```

### 2.3 Verificar Inicialização
- [ ] Aguardar mensagens no console
- [ ] Verificar se apareceu:
  - ✅ "Server running on port 3000"
  - ✅ "Connected to Supabase"
  - ✅ "Cron jobs started" (se habilitado)

**Tempo estimado**: 30 segundos

---

## 🧪 Passo 3: Testar a API

### 3.1 Teste Automático (Recomendado)

**Opção A - Script npm:**
- [ ] Abrir **NOVO** terminal (manter o servidor rodando)
- [ ] Navegar para backend: `cd backend`
- [ ] Executar:
```bash
npm run check
```
- [ ] Verificar se todos os checks passaram ✅

**Opção B - Script PowerShell:**
- [ ] Abrir **NOVO** terminal PowerShell
- [ ] Navegar para backend: `cd backend`
- [ ] Executar:
```powershell
.\test-backend.ps1
```
- [ ] Verificar se todos os testes passaram ✅

**Tempo estimado**: 30 segundos

### 3.2 Teste Manual (Opcional)

**Navegador:**
- [ ] Abrir navegador
- [ ] Acessar: http://localhost:3000
- [ ] Verificar resposta JSON
- [ ] Acessar: http://localhost:3000/api/health
- [ ] Verificar `"success": true`

**curl/PowerShell:**
```bash
# curl (Git Bash)
curl http://localhost:3000/api/health

# PowerShell
Invoke-WebRequest http://localhost:3000/api/health
```

**Tempo estimado**: 1 minuto

---

## 📊 Passo 4: Verificar Logs

### 4.1 Ver Logs em Tempo Real
- [ ] Abrir **NOVO** terminal
- [ ] Navegar para backend: `cd backend`
- [ ] Executar:

**PowerShell (Windows):**
```powershell
Get-Content logs/app.log -Wait -Tail 50
```

**Git Bash/Linux/Mac:**
```bash
npm run logs
```

### 4.2 Verificar Conteúdo
- [ ] Verificar se há logs de inicialização
- [ ] Verificar se **NÃO** há erros (ERROR)
- [ ] Verificar se cron jobs foram iniciados (se habilitado)

**Tempo estimado**: 1 minuto

---

## ✅ Passo 5: Verificação Final

### 5.1 Checklist Geral
- [ ] ✅ Migrations executadas sem erros
- [ ] ✅ 9 tabelas criadas no Supabase
- [ ] ✅ Servidor iniciou sem erros
- [ ] ✅ Health check passou
- [ ] ✅ Logs sem erros críticos
- [ ] ✅ API respondendo corretamente

### 5.2 Testes Adicionais (Opcional)

**Testar endpoint de categorias:**
```bash
curl http://localhost:3000/api/categories
```

**Testar endpoint de produtos:**
```bash
curl http://localhost:3000/api/products
```

**Nota**: Esses endpoints podem retornar array vazio `[]` se não houver dados ainda. Isso é normal!

---

## 🎉 Setup Completo!

Se todos os itens acima estão marcados, o backend está **100% funcional**!

---

## 🔄 Próximos Passos

### Opção 1: Configurar Bots (Opcional)
- [ ] Seguir guia: [BOTS_QUICK_START.md](BOTS_QUICK_START.md)
- [ ] Criar bot no Telegram
- [ ] Cadastrar canal via API
- [ ] Testar notificações

**Tempo estimado**: 10 minutos

### Opção 2: Criar Dados de Teste
- [ ] Criar categorias
- [ ] Criar produtos
- [ ] Criar cupons
- [ ] Testar notificações automáticas

### Opção 3: Iniciar Painel Admin
- [ ] Seguir próximo passo do PROGRESSO.md
- [ ] Configurar React + Vite
- [ ] Integrar com API

---

## 🐛 Problemas?

### Servidor não inicia
1. Verificar `.env` configurado corretamente
2. Verificar se porta 3000 está livre
3. Ver logs: `Get-Content logs/app.log -Tail 50`

### Health check falha
1. Verificar se servidor está rodando
2. Verificar URL: http://localhost:3000
3. Verificar firewall/antivírus

### Migrations falharam
1. Verificar credenciais do Supabase
2. Tentar executar novamente
3. Verificar mensagem de erro específica

---

## 📞 Documentação de Apoio

- [EXECUTAR_MIGRATIONS.md](EXECUTAR_MIGRATIONS.md) - Guia detalhado de migrations
- [COMANDOS_RAPIDOS.md](COMANDOS_RAPIDOS.md) - Comandos úteis
- [SETUP_LOCAL.md](backend/SETUP_LOCAL.md) - Setup completo
- [PROGRESSO.md](PROGRESSO.md) - Status do projeto

---

## 📊 Progresso do Projeto

Após completar este setup:
- ✅ Backend: **98% completo**
- ⏳ Painel Admin: **0%**
- ⏳ Mobile App: **0%**
- 📊 Progresso Geral: **~52%**

---

**🚀 Vamos lá! Execute as migrations e teste o backend!**

**Tempo total estimado**: 5-10 minutos
