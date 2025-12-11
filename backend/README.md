# 🚀 MTW Promo Backend API

Backend completo para o sistema MTW Promo - Plataforma de cupons, promoções e afiliados.

## 📋 Requisitos

- Node.js 18+
- Redis
- Conta Supabase
- Credenciais Shopee Affiliate API
- Credenciais Mercado Livre API

## 🔧 Instalação

```bash
# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env

# Editar variáveis de ambiente
nano .env

# Executar migrations
npm run migrate

# Iniciar servidor de desenvolvimento
npm run dev
```

## 🗄️ Configuração do Banco de Dados

Execute o script SQL em `../database/schema.sql` no seu projeto Supabase.

## 🔌 Endpoints Principais

### Authentication
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Dados do usuário autenticado

### Products
- `GET /api/products` - Listar produtos (paginado)
- `GET /api/products/:id` - Detalhes do produto
- `POST /api/products` - Criar produto (admin)
- `PUT /api/products/:id` - Atualizar produto (admin)
- `DELETE /api/products/:id` - Deletar produto (admin)

### Coupons
- `GET /api/coupons` - Listar cupons ativos
- `GET /api/coupons/:id` - Detalhes do cupom
- `POST /api/coupons` - Criar cupom (admin)
- `PUT /api/coupons/:id` - Atualizar cupom (admin)
- `DELETE /api/coupons/:id` - Deletar cupom (admin)

### Categories
- `GET /api/categories` - Listar categorias
- `POST /api/categories` - Criar categoria (admin)

### Notifications
- `GET /api/notifications` - Notificações do usuário
- `POST /api/notifications/register-token` - Registrar push token

### Analytics (Admin)
- `GET /api/analytics/dashboard` - Dashboard completo
- `GET /api/analytics/clicks` - Estatísticas de cliques
- `GET /api/analytics/conversions` - Taxa de conversão

## 🔄 Cron Jobs

Os seguintes jobs são executados automaticamente:

- **A cada 15 minutos**: Atualização de preços e cupons
- **Diariamente**: Limpeza de dados antigos
- **Semanalmente**: Relatórios e backups

## 🔐 Autenticação

A API usa JWT (JSON Web Tokens) para autenticação. Inclua o token no header:

```
Authorization: Bearer <seu_token>
```

## 📊 Estrutura de Resposta

### Sucesso
```json
{
  "success": true,
  "data": { ... },
  "message": "Operação realizada com sucesso"
}
```

### Erro
```json
{
  "success": false,
  "error": "Mensagem de erro",
  "code": "ERROR_CODE"
}
```

## 🧪 Testes

```bash
npm test
```

## 📝 Logs

Os logs são salvos em `logs/app.log` e também exibidos no console em desenvolvimento.

## 🚀 Deploy

### Railway
```bash
railway login
railway init
railway up
```

### Render
1. Conecte seu repositório
2. Configure as variáveis de ambiente
3. Deploy automático

## 📞 Suporte

Para dúvidas e suporte, entre em contato através do email: suporte@mtwpromo.com
