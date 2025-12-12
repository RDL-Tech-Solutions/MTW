# 🤖 Guia de Sincronização Automática de Produtos

## 📋 Visão Geral

O módulo de **Captura Automática de Produtos** permite que a plataforma MTW Promo busque automaticamente promoções do Mercado Livre e Shopee, filtre por desconto mínimo, gere links de afiliado e publique os produtos no app mobile, além de enviar notificações via bots (WhatsApp e Telegram).

---

## 🗄️ 1. Configurar Banco de Dados

### Executar Migration SQL

Execute o script SQL no Supabase:

```bash
backend/migrations/create_sync_tables.sql
```

Isso criará as tabelas:
- `sync_config` - Configurações de sincronização
- `sync_logs` - Histórico de sincronizações

---

## 🚀 2. Instalar Dependências

O projeto já usa `node-cron` e `axios`. Certifique-se de que as dependências estão instaladas:

```bash
cd backend
npm install node-cron axios
```

---

## ⚙️ 3. Configurar e Testar

### 3.1 Iniciar o Backend

```bash
cd backend
npm run dev
```

Você verá no console:
```
⏰ Agendando sincronização automática: a cada X minutos
✅ Cron de sincronização automática iniciado!
```

### 3.2 Acessar o Painel Admin

1. Inicie o frontend:
```bash
cd admin-panel
npm run dev
```

2. Acesse: `http://localhost:5173`

3. Faça login

4. Clique em **"Automação"** no menu lateral

---

## 📱 4. Usar a Interface

### 4.1 Configurar Sincronização

Na página **Automação de Produtos**:

1. **Ativar Sincronização Automática**
   - Toggle ON/OFF

2. **Selecionar Plataformas**
   - ☑️ Shopee
   - ☑️ Mercado Livre

3. **Palavras-chave**
   - Ex: `fones bluetooth, smartwatch, notebook gamer`
   - Separe por vírgula

4. **Desconto Mínimo**
   - Ex: `10` (apenas produtos com 10% ou mais de desconto)

5. **Intervalo de Sincronização**
   - Em minutos (1-1440)
   - Ex: `60` = rodar a cada 1 hora

6. **Salvar Configurações**
   - Clique em "Salvar Configurações"

### 4.2 Rodar Sincronização Manual

- Clique em **"Rodar Agora"**
- Aguarde o processamento
- Veja os resultados:
  - Total de produtos encontrados
  - Novos produtos adicionados

### 4.3 Visualizar Histórico

A tabela **"Últimas Promoções Capturadas"** mostra:
- Nome do produto
- Plataforma (Shopee/Mercado Livre)
- % de Desconto
- Status (Novo / Já existe)
- Enviado aos bots (Sim/Não)
- Data de captura

### 4.4 Estatísticas

Cards no topo mostram:
- **Total Sincronizados** (últimos 7 dias)
- **Produtos Novos** (adicionados ao catálogo)
- **Mercado Livre** (quantidade)
- **Shopee** (quantidade)

---

## 🔧 5. Endpoints da API

### GET `/api/sync/config`
Buscar configuração atual

**Resposta:**
```json
{
  "success": true,
  "data": {
    "shopee_enabled": false,
    "mercadolivre_enabled": true,
    "keywords": "fones bluetooth, smartwatch",
    "min_discount_percentage": 10,
    "cron_interval_minutes": 60,
    "is_active": true
  }
}
```

### POST `/api/sync/config`
Salvar/atualizar configuração

**Body:**
```json
{
  "shopee_enabled": true,
  "mercadolivre_enabled": true,
  "keywords": "notebook, celular",
  "min_discount_percentage": 15,
  "cron_interval_minutes": 30,
  "is_active": true
}
```

### POST `/api/sync/run-now`
Executar sincronização manual

**Resposta:**
```json
{
  "success": true,
  "data": {
    "mercadolivre": {
      "total": 25,
      "new": 3,
      "errors": 0
    },
    "shopee": {
      "total": 0,
      "new": 0,
      "errors": 0
    }
  }
}
```

### GET `/api/sync/history?limit=20`
Histórico de sincronizações

### GET `/api/sync/stats?days=7`
Estatísticas dos últimos X dias

---

## 🤖 6. Como Funciona

### 6.1 Fluxo Automático (Cron)

1. **Cron inicia** baseado no intervalo configurado
2. **Busca produtos** no Mercado Livre e/ou Shopee usando as palavras-chave
3. **Filtra promoções** (apenas produtos com desconto ≥ configurado)
4. **Verifica duplicatas** usando `external_id`
5. **Salva produtos novos** no banco de dados
6. **Publica no app** (automaticamente via API `/products`)
7. **Envia notificações**:
   - Telegram Bot
   - WhatsApp Bot
   - Push Notification (se configurado)
8. **Registra log** em `sync_logs`

### 6.2 Detecção de Promoção

