# 🚀 Setup Rápido - Módulo de Captura de Cupons

Este guia irá te ajudar a configurar o módulo de captura automática de cupons em **10 minutos**.

---

## ✅ Checklist de Setup

### 1️⃣ Banco de Dados (2 min)

Execute a migration no Supabase:

```bash
# Acesse: https://app.supabase.com/project/SEU_PROJETO/editor
# Copie e cole o conteúdo de:
database/migrations/002_enhance_coupons_table.sql

# OU via linha de comando:
psql -U postgres -d seu_banco -f database/migrations/002_enhance_coupons_table.sql
```

**Validar:** Execute no SQL Editor:
```sql
SELECT * FROM coupon_settings LIMIT 1;
-- Deve retornar 1 linha
```

---

### 2️⃣ Variáveis de Ambiente (3 min)

Abra `backend/.env` e adicione/atualize:

```env
# ============================================
# COUPON CAPTURE MODULE - OBRIGATÓRIO
# ============================================

# Shopee (se tiver)
SHOPEE_PARTNER_ID=seu_partner_id
SHOPEE_PARTNER_KEY=sua_partner_key

# Mercado Livre (já configurado, apenas adicionar código de afiliado)
MELI_AFFILIATE_CODE=seu_codigo_afiliado_ml

# Configurações do Módulo
COUPON_CAPTURE_INTERVAL=10
COUPON_CAPTURE_ENABLED=true

# ============================================
# OPCIONAL - Amazon e AliExpress
# ============================================

# Amazon Associates
AMAZON_PARTNER_TAG=
AMAZON_ACCESS_KEY=
AMAZON_SECRET_KEY=

# AliExpress
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=
ALIEXPRESS_TRACKING_ID=
```

**Validar:**
```bash
cd backend
node -e "require('dotenv').config(); console.log(process.env.MELI_AFFILIATE_CODE)"
# Deve mostrar seu código
```

---

### 3️⃣ Iniciar Backend (2 min)

```bash
cd backend

# Se primeira vez, instalar dependências
npm install

# Iniciar servidor
npm start

# OU em modo desenvolvimento
npm run dev
```

**Validar:** Aguarde ver no console:
```
✅ Cron de captura de cupons iniciado!
✅ Cron de verificação de expiração iniciado!
```

---

### 4️⃣ Iniciar Admin Panel (2 min)

```bash
cd admin-panel

# Se primeira vez, instalar dependências
npm install

# Iniciar painel
npm run dev
```

**Validar:** Abra no navegador:
- http://localhost:5173
- Faça login com suas credenciais
- Acesse o menu **"Captura de Cupons"** ⚡

---

### 5️⃣ Teste Manual (1 min)

No painel admin, clique em **"Sincronizar Agora"**.

Você deve ver:
- ✅ Mensagem de sucesso
- ✅ Logs aparecendo em tempo real
- ✅ Cupons sendo listados (se houver)

**OU via API:**

```bash
# Obter token (substitua com seu email/senha)
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mtwpromo.com","password":"admin123"}' \
  | jq -r '.data.token')

# Testar sincronização
curl -X POST http://localhost:3000/api/coupon-capture/sync/all \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Próximos Passos

### Configurar Credenciais das Plataformas

#### Shopee Affiliate

1. Acesse: https://affiliate.shopee.com.br/
2. Faça cadastro como afiliado
3. Vá em **Configurações > API**
4. Copie **Partner ID** e **Partner Key**
5. Cole no `.env`:
   ```env
   SHOPEE_PARTNER_ID=seu_partner_id
   SHOPEE_PARTNER_KEY=sua_partner_key
   ```

#### Mercado Livre

1. O token já está configurado em `MELI_ACCESS_TOKEN`
2. Para obter código de afiliado:
   - Acesse: https://developers.mercadolivre.com.br/
   - Crie uma aplicação
   - Obtenha seu código de afiliado
3. Adicione no `.env`:
   ```env
   MELI_AFFILIATE_CODE=SEU_CODIGO
   ```

#### Amazon Associates (Opcional)

1. Acesse: https://afiliados.amazon.com.br/
2. Cadastre-se no programa
3. Obtenha credenciais da API
4. Configure no `.env`

#### AliExpress (Opcional)

1. Acesse: https://portals.aliexpress.com/
2. Cadastre-se como afiliado
3. Obtenha App Key e Secret
4. Configure no `.env`

---

## 📊 Monitoramento

### Via Painel Admin

Acesse: http://localhost:5173/coupon-capture

Você verá:
- 📈 Estatísticas em tempo real
- 🎟️ Cupons capturados
- 📝 Logs de sincronização
- ⚙️ Configurações

### Via Logs

```bash
# Em tempo real
tail -f backend/logs/app.log | grep CAPTURA

