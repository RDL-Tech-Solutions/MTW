# ✅ CHECKLIST RÁPIDO - Ativar Mercado Livre (5 minutos)

## 🎯 O QUE JÁ ESTÁ CONFIGURADO

✅ **backend/.env** - Variáveis já adicionadas:
- `MELI_AFFILIATE_CODE=RDLTECH`
- `COUPON_CAPTURE_ENABLED=true`
- `COUPON_CAPTURE_INTERVAL=10`

## 📝 EXECUTE AGORA (3 passos)

### ☑️ PASSO 1: Ativar no Banco (2 min)

Abra o Supabase SQL Editor e execute:

```sql
-- Verificar se migration foi executada
SELECT COUNT(*) FROM coupon_settings;

-- Se retornar erro "table does not exist", PARE e execute primeiro:
-- database/migrations/002_enhance_coupons_table.sql

-- Se retornou 0 ou algum número, continue:

-- Ativar Mercado Livre
INSERT INTO coupon_settings (
    id, auto_capture_enabled, capture_interval_minutes,
    shopee_enabled, meli_enabled, meli_capture_deals,
    meli_capture_campaigns, meli_capture_seller_promotions,
    amazon_enabled, aliexpress_enabled,
    notify_bots_on_new_coupon, notify_bots_on_expiration,
    created_at, updated_at
) VALUES (
    gen_random_uuid(), true, 10,
    false, true, true, true, true,
    false, false, true, true,
    NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
    meli_enabled = true,
    auto_capture_enabled = true,
    updated_at = NOW();

-- Verificar
SELECT meli_enabled, auto_capture_enabled FROM coupon_settings;
```

**Resultado esperado:** `meli_enabled = true` ✅

---

### ☑️ PASSO 2: Reiniciar Backend (1 min)

```bash
cd backend

# Se estiver rodando, pare com Ctrl+C

# Iniciar
npm start
```

**Aguarde ver:**
```
✅ Cron de captura de cupons iniciado!
```

---

### ☑️ PASSO 3: Testar (2 min)

**Opção A - Via Script de Teste:**
```bash
cd backend
node scripts/test-meli-capture.js
```

**Opção B - Via Painel Admin:**
1. Abra: http://localhost:5173/coupon-capture
2. Clique em **"Sincronizar Agora"**
3. Veja os logs aparecendo

**Opção C - Via API:**
```powershell
# Obter token
$response = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -Body '{"email":"admin@mtwpromo.com","password":"admin123"}' -ContentType "application/json"
$token = $response.data.token

# Sincronizar
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/coupon-capture/sync/mercadolivre" -Headers @{Authorization="Bearer $token"}
```

---

## ✅ VALIDAR SUCESSO

Execute no Supabase:

```sql
-- Ver logs
SELECT * FROM coupon_sync_logs 
WHERE platform = 'mercadolivre' 
ORDER BY created_at DESC LIMIT 3;

-- Ver cupons capturados
SELECT code, title, discount_value, valid_until 
FROM coupons 
WHERE platform = 'mercadolivre' 
AND auto_captured = true
LIMIT 10;
```

---

## 🎉 PRONTO!

Se você ver:
- ✅ Logs com status "completed"
- ✅ Backend rodando sem erros
- ✅ Painel admin mostrando estatísticas

**ESTÁ FUNCIONANDO!** 🚀

A partir de agora, a cada **10 minutos** o sistema vai:
1. Buscar cupons no Mercado Livre
2. Salvar automaticamente
3. Gerar links de afiliado
4. Notificar usuários

---

## 🆘 Problemas?

### ❌ "coupon_settings table does not exist"
→ Execute a migration primeiro: `database/migrations/002_enhance_coupons_table.sql`

### ❌ "Token inválido" (401)
→ Token expirado. No painel, vá em Automação > Sincronizar Mercado Livre

### ❌ "0 cupons encontrados"
→ Normal! Nem sempre há deals ativos. Sistema vai tentar novamente.

### ❌ Cron não executa
→ Verifique: `ENABLE_CRON_JOBS=true` no .env

---

## 📊 Monitorar

**Painel Admin:** http://localhost:5173/coupon-capture

**Logs em tempo real:**
```bash
tail -f backend/logs/app.log | findstr "CAPTURA MELI"
```

**Status via API:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/coupon-capture/cron-status" -Headers @{Authorization="Bearer $token"}
```

---

**Tempo estimado:** 5 minutos  
**Dificuldade:** Fácil ⭐  
**Status:** ✅ Pronto para usar
