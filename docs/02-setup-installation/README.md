# ⚙️ Instalação e Configuração

Guia completo para instalar e configurar o MTW Promo do zero.

## 📋 Pré-requisitos

### Software Necessário
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** ou **yarn** (vem com Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Redis** ([Download](https://redis.io/download)) - Opcional para desenvolvimento local
- **PostgreSQL** ou conta **Supabase** ([Criar conta](https://supabase.com))

### Contas Necessárias
- **Supabase** - Banco de dados
- **Mercado Livre** - API de afiliados (opcional)
- **Shopee** - API de afiliados (opcional)
- **WhatsApp Business** - Para bots (opcional)
- **Telegram** - Para bots e coletor (opcional)

## 🚀 Instalação Rápida

### 1. Clonar o Repositório

```bash
git clone <repository-url>
cd MTW
```

### 2. Instalar Dependências

```bash
# Backend
cd backend
npm install

# Admin Panel
cd ../admin-panel
npm install

# Mobile App
cd ../mobile-app
npm install
```

### 3. Configurar Banco de Dados

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o script `database/schema.sql` no SQL Editor
3. Execute as migrations em `database/migrations/` na ordem numérica

### 4. Configurar Variáveis de Ambiente

Copie os arquivos `.env.example` e configure:

```bash
# Backend
cd backend
cp .env.example .env
# Edite o .env com suas credenciais

# Admin Panel (geralmente não precisa de .env)
cd ../admin-panel

# Mobile App
cd ../mobile-app
cp .env.example .env
# Configure se necessário
```

### 5. Iniciar os Serviços

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Admin Panel
cd admin-panel
npm run dev

# Terminal 3 - Mobile App
cd mobile-app
npm start
```

## 📝 Configuração Detalhada

### Backend

Veja o guia completo: [Configuração do Backend](./backend-setup.md)

**Principais variáveis:**
- `SUPABASE_URL` - URL do seu projeto Supabase
- `SUPABASE_SERVICE_KEY` - Chave de serviço do Supabase
- `JWT_SECRET` - Chave secreta para JWT
- `REDIS_HOST` - Host do Redis (opcional)

**Configurações Adicionais:**
- [Google OAuth Setup](./google-oauth-setup.md) - Autenticação social
- [SMTP Setup](./smtp-setup.md) - Envio de emails

### Admin Panel

O admin panel se conecta automaticamente ao backend. Configure apenas:
- URL do backend (padrão: `http://localhost:3000`)

### Mobile App

Configure no `app.json`:
- `expo.extra.apiUrl` - URL do backend
- `expo.extra.supabaseUrl` - URL do Supabase
- `expo.extra.supabaseAnonKey` - Chave anônima do Supabase

## ✅ Checklist de Instalação

- [ ] Node.js 18+ instalado
- [ ] Dependências instaladas (backend, admin, mobile)
- [ ] Projeto Supabase criado
- [ ] Schema do banco executado
- [ ] Migrations executadas
- [ ] Variáveis de ambiente configuradas
- [ ] Backend rodando (porta 3000)
- [ ] Admin panel rodando (porta 5173)
- [ ] Mobile app iniciado

## 🧪 Teste Rápido

Após a instalação, execute o [Teste Rápido](./quick-test.md) para validar.

## 📚 Próximos Passos

1. [Configurar Integrações](../04-integrations/README.md)
2. [Configurar Bots](../04-integrations/bots/README.md)
3. [Configurar Mercado Livre](../04-integrations/mercadolivre/README.md)
4. [Explorar API](../05-api-reference/README.md)

## 🆘 Problemas?

Consulte os guias de troubleshooting:
- [Guia Geral de Troubleshooting](../06-troubleshooting/README.md)
- [Problemas de Build Android](../06-troubleshooting/android-build-issues.md)
- [Configuração Google OAuth](./google-oauth-setup.md)
- [Configuração SMTP](./smtp-setup.md)

---

**Próximo**: [Configuração do Banco de Dados](./database.md)