# Últimas 50 linhas
tail -n 50 backend/logs/app.log | grep cupom
```

### Via API

```bash
# Status dos cron jobs
curl http://localhost:3000/api/coupon-capture/cron-status \
  -H "Authorization: Bearer $TOKEN"

# Estatísticas
curl "http://localhost:3000/api/coupon-capture/stats?days=7" \
  -H "Authorization: Bearer $TOKEN"

# Últimos logs
curl "http://localhost:3000/api/coupon-capture/logs?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⚙️ Configurações Recomendadas

### Para Produção

```env
# Captura a cada 15 minutos (economiza recursos)
COUPON_CAPTURE_INTERVAL=15

# Ativar apenas plataformas que você tem credenciais
# Configure no painel admin
```

### Para Testes

```env
# Captura a cada 1 minuto (para testes rápidos)
COUPON_CAPTURE_INTERVAL=1

# Ativar todas as plataformas
```

---

## 🔧 Troubleshooting Rápido

### ❌ Cron não está executando

**Verificar:**
```bash
# No .env
ENABLE_CRON_JOBS=true

# Reiniciar backend
cd backend
npm start
```

### ❌ Erro "credenciais inválidas"

**Solução:**
1. Verifique se as credenciais no `.env` estão corretas
2. Teste manualmente a API da plataforma
3. Verifique se o token não expirou

### ❌ Cupons não aparecem no app mobile

**Verificar:**
```sql
-- No Supabase SQL Editor
SELECT * FROM coupons 
WHERE auto_captured = TRUE 
AND is_active = TRUE
LIMIT 10;
```

Se aparecer cupons, o problema pode ser:
- Cache do app mobile
- Filtros aplicados no app
- RLS (Row Level Security) no Supabase

### ❌ Notificações não estão sendo enviadas

**Verificar:**
1. Configurações no painel admin
2. Credenciais dos bots (WhatsApp/Telegram)
3. Logs: `grep "Notificação" logs/app.log`

---

## 📱 Testando Notificações

### WhatsApp (se configurado)

```bash
# Enviar teste via bot
curl -X POST http://localhost:3000/api/bots/whatsapp/test \
  -H "Authorization: Bearer $TOKEN"
```

### Telegram (se configurado)

```bash
# Enviar teste via bot
curl -X POST http://localhost:3000/api/bots/telegram/test \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ Validação Final

Execute este checklist:

- [ ] Migration executada com sucesso
- [ ] Variáveis de ambiente configuradas
- [ ] Backend iniciado sem erros
- [ ] Admin panel acessível
- [ ] Página "Captura de Cupons" funciona
- [ ] Sincronização manual funciona
- [ ] Cron jobs estão ativos
- [ ] Logs sendo gerados
- [ ] (Opcional) Notificações funcionando

---

## 🎉 Pronto!

Seu módulo de captura automática de cupons está funcionando!

### O que acontece agora:

1. ⏰ A cada 10 minutos (ou intervalo configurado):
   - Sistema busca novos cupons
   - Salva no banco de dados
   - Adiciona link de afiliado
   - Envia notificações

2. 🔍 A cada 6 horas:
   - Verifica cupons expirados
   - Desativa automaticamente
   - Notifica sobre expiração

3. 📊 Diariamente às 3h:
   - Verifica validade de todos os cupons
   - Atualiza status

### Acompanhe pelo Painel

Acesse: http://localhost:5173/coupon-capture

Você verá todas as métricas e pode:
- Pausar/Retomar captura
- Configurar intervalo
- Ativar/desativar plataformas
- Forçar sincronização manual
- Ver logs em tempo real

---

## 📚 Documentação Completa

Para mais detalhes, veja: `MODULO_CAPTURA_CUPONS.md`

---

## 🆘 Suporte

Se tiver problemas:

1. Consulte os logs: `tail -f backend/logs/app.log`
2. Veja a documentação completa
3. Teste as APIs manualmente
4. Verifique as configurações no painel

---

**Desenvolvido com ❤️ para MTW Promo**
