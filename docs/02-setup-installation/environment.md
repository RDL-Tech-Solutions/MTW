# 🔐 Variáveis de Ambiente

Guia completo de configuração das variáveis de ambiente.

## 📋 Visão Geral

O MTW Promo usa variáveis de ambiente para configurações sensíveis. A maioria das configurações pode ser gerenciada via **Painel Admin**, mas o `.env` serve como fallback.

## 🎯 Configuração via Admin Panel

**Recomendado**: Configure as APIs através do Painel Admin em `/settings`.

As seguintes configurações podem ser gerenciadas via Admin:
- ✅ Mercado Livre (Client ID, Secret, Tokens, Códigos de Afiliado)
- ✅ Shopee (Partner ID, Partner Key)
- ✅ Amazon (Access Key, Secret Key, Partner Tag)
- ✅ Expo (Access Token para Push Notifications)
- ✅ Telegram Collector (Rate Limits, Retries, Reconnect)
- ✅ Backend (URL, API Key)

## 🔒 O que DEVE permanecer no .env

### Segurança
```env
JWT_SECRET=seu_jwt_secret_aqui
JWT_REFRESH_SECRET=seu_refresh_secret_aqui
```

### Infraestrutura
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_key_aqui
SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### Cache
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Sistema
```env
NODE_ENV=development
PORT=3000
HOST=localhost
API_URL=http://localhost:3000
```

## 📝 Backend (.env)

### Configuração Básica

```env
# Ambiente
NODE_ENV=development
PORT=3000
HOST=localhost
API_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_key_aqui
SUPABASE_ANON_KEY=sua_anon_key_aqui

# JWT
JWT_SECRET=seu_jwt_secret_super_seguro_aqui
JWT_REFRESH_SECRET=seu_refresh_secret_super_seguro_aqui
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Redis (Opcional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:19006

# Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,image/gif
```

### Bots (Opcional - pode configurar via Admin)

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=seu_token_aqui
TELEGRAM_BOT_USERNAME=@seu_bot

# WhatsApp (Opcional)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN=seu_token_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_phone_id
WHATSAPP_VERIFY_TOKEN=seu_verify_token
```

### Plataformas (Opcional - pode configurar via Admin)

```env
# Mercado Livre (Opcional - configure via Admin)
MELI_CLIENT_ID=seu_client_id
MELI_CLIENT_SECRET=seu_client_secret
MELI_ACCESS_TOKEN=seu_access_token
MELI_REFRESH_TOKEN=seu_refresh_token
MELI_AFFILIATE_CODE=seu_codigo_afiliado

# Shopee (Opcional - configure via Admin)
SHOPEE_PARTNER_ID=seu_partner_id
SHOPEE_PARTNER_KEY=seu_partner_key

# Amazon (Opcional - configure via Admin)
AMAZON_ACCESS_KEY=seu_access_key
AMAZON_SECRET_KEY=seu_secret_key
AMAZON_PARTNER_TAG=seu_partner_tag
```

## 📱 Mobile App (.env)

```env
# API
EXPO_PUBLIC_API_URL=http://localhost:3000

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

## ⚠️ Segurança

### ⛔ NUNCA COMMITE O .env!

O arquivo `.env` está no `.gitignore`. **NUNCA** o adicione ao Git!

### ✅ Use .env.example

Para compartilhar configurações, use `.env.example` sem valores reais.

### 🔐 Produção

Em produção, use variáveis de ambiente do servidor:
- **Heroku**: Settings > Config Vars
- **Vercel**: Settings > Environment Variables
- **AWS**: Systems Manager > Parameter Store
- **Railway**: Variables
- **Render**: Environment

## 📚 Documentação Completa

Para referência completa de todas as variáveis, veja:
- [backend/ENV_GUIDE.md](../../backend/ENV_GUIDE.md)

## 🆘 Troubleshooting

### Erro: "Cannot connect to Redis"
**Solução**: Verifique `REDIS_HOST`, `REDIS_PORT` e `REDIS_PASSWORD`. Redis é opcional para desenvolvimento.

### Erro: "Supabase connection failed"
**Solução**: Verifique `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`

### Erro: "JWT secret not defined"
**Solução**: Configure `JWT_SECRET` no .env

### Erro: "CORS blocked"
**Solução**: Adicione a origem em `CORS_ORIGIN`

## ✅ Checklist

- [ ] `.env` criado a partir de `.env.example`
- [ ] `SUPABASE_URL` configurado
- [ ] `SUPABASE_SERVICE_KEY` configurado
- [ ] `JWT_SECRET` configurado (use um valor seguro!)
- [ ] `CORS_ORIGIN` configurado com as URLs corretas
- [ ] `.env` adicionado ao `.gitignore` (verificar!)

---

**Próximo**: [Checklist de Setup](./checklist.md)