#### Mercado Livre
```javascript
if (product.original_price && product.original_price > product.price) {
  discount = ((original_price - price) / original_price) * 100;
  if (discount >= min_discount_percentage) {
    // É uma promoção válida!
  }
}
```

#### Shopee
```javascript
if (product.price_before_discount && product.price_before_discount > product.price) {
  discount = ((price_before_discount - price) / price_before_discount) * 100;
  if (discount >= min_discount_percentage) {
    // É uma promoção válida!
  }
}
```

---

## 🔔 7. Notificações para Bots

Quando um produto novo é encontrado, a mensagem enviada:

```
🔥 NOVA PROMOÇÃO AUTOMÁTICA

📦 Fone Bluetooth JBL Tune 520BT

💰 R$ 199,90 ~R$ 399,00~
🏷️ 50% OFF

🛒 Plataforma: Mercado Livre

🔗 https://mercadolivre.com/...
```

---

## 📊 8. Logs do Backend

Durante a sincronização, você verá:

```
🚀 ========== INICIANDO SINCRONIZAÇÃO AUTOMÁTICA ==========
🛒 Sincronizando Mercado Livre...
🔍 Buscando no Mercado Livre: "fones bluetooth"
✅ 50 produtos encontrados no Mercado Livre
🎯 5 promoções válidas encontradas (desconto ≥ 10%)
✅ Novo produto salvo: Fone Bluetooth JBL
✨ Novo produto publicado: Fone Bluetooth JBL (50% OFF)
✅ ========== SINCRONIZAÇÃO CONCLUÍDA ==========
⏱️ Duração: 12.45s
📊 Mercado Livre: 3 novos de 5
🎉 Total de produtos novos: 3
```

---

## ⚠️ 9. Observações Importantes

### 9.1 Shopee API
⚠️ A integração com Shopee requer:
- Registro como **parceiro oficial**
- Obtenção de **credenciais de API**
- Implementação de **OAuth**

**Status Atual:** Mock/placeholder  
**Para Produção:** Siga a [documentação oficial da Shopee](https://open.shopee.com/documents)

### 9.2 Links de Afiliado

**Mercado Livre:**
- Retorna link direto do produto
- Para usar afiliados: integre com a [API de Afiliados ML](https://developers.mercadolivre.com.br/)

**Shopee:**
- Retorna link direto do produto
- Para usar afiliados: use o [Shopee Affiliate Link Generator](https://shopee.com.br/affiliate)

### 9.3 Rate Limiting

- Mercado Livre: ~5000 requisições/dia (gratuito)
- Evite intervalos muito curtos (< 5 minutos)

---

## 🛠️ 10. Troubleshooting

### Cron não está rodando
**Verificar:**
1. Config `is_active` está `true`?
2. Pelo menos uma plataforma está habilitada?
3. Backend está rodando?

**Logs:**
```bash
tail -f backend/logs/app.log | grep "SINCRONIZAÇÃO"
```

### Produtos não aparecem no app
**Verificar:**
1. Produto foi salvo? (checar `sync_logs`)
2. `is_active: true` no banco?
3. App está consumindo `/api/products`?

### Bots não recebem notificação
**Verificar:**
1. Bots estão configurados?
2. `notificationDispatcher` está funcionando?
3. Verificar logs: `sent_to_bots` em `sync_logs`

---

## 📝 11. Estrutura de Arquivos

```
backend/
├── src/
│   ├── models/
│   │   ├── SyncConfig.js          # Modelo de configuração
│   │   └── SyncLog.js              # Modelo de logs
│   ├── services/
│   │   └── autoSync/
│   │       ├── meliSync.js         # Sincronização Mercado Livre
│   │       ├── shopeeSync.js       # Sincronização Shopee
│   │       └── publishService.js   # Publicação e notificações
│   ├── controllers/
│   │   └── syncController.js       # Controller de API
│   ├── routes/
│   │   └── syncRoutes.js           # Rotas de API
│   └── cron/
│       └── autoSyncCron.js         # Cron job principal
└── migrations/
    └── create_sync_tables.sql      # Migration SQL

admin-panel/
└── src/
    └── pages/
        └── AutoSync.jsx            # Interface React
```

---

## ✅ 12. Checklist de Setup

- [ ] Executar migration SQL no Supabase
- [ ] Instalar dependências (`node-cron`, `axios`)
- [ ] Reiniciar backend
- [ ] Acessar painel admin
- [ ] Configurar palavras-chave
- [ ] Definir desconto mínimo
- [ ] Ativar sincronização
- [ ] Testar "Rodar Agora"
- [ ] Verificar logs
- [ ] Confirmar produtos no app
- [ ] Verificar notificações nos bots

---

## 🎉 Pronto!

Seu sistema de **Captura Automática de Produtos** está funcionando! 🚀

**Dúvidas ou problemas?** Verifique os logs do backend ou entre em contato com o suporte técnico.
