# 🛒 ATIVAÇÃO RÁPIDA - Captura de Cupons Mercado Livre

## ✅ Configurações já realizadas:

### 1. Variáveis de Ambiente (.env) ✅
```env
MELI_CLIENT_ID=6916793910009014
MELI_CLIENT_SECRET=hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2
MELI_ACCESS_TOKEN=APP_USR-6916793910009014-121211-f695ab95f44cef7d15f515fc0a378b7b-260114746
MELI_REFRESH_TOKEN=TG-693c31635b72b80001701450-260114746
MELI_API_URL=https://api.mercadolibre.com
MELI_AFFILIATE_CODE=RDLTECH ✅ NOVO!

# Módulo de Captura
COUPON_CAPTURE_ENABLED=true ✅ NOVO!
COUPON_CAPTURE_INTERVAL=10 ✅ NOVO!
```

---

## 🚀 Passos para Ativar (5 minutos)

### PASSO 1: Executar Migration (se ainda não fez)

**Opção A - Via Supabase Dashboard:**
1. Acesse: https://app.supabase.com/project/rsulwtpvvjkysqqsbtlq/editor
2. Copie o conteúdo de: `database/migrations/002_enhance_coupons_table.sql`
3. Cole no SQL Editor
4. Clique em **RUN**

**Opção B - Via linha de comando:**
```bash
psql postgresql://postgres:[PASSWORD]@db.rsulwtpvvjkysqqsbtlq.supabase.co:5432/postgres -f database/migrations/002_enhance_coupons_table.sql
```

---

### PASSO 2: Ativar Mercado Livre no Banco

**Execute este SQL no Supabase:**

```bash
# Copie o arquivo criado:
database/ativar_meli_captura.sql
```

**Ou copie e cole diretamente no SQL Editor:**

```sql
-- Criar/Atualizar configurações
DO $$
DECLARE
    settings_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO settings_count FROM coupon_settings;
    
    IF settings_count = 0 THEN
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
        );
    ELSE
        UPDATE coupon_settings
        SET auto_capture_enabled = true,
            meli_enabled = true,
            meli_capture_deals = true,
            meli_capture_campaigns = true,
            capture_interval_minutes = 10,
            updated_at = NOW();
    END IF;
END $$;

-- Verificar
SELECT * FROM coupon_settings;
```

✅ Você deve ver: `meli_enabled = true`

---

### PASSO 3: Reiniciar Backend

```bash
# No terminal do backend
cd c:\Users\RDL Tech Solutions\Documents\RDL\Projetos\MTW\backend

# Parar se estiver rodando (Ctrl+C)

# Iniciar novamente
npm start
```

**Aguarde ver no console:**
```
✅ Cron de captura de cupons iniciado!
✅ Próxima captura em: 10 minutos
```

---

### PASSO 4: Testar Manualmente

**Opção A - Via Painel Admin:**

1. Acesse: http://localhost:5173/coupon-capture
2. Clique em **"Sincronizar Agora"** no botão azul superior
3. Ou clique em **"Sincronizar"** no card do Mercado Livre

**Opção B - Via API:**

```bash
# 1. Obter token de autenticação
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@mtwpromo.com\",\"password\":\"admin123\"}"

# Copie o token da resposta, depois:

# 2. Testar sincronização
curl -X POST http://localhost:3000/api/coupon-capture/sync/mercadolivre \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

### PASSO 5: Verificar Resultados

**No Supabase - SQL Editor:**

```sql
-- Ver logs da sincronização
SELECT 
    platform,
    sync_type,
    status,
    coupons_found,
    coupons_created,
    errors,
    created_at
FROM coupon_sync_logs
WHERE platform = 'mercadolivre'
ORDER BY created_at DESC
LIMIT 5;

-- Ver cupons capturados
SELECT 
    code,
    title,
    discount_type,
    discount_value,
    valid_until,
    is_active,
    created_at
