# 🔐 GUIA DE CONFIGURAÇÃO - .env

## 📋 Visão Geral

Este guia explica todas as variáveis de ambiente do backend MTW Promo.

## 🎯 IMPORTANTE: Migração para Admin Panel

**Muitas configurações foram migradas para o Painel Admin!**

As seguintes configurações agora podem ser gerenciadas através do Painel Admin em `/settings`:
- ✅ **Mercado Livre** (Client ID, Secret, Tokens, Códigos de Afiliado)
- ✅ **Shopee** (Partner ID, Partner Key)
- ✅ **Amazon** (Access Key, Secret Key, Partner Tag)
- ✅ **Expo** (Access Token para Push Notifications)
- ✅ **Telegram Collector** (Rate Limits, Retries, Reconnect)
- ✅ **Backend** (URL, API Key)

**O que DEVE permanecer no .env:**
- 🔒 **Segurança**: JWT_SECRET, JWT_REFRESH_SECRET
- 🗄️ **Infraestrutura**: SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY
- 💾 **Cache**: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
- ⚙️ **Sistema**: NODE_ENV, PORT, HOST, API_URL
- 🔐 **Bots** (tokens ainda podem ser configurados via admin, mas .env funciona como fallback)

**Recomendação**: Configure as APIs através do Painel Admin. O `.env` serve como fallback caso o banco não tenha as configurações.

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
- [ ] **Telegram Collector** - Precisa API ID e Hash do Telegram

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

### 5. AFFILIATE APIS ⚠️ (MIGRADO PARA ADMIN PANEL)

> **📌 IMPORTANTE**: Estas configurações agora podem ser gerenciadas no Painel Admin em `/settings`!

#### Shopee API ⚠️

```env
SHOPEE_PARTNER_ID=your_shopee_partner_id      # Fallback (use Admin Panel)
SHOPEE_PARTNER_KEY=your_shopee_partner_key    # Fallback (use Admin Panel)
SHOPEE_API_URL=https://partner.shopeemobile.com/api/v2
```

**Status**: ⚠️ Não configurado  
**Ação**: ⚡ **Configure no Painel Admin** (`/settings` > Aba "Shopee")  
**Fallback**: Se não configurado no admin, usa valores do `.env`  
**Onde obter**: https://open.shopee.com

#### Mercado Livre API ⚠️

```env
MELI_CLIENT_ID=6916793910009014              # Fallback (use Admin Panel)
MELI_CLIENT_SECRET=hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2  # Fallback (use Admin Panel)
MELI_ACCESS_TOKEN=your_meli_access_token      # Fallback (atualizado automaticamente)
MELI_REFRESH_TOKEN=your_meli_refresh_token   # Fallback (use Admin Panel)
MELI_AFFILIATE_CODE=your_code                # Fallback (use Admin Panel)
MELI_AFFILIATE_TAG=your_tag                  # Fallback (use Admin Panel)
```

**Status**: ⚠️ Parcialmente configurado  
**Ação**: ⚡ **Configure no Painel Admin** (`/settings` > Aba "Mercado Livre")  
**Fallback**: Se não configurado no admin, usa valores do `.env`  
**Onde obter**: https://developers.mercadolivre.com.br

**📘 Guia Completo**: Veja `backend/GUIA_CONFIGURAR_MELI_ADMIN.md` para passo a passo detalhado

**Resumo rápido**:
1. Acesse: https://developers.mercadolivre.com.br
2. Crie uma aplicação
3. Obtenha Client ID e Client Secret
4. Gere Access Token e Refresh Token
5. Configure no Painel Admin (`/settings` > Aba "Mercado Livre")
6. Salve as configurações

---

### 6. PUSH NOTIFICATIONS ✅ (MIGRADO PARA ADMIN PANEL)

> **📌 IMPORTANTE**: Esta configuração agora pode ser gerenciada no Painel Admin em `/settings`!

```env
EXPO_ACCESS_TOKEN=3zBZSZ5Fs7t1T8TKrcZwWOwQMvlmJJJM8hm2UBHp  # Fallback (use Admin Panel)
EXPO_PROJECT_ID=your_expo_project_id
```

**Status**: ✅ Token configurado  
**Ação**: ⚡ **Configure no Painel Admin** (`/settings` > Aba "Expo / Push")  
**Fallback**: Se não configurado no admin, usa valores do `.env`  
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

### 14. TELEGRAM COLLECTOR (MTProto) ⚠️

**Status**: ⚠️ Precisa Configurar  
**Ação**: 
1. Acesse https://my.telegram.org/apps
2. Crie uma aplicação
3. Copie `api_id` e `api_hash`
4. **Configure via Painel Admin** em `/telegram-channels`:
   - Aba "Configuração": Insira API ID, API Hash e Telefone
   - Aba "Autenticação": Envie código e verifique
   - Aba "Canais": Adicione canais públicos para monitorar
   - Aba "Listener": Inicie o listener

**Nota**: 
- ✅ **100% Node.js**: Não é mais necessário Python
- ✅ **Interface Completa**: Tudo configurável via painel admin
- Este é diferente do Telegram Bot. O Collector usa MTProto (gramjs) para monitorar canais públicos.

**Documentação**: Veja `backend/TELEGRAM_NODEJS_MIGRATION.md`

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
