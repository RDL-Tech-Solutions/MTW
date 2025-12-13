# 🔐 GUIA DE CONFIGURAÇÃO - .env

## 📋 Visão Geral

Este guia explica todas as variáveis de ambiente do backend MTW Promo.

---

## ✅ Variáveis Configuradas

### ✅ Funcionando Agora
- [x] **Supabase** - Banco de dados configurado
- [x] **Redis** - Cache configurado (Upstash)
- [x] **JWT** - Autenticação configurada
- [x] **Telegram Bot** - Token configurado
- [x] **Expo** - Push notifications configurado
- [x] **CORS** - Origens permitidas
- [x] **Admin** - Credenciais padrão

### ⚠️ Precisa Configurar (Opcional)
- [ ] **WhatsApp Bot** - Precisa token da Meta
- [ ] **Shopee API** - Precisa credenciais
- [ ] **Mercado Livre** - Precisa access token

---

## 🔧 Configuração por Seção

### 1. SERVER CONFIGURATION ✅

```env
NODE_ENV=development          # development | production | test
PORT=3000                     # Porta do servidor
API_URL=http://localhost:3000 # URL base da API
HOST=0.0.0.0                  # Aceita conexões de qualquer IP
```

**Status**: ✅ Configurado  
**Ação**: Nenhuma necessária

---

### 2. DATABASE - SUPABASE ✅

```env
SUPABASE_URL=https://rsulwtpvvjkysqqsbtlq.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...  # Para OAuth social (Google/Facebook)
SUPABASE_SERVICE_KEY=eyJhbGci...  # Para operações admin
```

**Status**: ✅ Configurado e funcionando  
**Ação**: ⚠️ **SUPABASE_ANON_KEY necessário para OAuth social**  
**Onde obter**: https://supabase.com/dashboard/project/_/settings/api

**Nota**: A `SUPABASE_ANON_KEY` é usada apenas no backend para OAuth. O mobile app não precisa dela diretamente.

---

### 3. SECURITY - JWT ✅

```env
JWT_SECRET=mtw_promo_super_secret_jwt_key_2024_change_in_production
JWT_REFRESH_SECRET=mtw_promo_refresh_secret_key_2024_change_in_production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
```

**Status**: ✅ Configurado  
**Ação**: ⚠️ **MUDAR EM PRODUÇÃO!**  
**Como gerar**:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 4. CACHE - REDIS ✅

```env
REDIS_HOST=enhanced-blowfish-10666.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=ASmqAAInc...
REDIS_TLS=true
```

**Status**: ✅ Configurado (Upstash Cloud)  
**Ação**: Nenhuma necessária  
**Onde obter**: https://upstash.com