FROM coupons
WHERE platform = 'mercadolivre'
AND auto_captured = true
ORDER BY created_at DESC
LIMIT 10;
```

**No Backend - Logs:**

```bash
# Ver logs em tempo real
tail -f backend/logs/app.log | grep -i "mercado\|meli"

# Ver últimos 20 logs
tail -n 20 backend/logs/app.log | grep -i mercado
```

---

## 🎯 O que esperar:

### ✅ Sucesso:

Você verá no painel admin:
- 📊 Card do Mercado Livre com estatísticas
- 🎟️ Lista de cupons capturados
- 📝 Logs mostrando "completed"
- ✅ Status "Sincronização concluída"

No banco de dados:
- Registros em `coupon_sync_logs` com status "completed"
- Cupons em `coupons` com `platform = 'mercadolivre'`

### ⚠️ Se não encontrar cupons:

É normal! Nem sempre há deals/cupons ativos no Mercado Livre. O sistema irá:
- ✅ Executar a sincronização
- ✅ Registrar no log: "0 cupons encontrados"
- ✅ Tentar novamente em 10 minutos

---

## 📊 Monitoramento Contínuo

### Via Painel Admin

Acesse: http://localhost:5173/coupon-capture

**Você verá:**
- 📈 Estatísticas em tempo real
- 🔄 Última sincronização
- 📝 Logs detalhados
- ⚙️ Status do cron (Ativo/Inativo)

### Via API

```bash
# Status do cron
curl http://localhost:3000/api/coupon-capture/cron-status \
  -H "Authorization: Bearer TOKEN"

# Estatísticas dos últimos 7 dias
curl http://localhost:3000/api/coupon-capture/stats?days=7 \
  -H "Authorization: Bearer TOKEN"

# Últimos 10 logs
curl http://localhost:3000/api/coupon-capture/logs?limit=10 \
  -H "Authorization: Bearer TOKEN"
```

---

## 🔧 Troubleshooting

### ❌ Erro: "coupon_settings table does not exist"

**Solução:** Execute a migration primeiro (PASSO 1)

### ❌ Erro: "MELI_ACCESS_TOKEN is invalid"

**Solução:** Token pode ter expirado. Renovar:
```bash
# Acessar endpoint de refresh
curl -X POST http://localhost:3000/api/sync/mercadolivre/refresh-token
```

### ❌ Cron não está executando

**Verificar:**
```bash
# No .env
ENABLE_CRON_JOBS=true
COUPON_CAPTURE_ENABLED=true

# Reiniciar backend
npm start
```

### ❌ Não encontra cupons

**Normal!** O Mercado Livre nem sempre tem deals/cupons ativos. 

Para forçar teste com dados mockados, vá em:
`backend/src/services/coupons/meliCouponCapture.js`

E temporariamente adicione cupons de teste.

---

## 🎉 Pronto!

Sua captura automática do Mercado Livre está ativa!

### O que acontece agora:

⏰ **A cada 10 minutos:**
1. Sistema busca deals/cupons no Mercado Livre
2. Salva no banco automaticamente
3. Gera link de afiliado com código `RDLTECH`
4. Envia notificações (se configurado)

🔍 **A cada 6 horas:**
- Verifica cupons expirados
- Desativa automaticamente

📊 **Você pode:**
- Monitorar no painel admin
- Forçar sincronização manual
- Ver logs em tempo real
- Pausar/Retomar quando quiser

---

## 📱 Próximos Passos

1. ✅ Testar notificações nos bots
2. ✅ Configurar WhatsApp/Telegram (se ainda não fez)
3. ✅ Ajustar intervalo de captura (se quiser)
4. ✅ Adicionar outras plataformas (Shopee, Amazon, AliExpress)

---

**Desenvolvido com ❤️ para MTW Promo**
**Data:** 12/12/2024
**Status:** ✅ Mercado Livre ATIVO!
