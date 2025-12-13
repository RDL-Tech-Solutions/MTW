# 🔥 Módulo Avançado de Captura Automática de Cupons — MTW Promo

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Instalação e Configuração](#instalação-e-configuração)
- [Uso](#uso)
- [APIs](#apis)
- [Banco de Dados](#banco-de-dados)
- [Painel Admin](#painel-admin)
- [Bots e Notificações](#bots-e-notificações)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O **Módulo de Captura Automática de Cupons** é um sistema completo que:

✅ Captura cupons válidos em tempo real de múltiplas plataformas  
✅ Processa, formata e publica automaticamente  
✅ Adiciona link de afiliado a cada cupom  
✅ Verifica programadamente cupons expirados  
✅ Envia notificações automáticas aos bots  
✅ Remove cupons expirados do app e do painel  

### Plataformas Suportadas

- 🛍️ **Shopee Affiliate** - Integração completa com API oficial
- 🛒 **Mercado Livre** - Deals, Campanhas e Promoções
- 📦 **Amazon Associates** - Estrutura preparada (requer configuração)
- 🌐 **AliExpress** - Estrutura preparada (requer configuração)

---

## ⚡ Funcionalidades

### Captura Automática
- ✅ Executa a cada X minutos (configurável, padrão 10min)
- ✅ Captura paralela de todas as plataformas ativas
- ✅ Detecção inteligente de cupons duplicados
- ✅ Geração automática de links de afiliado
- ✅ Retry automático em caso de falha

### Verificação de Validade
- ✅ Verificação programada de cupons expirados (a cada 6h)
- ✅ Desativação automática de cupons inválidos
- ✅ Notificação de cupons expirando em breve (3 dias)
- ✅ Verificação diária de validade (3h da manhã)

### Notificações Automáticas
- ✅ Notificação via WhatsApp quando novo cupom é encontrado
- ✅ Notificação via Telegram quando novo cupom é encontrado
- ✅ Alerta quando cupom expira
- ✅ Notificações push para usuários do app
- ✅ Mensagens formatadas com informações completas

### Painel Admin
- ✅ Dashboard com estatísticas detalhadas
- ✅ Lista de cupons capturados com filtros
- ✅ Logs de sincronização em tempo real
- ✅ Configurações por plataforma
- ✅ Controle manual de sincronização
- ✅ Ativar/Pausar captura automática

---

## 🏗️ Arquitetura

### Estrutura de Diretórios

```
backend/
├── src/
│   ├── models/
│   │   ├── Coupon.js                    # Model de cupons (atualizado)
│   │   ├── CouponSyncLog.js             # Logs de sincronização
│   │   └── CouponSettings.js            # Configurações do módulo
│   │
│   ├── services/
│   │   └── coupons/
│   │       ├── shopeeCouponCapture.js   # Captura Shopee
│   │       ├── meliCouponCapture.js     # Captura Mercado Livre
│   │       ├── amazonCouponCapture.js   # Captura Amazon
│   │       ├── aliExpressCouponCapture.js # Captura AliExpress
│   │       ├── couponCaptureService.js  # Orquestrador principal
│   │       └── couponNotificationService.js # Notificações
│   │
│   ├── controllers/
│   │   └── couponCaptureController.js   # Controller REST
│   │
│   ├── routes/
│   │   └── couponCaptureRoutes.js       # Rotas da API
│   │
│   └── cron/
│       └── couponCaptureCron.js         # Cron jobs
│
├── database/
│   └── migrations/
│       └── 002_enhance_coupons_table.sql # Migration
│
admin-panel/
└── src/
    └── pages/
        └── CouponCapture.jsx            # Painel admin
```

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────┐
│                   CRON SCHEDULER                    │
│              (A cada 10 minutos)                    │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│            COUPON CAPTURE SERVICE                   │
│          (Orquestrador Principal)                   │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┼───────────┬──────────┐
         ▼           ▼           ▼          ▼
    ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
    │ Shopee │  │  MELI  │  │ Amazon │  │  Ali   │
    │Capture │  │Capture │  │Capture │  │Capture │
    └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘
        │           │           │           │
        └───────────┴───────────┴───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Processar Cupons     │
         │  - Validar            │
         │  - Gerar Link Afiliado│
         │  - Salvar no Banco    │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
    ┌─────────┐          ┌──────────────┐
    │  BOTS   │          │  APP MOBILE  │
    │ WhatsApp│          │ Notificações │
    │ Telegram│          │    Push      │
    └─────────┘          └──────────────┘
```

---

## 🚀 Instalação e Configuração

### 1. Executar Migration

Execute a migration no SQL Editor do Supabase:

```bash
# Copie e execute o conteúdo de:
database/migrations/002_enhance_coupons_table.sql
```

Ou via psql:
```bash
psql -U postgres -d seu_banco -f database/migrations/002_enhance_coupons_table.sql
```

### 2. Configurar Variáveis de Ambiente

Adicione ao `.env` do backend:

```env
# ============================================
# COUPON CAPTURE MODULE
# ============================================

# Shopee Affiliate API
SHOPEE_PARTNER_ID=seu_partner_id
SHOPEE_PARTNER_KEY=sua_partner_key

# Mercado Livre Affiliate
MELI_AFFILIATE_CODE=seu_codigo_afiliado

# Amazon Associates (Opcional)
AMAZON_PARTNER_TAG=seu_partner_tag
AMAZON_ACCESS_KEY=sua_access_key
AMAZON_SECRET_KEY=sua_secret_key

# AliExpress (Opcional)
ALIEXPRESS_APP_KEY=seu_app_key
ALIEXPRESS_APP_SECRET=seu_app_secret
ALIEXPRESS_TRACKING_ID=seu_tracking_id

# Configurações do Módulo
COUPON_CAPTURE_INTERVAL=10  # Minutos entre capturas
COUPON_CAPTURE_ENABLED=true
```

### 3. Instalar Dependências

As dependências já estão incluídas no `package.json`:

```bash
cd backend
npm install
```

### 4. Iniciar o Sistema

```bash
# Backend
cd backend
npm start

# Admin Panel
cd admin-panel
npm run dev
```

O cron job será iniciado automaticamente se `ENABLE_CRON_JOBS=true`.

---

## 📖 Uso

### Painel Admin

Acesse: `http://localhost:5173/coupon-capture`

#### Dashboard

- Visualize estatísticas de todas as plataformas
- Monitore status dos cron jobs
- Veja cupons ativos e expirando

#### Sincronização Manual

```javascript
// Sincronizar todas as plataformas
POST /api/coupon-capture/sync/all

// Sincronizar plataforma específica
POST /api/coupon-capture/sync/shopee
POST /api/coupon-capture/sync/mercadolivre
POST /api/coupon-capture/sync/amazon
POST /api/coupon-capture/sync/aliexpress
```

#### Configurações

No painel, você pode:
- ✅ Ativar/Desativar captura automática
- ✅ Configurar intervalo de captura (1-1440 minutos)
- ✅ Ativar/Desativar plataformas individualmente
- ✅ Configurar notificações de bots
- ✅ Gerenciar credenciais de APIs

---

## 🔌 APIs

### Endpoints Disponíveis

#### Sincronização

```http
POST /api/coupon-capture/sync/all
Authorization: Bearer {token}
```

```http
POST /api/coupon-capture/sync/:platform
Authorization: Bearer {token}
```

#### Verificação

```http
POST /api/coupon-capture/check-expired
Authorization: Bearer {token}
```

```http
POST /api/coupon-capture/verify-active
Authorization: Bearer {token}
```

#### Estatísticas e Logs

```http
GET /api/coupon-capture/stats?days=7
Authorization: Bearer {token}
```

```http
GET /api/coupon-capture/logs?limit=50&platform=shopee
Authorization: Bearer {token}
```

```http
GET /api/coupon-capture/cron-status
Authorization: Bearer {token}
```

#### Configurações

```http
GET /api/coupon-capture/settings
Authorization: Bearer {token}
```

```http
PUT /api/coupon-capture/settings
Authorization: Bearer {token}
Content-Type: application/json

{
  "capture_interval_minutes": 15,
  "shopee_enabled": true,
  "meli_enabled": true,
  "notify_bots_on_new_coupon": true
}
```

```http
POST /api/coupon-capture/toggle-auto-capture
Authorization: Bearer {token}
Content-Type: application/json

{
  "enabled": true
}
```

#### Gestão de Cupons

```http
GET /api/coupon-capture/coupons?page=1&limit=20&platform=shopee
Authorization: Bearer {token}
```

```http
PUT /api/coupon-capture/coupons/:id/expire
Authorization: Bearer {token}
```

```http
PUT /api/coupon-capture/coupons/:id/reactivate
Authorization: Bearer {token}
```

---

## 💾 Banco de Dados

### Tabelas Criadas

#### `coupons` (Campos Adicionados)

```sql
ALTER TABLE coupons
ADD COLUMN title VARCHAR(500),
ADD COLUMN description TEXT,
ADD COLUMN affiliate_link TEXT,
ADD COLUMN campaign_id VARCHAR(255),
ADD COLUMN campaign_name VARCHAR(500),
ADD COLUMN terms_and_conditions TEXT,
ADD COLUMN auto_captured BOOLEAN DEFAULT FALSE,
ADD COLUMN source_url TEXT,
ADD COLUMN last_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN verification_status VARCHAR(20) DEFAULT 'pending';
```

#### `coupon_sync_logs`

Armazena logs de todas as sincronizações:

```sql
CREATE TABLE coupon_sync_logs (
  id UUID PRIMARY KEY,
  platform VARCHAR(20),
  sync_type VARCHAR(50),
  coupons_found INTEGER,
  coupons_created INTEGER,
  coupons_updated INTEGER,
  coupons_expired INTEGER,
  errors INTEGER,
  error_details TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(20),
  created_at TIMESTAMP
);
```

#### `coupon_settings`

Configurações globais do módulo:

```sql
CREATE TABLE coupon_settings (
  id UUID PRIMARY KEY,
  auto_capture_enabled BOOLEAN,
  capture_interval_minutes INTEGER,
  shopee_enabled BOOLEAN,
  shopee_partner_id VARCHAR(255),
  shopee_partner_key TEXT,
  meli_enabled BOOLEAN,
  meli_capture_deals BOOLEAN,
  meli_capture_campaigns BOOLEAN,
  amazon_enabled BOOLEAN,
  amazon_partner_tag VARCHAR(255),
  aliexpress_enabled BOOLEAN,
  notify_bots_on_new_coupon BOOLEAN,
  notify_bots_on_expiration BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Queries Úteis

```sql
-- Ver cupons capturados automaticamente
SELECT * FROM coupons 
WHERE auto_captured = TRUE 
ORDER BY created_at DESC;

-- Ver logs de sincronização das últimas 24h
SELECT * FROM coupon_sync_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Estatísticas por plataforma
SELECT 
  platform,
  COUNT(*) as total,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as ativos,
  AVG(discount_value) as desconto_medio
FROM coupons 
WHERE auto_captured = TRUE
GROUP BY platform;

-- Cupons expirando nos próximos 3 dias
SELECT * FROM coupons
WHERE is_active = TRUE
AND valid_until BETWEEN NOW() AND NOW() + INTERVAL '3 days'
ORDER BY valid_until ASC;
```

---

## 🎨 Painel Admin

### Telas Implementadas

#### 1. Visão Geral
- Cards com métricas principais
- Estatísticas por plataforma
- Status dos cron jobs
- Botões de ação rápida

#### 2. Cupons Capturados
- Lista completa com filtros
- Informações de cada cupom
- Ações: Expirar, Ver detalhes
- Paginação

#### 3. Logs de Sincronização
- Histórico completo
- Status de cada sincronização
- Métricas de performance
- Detalhes de erros

#### 4. Configurações
- Intervalo de captura
- Ativar/Desativar plataformas
- Configurar notificações
- Gerenciar credenciais

### Componentes Principais

```jsx
// Página principal
<CouponCapture />

// Tabs
- Overview (Estatísticas)
- Coupons (Lista de cupons)
- Logs (Histórico de sync)
- Settings (Configurações)
```

---

## 📢 Bots e Notificações

### Formato de Mensagens

#### Novo Cupom

```
🔥 CUPOM NOVO DISPONÍVEL 🔥

🛍️ Plataforma: Shopee
🎟️ Cupom: PROMO50
💰 Desconto: 50% OFF
📅 Válido até: 31/12/2024 23:59
💳 Compra mínima: R$ 100,00

📝 Super Desconto de Natal

👉 Link com desconto:
https://shopee.com.br/deal/...

⚡ Aproveite antes que expire!
```

#### Cupom Expirado

```
⚠️ CUPOM EXPIROU ⚠️

🛍️ Plataforma: Shopee
🎟️ Cupom: PROMO50
📅 Expirado em: 31/12/2024 23:59

😢 Infelizmente este cupom não está mais disponível.
Fique de olho para novos cupons!
```

#### Cupom Expirando

```
⏰ CUPOM EXPIRANDO EM 2 DIA(S) ⏰

🛍️ Plataforma: Shopee
🎟️ Cupom: PROMO50
💰 Desconto: 50% OFF
📅 Expira em: 31/12/2024 23:59

👉 Link:
https://shopee.com.br/deal/...

⚡ Última chance! Não perca!
```

### Configuração de Notificações

No painel admin > Configurações:

```javascript
{
  notify_bots_on_new_coupon: true,  // Notificar novos cupons
  notify_bots_on_expiration: true   // Notificar expirados
}
```

---

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Cron não está executando

**Solução:**
```bash
# Verificar se está ativado no .env
ENABLE_CRON_JOBS=true

# Verificar logs
tail -f logs/app.log | grep "CAPTURA"

# Verificar status via API
curl http://localhost:3000/api/coupon-capture/cron-status \
  -H "Authorization: Bearer SEU_TOKEN"
```

#### 2. Erro na API Shopee

**Solução:**
```bash
# Verificar credenciais
echo $SHOPEE_PARTNER_ID
echo $SHOPEE_PARTNER_KEY

# Testar manualmente
curl -X POST http://localhost:3000/api/coupon-capture/sync/shopee \
  -H "Authorization: Bearer SEU_TOKEN"

# Verificar logs
grep "Shopee" logs/app.log
```

#### 3. Cupons não aparecem no app

**Solução:**
```sql
-- Verificar se foram salvos
SELECT * FROM coupons WHERE auto_captured = TRUE LIMIT 10;

-- Verificar se estão ativos
SELECT * FROM coupons 
WHERE auto_captured = TRUE 
AND is_active = TRUE 
AND verification_status = 'active';

-- Verificar data de validade
SELECT code, valid_until 
FROM coupons 
WHERE auto_captured = TRUE
AND valid_until > NOW();
```

#### 4. Notificações não estão sendo enviadas

**Solução:**
```javascript
// Verificar configurações
GET /api/coupon-capture/settings

// Verificar se bots estão configurados
GET /api/bots/status

// Testar notificação manualmente
POST /api/bots/test
```

### Logs Importantes

```bash
# Ver todos os logs de captura
grep "CAPTURA" logs/app.log

# Ver erros
grep "ERROR.*coupon" logs/app.log

# Ver sincronizações bem-sucedidas
grep "concluída" logs/app.log

# Ver notificações enviadas
grep "Notificação.*enviada" logs/app.log
```

### Monitoramento

```bash
# Status geral do sistema
curl http://localhost:3000/api/health

# Status dos cron jobs
curl http://localhost:3000/api/coupon-capture/cron-status \
  -H "Authorization: Bearer TOKEN"

# Estatísticas
curl "http://localhost:3000/api/coupon-capture/stats?days=1" \
  -H "Authorization: Bearer TOKEN"
```

---

## 📊 Métricas e KPIs

### Principais Métricas

- **Cupons Ativos**: Quantidade de cupons válidos disponíveis
- **Taxa de Captura**: Novos cupons encontrados / Total de sincronizações
- **Taxa de Sucesso**: Sincronizações bem-sucedidas / Total
- **Tempo Médio de Sync**: Duração média das sincronizações
- **Cupons Expirando**: Quantidade expirando nos próximos 3 dias

### Dashboard

No painel admin, você encontra:
- Gráficos de tendência (últimos 7 dias)
- Comparativo entre plataformas
- Taxa de conversão de cupons
- Erros e alertas

---

## 🎯 Próximos Passos

### Melhorias Futuras

1. **Machine Learning**
   - Previsão de popularidade de cupons
   - Recomendação personalizada

2. **Integração com mais plataformas**
   - Kabum
   - Magazine Luiza
   - Americanas

3. **Analytics Avançado**
   - Relatórios automáticos
   - Exportação para Excel/PDF

4. **Webhooks**
   - Notificação para sistemas externos
   - Integração com Zapier

---

## 🤝 Suporte

Para dúvidas ou problemas:

1. Verifique os logs: `logs/app.log`
2. Consulte a documentação das APIs das plataformas
3. Verifique as configurações no painel admin
4. Execute testes manuais de sincronização

---

## 📝 Changelog

### v1.0.0 (2024-12-12)
- ✅ Implementação inicial do módulo
- ✅ Suporte a Shopee e Mercado Livre
- ✅ Estrutura para Amazon e AliExpress
- ✅ Painel admin completo
- ✅ Notificações automáticas
- ✅ Cron jobs configuráveis
- ✅ Documentação completa

---

## 📄 Licença

MIT License - MTW Promo © 2024
