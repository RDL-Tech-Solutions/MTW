# 🚀 Guia de Deploy - MTW Promo

Este guia cobre o processo de deploy completo para o Backend, Painel Admin e Banco de Dados.

## 📋 Pré-requisitos

- **Node.js**: v18 ou superior
- **PostgreSQL** (via Supabase recomendado)
- **Git**

---

## 🗄️ 1. Banco de Dados (Supabase)

O projeto utiliza um schema unificado para facilitar o setup.

1. Crie um novo projeto no [Supabase](https://supabase.com/).
2. Vá para o **SQL Editor**.
3. Copie o conteúdo do arquivo `database/schema_v2.sql`.
4. Cole no editor e execute.
   - Isso criará todas as tabelas, funções, triggers e dados iniciais (admin user, categorias, etc).
5. Vá em **Project Settings > API** e copie:
   - Project URL
   - `anon` public key
   - `service_role` secret key (para o backend)

---

## 🖥️ 2. Backend (API Node.js)

O backend deve rodar em um servidor Node.js (VPS, Heroku, Render, etc).

### Instalação

1. Navegue até a pasta `backend`:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```

### Configuração

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```
2. Edite o `.env` com suas credenciais (Supabase, Mercado Livre, etc).

### Execução em Produção

Recomendamos usar o **PM2** para gerenciar o processo:

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar o servidor
pm2 start src/server.js --name "mtw-backend"

# Configurar startup automático
pm2 startup
pm2 save
```

Ou via npm:
```bash
npm start
```

---

## ⚙️ 3. Painel Admin (React/Vite)

O painel admin é uma aplicação estática que pode ser hospedada em qualquer lugar (Vercel, Netlify, Nginx).

### Build

1. Navegue até a pasta `admin-panel`:
   ```bash
   cd admin-panel
   ```
2. Crie o arquivo de ambiente:
   ```bash
   cp .env.example .env
   ```
3. Configure a URL do backend no `.env`:
   ```
   VITE_API_URL=https://seu-backend-url.com/api
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon
   ```
4. Gere o build de produção:
   ```bash
   npm install
   npm run build
   ```

### Deploy (Exemplo com Nginx)

O conteúdo da pasta `dist` deve ser servido pelo servidor web.

Configuração básica do Nginx:
```nginx
server {
    listen 80;
    server_name admin.seu-dominio.com;
    root /var/www/mtw-admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🤖 4. Bots e Automação

Os bots (Telegram/WhatsApp) rodam integrados ao backend.

- Certifique-se de preencher as configs no banco de dados (tabela `bot_config` e `app_settings`).
- Você pode configurar isso via Painel Admin após o deploy.

---

## ✅ Checklist de Verificação

- [ ] Banco de dados criado com `schema_v2.sql`?
- [ ] Backend rodando e conectado ao banco?
- [ ] Painel Admin buildado e apontando para a URL correta do backend?
- [ ] Cronjobs (se houver) configurados? (O sistema tem cron interno via `node-cron`, então basta o backend estar rodando).

---

**Suporte:** RDL Tech Solutions