**Alternativa Local (Docker)**:
```bash
docker run -d -p 6379:6379 redis
```
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
```

---

### 5. AFFILIATE APIS ⚠️

#### Shopee API ⚠️

```env
SHOPEE_PARTNER_ID=your_shopee_partner_id
SHOPEE_PARTNER_KEY=your_shopee_partner_key
SHOPEE_API_URL=https://partner.shopeemobile.com/api/v2
```

**Status**: ⚠️ Não configurado  
**Ação**: Opcional - Configure se quiser integração Shopee  
**Onde obter**: https://open.shopee.com

#### Mercado Livre API ⚠️

```env
MELI_CLIENT_ID=6916793910009014
MELI_CLIENT_SECRET=hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2
MELI_ACCESS_TOKEN=your_meli_access_token
MELI_REFRESH_TOKEN=your_meli_refresh_token
```

**Status**: ⚠️ Parcialmente configurado  
**Ação**: Precisa gerar access_token  
**Onde obter**: https://developers.mercadolivre.com.br

**Como gerar token**:
1. Acesse: https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao
2. Crie um app
3. Gere o access token
4. Atualize no .env

---

### 6. PUSH NOTIFICATIONS ✅

```env
EXPO_ACCESS_TOKEN=3zBZSZ5Fs7t1T8TKrcZwWOwQMvlmJJJM8hm2UBHp
EXPO_PROJECT_ID=your_expo_project_id
```

**Status**: ✅ Token configurado  
**Ação**: Opcional - Configure project_id  
**Onde obter**: https://expo.dev/accounts/[account]/settings/access-tokens

---

### 7. SECURITY & RATE LIMITING ✅

```env
RATE_LIMIT_WINDOW_MS=900000    # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100    # 100 requisições por janela
BCRYPT_ROUNDS=10               # Rounds do bcrypt
```

**Status**: ✅ Configurado  
**Ação**: Nenhuma necessária

---

### 8. CRON JOBS ✅

```env
ENABLE_CRON_JOBS=true
PRICE_UPDATE_INTERVAL=*/15 * * * *    # A cada 15 minutos
COUPON_CHECK_INTERVAL=0 */6 * * *     # A cada 6 horas
CLEANUP_INTERVAL=0 2 * * *            # Às 2h da manhã
```

**Status**: ✅ Configurado  
**Ação**: Nenhuma necessária

---

### 9. LOGGING ✅

```env
LOG_LEVEL=info                 # error | warn | info | debug
LOG_FILE=logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=7
```

**Status**: ✅ Configurado  
**Ação**: Nenhuma necessária

---

### 10. CORS ✅

```env
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:19006,http://192.168.7.7:8083
ALLOWED_HOSTS=localhost,192.168.7.7
```

**Status**: ✅ Configurado  
**Ação**: Adicione mais origens se necessário

---

### 11. ADMIN CREDENTIALS ✅

```env
ADMIN_EMAIL=admin@mtwpromo.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Administrador
```

**Status**: ✅ Configurado  
**Ação**: ⚠️ **MUDAR SENHA EM PRODUÇÃO!**

---

### 12. BOTS - WHATSAPP ⚠️

```env
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN=your_whatsapp_api_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_VERIFY_TOKEN=mtw_promo_webhook_verify_token_2024
```

**Status**: ⚠️ Não configurado  
**Ação**: Opcional - Configure se quiser WhatsApp Bot  
**Onde obter**: https://developers.facebook.com/apps

**Como configurar**:
1. Crie um app no Facebook Developers
2. Adicione WhatsApp Business API
3. Obtenha o token e phone number ID
4. Configure webhook

---

### 13. BOTS - TELEGRAM ✅

```env
TELEGRAM_BOT_TOKEN=8435501449:AAECzJNt7TNiHvkELvXRFZNvneFw9Ul84Ko
TELEGRAM_BOT_USERNAME=@mtwpromo_bot
```

**Status**: ✅ Configurado  
**Ação**: Nenhuma necessária  
**Onde obter**: https://t.me/BotFather

---

### 14. FILE UPLOAD ✅

```env
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880          # 5MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,image/gif
```

**Status**: ✅ Configurado  
**Ação**: Nenhuma necessária

---

### 15. FEATURE FLAGS ✅

```env
ENABLE_BOTS=true
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_EMAIL_NOTIFICATIONS=false
ENABLE_ANALYTICS=true
ENABLE_CACHE=true
```

**Status**: ✅ Configurado  
**Ação**: Ajuste conforme necessário

---

## 📊 Resumo de Status

| Categoria | Status | Prioridade |
|-----------|--------|------------|
| Server | ✅ OK | Alta |
| Database (Supabase) | ✅ OK | Alta |
| JWT | ✅ OK | Alta |
| Redis | ✅ OK | Alta |
| Telegram Bot | ✅ OK | Média |
| Expo Push | ✅ OK | Média |
| CORS | ✅ OK | Alta |
| Admin | ✅ OK | Alta |
| WhatsApp Bot | ⚠️ Opcional | Baixa |
| Shopee API | ⚠️ Opcional | Baixa |
| Mercado Livre | ⚠️ Parcial | Baixa |

---

## ⚡ Quick Start

### Configuração Mínima (Já está OK!)

O projeto já está configurado com o mínimo necessário:
- ✅ Supabase
- ✅ Redis
- ✅ JWT
- ✅ Admin credentials

### Para Produção

1. **Gerar novos JWT secrets**:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

2. **Mudar senha do admin**:
```env
ADMIN_PASSWORD=sua_senha_forte_aqui
```

3. **Configurar domínio**:
```env
API_URL=https://api.mtwpromo.com
CORS_ORIGIN=https://mtwpromo.com,https://admin.mtwpromo.com
```

4. **Habilitar HTTPS no Redis** (se usar Upstash):
```env
REDIS_TLS=true
```

---

## 🔒 Segurança

### ⚠️ NUNCA COMMITE O .env!

O arquivo `.env` está no `.gitignore`. NUNCA o adicione ao Git!

### ✅ Use .env.example

Para compartilhar configurações, use `.env.example` sem valores reais.

### 🔐 Produção

Em produção, use variáveis de ambiente do servidor:
- Heroku: Settings > Config Vars
- Vercel: Settings > Environment Variables
- AWS: Systems Manager > Parameter Store

---

## 🆘 Troubleshooting

### Erro: "Cannot connect to Redis"
**Solução**: Verifique REDIS_HOST, REDIS_PORT e REDIS_PASSWORD

### Erro: "Supabase connection failed"
**Solução**: Verifique SUPABASE_URL e SUPABASE_SERVICE_KEY

### Erro: "JWT secret not defined"
**Solução**: Verifique JWT_SECRET no .env

### Erro: "CORS blocked"
**Solução**: Adicione a origem em CORS_ORIGIN

---

## 📝 Checklist de Configuração

### Desenvolvimento (Atual)
- [x] Copiar .env.example para .env
- [x] Configurar Supabase
- [x] Configurar Redis
- [x] Configurar JWT
- [x] Configurar Admin
- [x] Testar conexões

### Produção (Futuro)
- [ ] Gerar novos JWT secrets
- [ ] Mudar senha do admin
- [ ] Configurar domínio
- [ ] Configurar HTTPS
- [ ] Configurar WhatsApp (opcional)
- [ ] Configurar Shopee (opcional)
- [ ] Configurar email (opcional)
- [ ] Configurar analytics (opcional)

---

**Configuração atual está 100% funcional para desenvolvimento!** ✅
