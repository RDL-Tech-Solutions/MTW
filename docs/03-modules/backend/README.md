# 🚀 Backend API

Documentação completa do backend MTW Promo.

## 📋 Visão Geral

O backend é uma API REST construída com Node.js e Express, fornecendo endpoints para produtos, cupons, autenticação, analytics e integrações.

## 🏗️ Estrutura

```
backend/
├── src/
│   ├── config/          # Configurações (DB, Redis, Logger)
│   ├── models/          # Models do banco de dados
│   ├── controllers/     # Controllers da API
│   ├── routes/          # Rotas da API
│   ├── middleware/      # Middlewares (Auth, Validation, etc)
│   ├── services/        # Serviços de negócio
│   ├── cron/            # Jobs agendados
│   ├── utils/           # Utilitários
│   └── server.js        # Entry point
```

## 🔌 Endpoints Principais

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Dados do usuário

### Produtos
- `GET /api/products` - Listar produtos
- `GET /api/products/:id` - Detalhes do produto
- `POST /api/products` - Criar produto (admin)
- `PUT /api/products/:id` - Atualizar produto (admin)
- `DELETE /api/products/:id` - Deletar produto (admin)

### Cupons
- `GET /api/coupons` - Listar cupons ativos
- `GET /api/coupons/:id` - Detalhes do cupom
- `POST /api/coupons` - Criar cupom (admin)
- `PUT /api/coupons/:id` - Atualizar cupom (admin)
- `DELETE /api/coupons/:id` - Deletar cupom (admin)

### Categorias
- `GET /api/categories` - Listar categorias
- `POST /api/categories` - Criar categoria (admin)

### Analytics
- `GET /api/analytics/dashboard` - Dashboard completo
- `GET /api/analytics/clicks` - Estatísticas de cliques
- `GET /api/analytics/conversions` - Taxa de conversão

### Bots
- `GET /api/bots/config` - Configuração dos bots
- `POST /api/bots/config` - Salvar configuração
- `GET /api/bots/channels` - Listar canais
- `POST /api/bots/channels` - Criar canal
- `GET /api/bots/templates` - Listar templates

### Telegram Collector
- `GET /api/telegram-collector/config` - Configuração
- `POST /api/telegram-collector/auth/send-code` - Enviar código
- `POST /api/telegram-collector/auth/verify-code` - Verificar código
- `POST /api/telegram-collector/listener/start` - Iniciar listener

Veja [API Reference](../05-api-reference/README.md) para documentação completa.

## 🔄 Cron Jobs

### Atualização de Preços
- **Frequência**: A cada 15 minutos
- **Função**: Atualiza preços de produtos

### Verificação de Cupons Expirados
- **Frequência**: A cada 1 minuto
- **Função**: Verifica e expira cupons vencidos

### Limpeza de Dados
- **Frequência**: Diariamente
- **Função**: Remove dados antigos

## 🔐 Autenticação

A API usa JWT (JSON Web Tokens) para autenticação.

### Headers Necessários

```
Authorization: Bearer <seu_token>
```

### Fluxo de Autenticação

1. Login → Recebe `accessToken` e `refreshToken`
2. Use `accessToken` nas requisições
3. Quando expirar, use `refreshToken` para renovar

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

## 🛠️ Tecnologias

- **Node.js** 18+
- **Express.js** - Framework web
- **Supabase** - Banco de dados PostgreSQL
- **Redis** - Cache (opcional)
- **JWT** - Autenticação
- **Winston** - Logs
- **Node-cron** - Agendamento

## 📝 Logs

Os logs são salvos em:
- `logs/app.log` - Logs gerais
- `logs/error.log` - Apenas erros

## 🚀 Deploy

### Railway
```bash
railway login
railway init
railway up
```

### Render
1. Conecte o repositório
2. Configure variáveis de ambiente
3. Deploy automático

## 📚 Mais Informações

- [API Reference](../05-api-reference/README.md)
- [Arquitetura](../07-architecture/backend.md)
- [Troubleshooting](../06-troubleshooting/README.md)

---

**Próximo**: [Admin Panel](./admin-panel/README.md)





