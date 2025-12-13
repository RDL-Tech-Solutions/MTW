# 🤖 Sistema de Bots - WhatsApp e Telegram

## 📋 Visão Geral

Sistema completo de notificações automáticas via bots de WhatsApp e Telegram integrado ao backend MTW Promo. Os bots enviam notificações automáticas para grupos configurados sempre que ocorrem eventos importantes.

## 🎯 Eventos Monitorados

### 1. Nova Promoção Cadastrada
- **Trigger**: Quando um produto com desconto é criado
- **Formato da Mensagem**:
```
🔥 Nova Promoção!

🛍 [Nome do Produto]

De: R$ [Preço Antigo]
💰 Por: R$ [Preço Atual] [X% OFF]

🏪 Loja: [Plataforma]
📦 Categoria: [Categoria]

🔗 Link: [Link Afiliado]

⚡ Aproveite antes que acabe!
```

### 2. Novo Cupom Cadastrado
- **Trigger**: Quando um cupom é criado
- **Formato da Mensagem**:
```
🎟 Novo Cupom Disponível!

🏪 Loja: [Plataforma]
💬 Código: [CODIGO]
💰 Benefício: [Desconto]
💵 Compra mínima: R$ [Valor]
⏳ Expira em: [Data]

⚠️ [Restrições]

🔥 Use agora e economize!
```

### 3. Cupom Expirado
- **Trigger**: Verificação automática a cada 1 minuto
- **Ação**: Desativa o cupom e envia notificação
- **Formato da Mensagem**:
```
❌ Cupom Expirado

🏪 Loja: [Plataforma]
💬 Código: [CODIGO]
⏱ Expirou em: [Data]

😔 Infelizmente este cupom não está mais disponível.
🔔 Fique atento às próximas promoções!
```

## 🗄️ Estrutura do Banco de Dados

### Tabela: `bot_channels`
Armazena os canais/grupos configurados para receber notificações.

```sql
- id (UUID)
- platform (whatsapp | telegram)
- identifier (ID do grupo/canal)
- name (Nome descritivo)
- is_active (boolean)
- created_at
- updated_at
```

### Tabela: `notification_logs`
Registra todas as notificações enviadas.

```sql
- id (UUID)
- event_type (promotion_new | coupon_new | coupon_expired)
- platform (whatsapp | telegram)
- channel_id (FK para bot_channels)
- payload (JSONB com dados do evento)
- status (pending | sent | failed)
- error_message (TEXT)
- sent_at
- created_at
```

## 🔧 Configuração

### 1. Executar Migration do Banco de Dados

```bash
# Execute o script SQL no Supabase SQL Editor
database/migrations/001_add_bot_tables.sql
```

### 2. Configurar Variáveis de Ambiente

Adicione ao arquivo `.env`:

```env
# WhatsApp Bot (Meta WhatsApp Cloud API)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN=seu_token_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id

# Telegram Bot
TELEGRAM_BOT_TOKEN=seu_bot_token_aqui
```

### 3. Configurar WhatsApp Bot

#### Opção 1: Meta WhatsApp Cloud API (Recomendado)

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Crie um app e ative WhatsApp Business API
3. Obtenha o `Access Token` e `Phone Number ID`
4. Configure o webhook (opcional)

#### Opção 2: APIs Alternativas

- **Z-API**: https://z-api.io/
- **UltraMsg**: https://ultramsg.com/
- **Evolution API**: https://evolution-api.com/

### 4. Configurar Telegram Bot

1. Abra o Telegram e procure por `@BotFather`
2. Envie `/newbot` e siga as instruções
3. Copie o token fornecido
4. Adicione o bot aos grupos desejados
5. Para obter o Chat ID do grupo:
   - Adicione o bot `@getidsbot` ao grupo
   - O bot enviará o Chat ID

## 📡 API Endpoints

### Gerenciamento de Canais

#### Listar Canais
```http
GET /api/bots/channels
Authorization: Bearer {admin_token}

Query Params:
- platform: whatsapp | telegram
- is_active: true | false
```

#### Criar Canal
```http
POST /api/bots/channels
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "platform": "telegram",
  "identifier": "-1001234567890",
  "name": "Grupo Principal",
  "is_active": true
}
```

#### Atualizar Canal
```http
PUT /api/bots/channels/:id
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Novo Nome",
  "is_active": true
}
```

#### Deletar Canal
```http
DELETE /api/bots/channels/:id
Authorization: Bearer {admin_token}
```

#### Ativar/Desativar Canal
```http
PATCH /api/bots/channels/:id/toggle
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "is_active": false
}
```

### Testes

#### Enviar Teste para Todos os Canais
```http
POST /api/bots/test
Authorization: Bearer {admin_token}
```

#### Enviar Teste para Canal Específico
```http
POST /api/bots/test
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "channelId": "uuid-do-canal"
}
```

### Logs e Estatísticas

#### Listar Logs
```http
GET /api/bots/logs
Authorization: Bearer {admin_token}

Query Params:
- page: 1
- limit: 50
- event_type: promotion_new | coupon_new | coupon_expired
- platform: whatsapp | telegram
- status: pending | sent | failed
- start_date: 2024-01-01
- end_date: 2024-12-31
```

#### Obter Estatísticas
```http
GET /api/bots/stats
Authorization: Bearer {admin_token}

Query Params:
- start_date: 2024-01-01
- end_date: 2024-12-31
- platform: whatsapp | telegram
```

#### Verificar Status dos Bots
```http
GET /api/bots/status
Authorization: Bearer {admin_token}
```

## 🔄 Fluxo de Notificações

### 1. Nova Promoção
```
Produto criado com desconto
    ↓
ProductController.create()
    ↓
notificationDispatcher.notifyNewPromotion()
    ↓
Busca canais ativos
    ↓
Para cada canal:
  - Formata mensagem
  - Envia via WhatsApp/Telegram
  - Registra log
```

### 2. Novo Cupom
```
Cupom criado
    ↓
CouponController.create()
    ↓
notificationDispatcher.notifyNewCoupon()
    ↓
Busca canais ativos
    ↓
Para cada canal:
  - Formata mensagem
  - Envia via WhatsApp/Telegram
  - Registra log
```

### 3. Cupom Expirado
```
Cron Job (a cada 1 minuto)
    ↓
monitorExpiredCoupons()
    ↓
Busca cupons expirados
    ↓
Para cada cupom:
  - Envia notificação
  - Desativa cupom
  - Registra log
```

## 🎨 Integração com Painel Admin

### Tela de Gerenciamento de Bots

Criar em: `admin-panel/src/pages/Bots.jsx`

**Funcionalidades:**
- ✅ Listar canais configurados
- ✅ Adicionar novo canal (WhatsApp ou Telegram)
- ✅ Editar canal existente
- ✅ Ativar/Desativar canal
- ✅ Remover canal
- ✅ Botão "Enviar Teste" para cada canal
- ✅ Botão "Testar Todos"
- ✅ Visualizar logs de notificações
- ✅ Estatísticas de envio
- ✅ Status dos bots (configurado/funcionando)

### Exemplo de Componente React

```jsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function BotsPage() {
  const [channels, setChannels] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadChannels();
    loadLogs();
    loadStats();
  }, []);

  const loadChannels = async () => {
    const response = await api.get('/bots/channels');
    setChannels(response.data.data);
  };

  const sendTest = async (channelId = null) => {
    const payload = channelId ? { channelId } : {};
    await api.post('/bots/test', payload);
    alert('Teste enviado!');
  };

  // ... resto da implementação
}
```

## 🧪 Testes

### 1. Testar Configuração do Telegram

```bash
curl https://api.telegram.org/bot{SEU_TOKEN}/getMe
```

### 2. Obter Chat ID do Grupo Telegram

```bash
# Adicione o bot ao grupo e envie uma mensagem
curl https://api.telegram.org/bot{SEU_TOKEN}/getUpdates
```

### 3. Testar Envio via API

```bash
# Testar todos os canais
curl -X POST http://localhost:3000/api/bots/test \
  -H "Authorization: Bearer {admin_token}"

# Testar canal específico
curl -X POST http://localhost:3000/api/bots/test \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"channelId": "uuid-do-canal"}'
```

## 📊 Monitoramento

### Logs do Sistema

```bash
# Ver logs em tempo real
tail -f logs/app.log | grep -i "bot\|notification"
```

### Verificar Cron Jobs

Os cron jobs são iniciados automaticamente quando `ENABLE_CRON_JOBS=true`:

- ✅ Monitoramento de cupons expirados: **a cada 1 minuto**
- ✅ Verificação de cupons: a cada 30 minutos
- ✅ Atualização de preços: a cada 15 minutos
- ✅ Limpeza de dados: diariamente às 3h

## 🚨 Troubleshooting

### WhatsApp não está enviando

1. Verifique se o token está correto
2. Confirme que o Phone Number ID está correto
3. Verifique se o número está verificado no Meta Business
4. Confira os logs: `logs/app.log`

### Telegram não está enviando

1. Verifique se o bot token está correto
2. Confirme que o bot foi adicionado ao grupo
3. Verifique se o Chat ID está correto (deve começar com `-`)
4. Teste o bot manualmente: `/start` no grupo

### Notificações não estão sendo disparadas

1. Verifique se `ENABLE_CRON_JOBS=true` no `.env`
2. Confirme que há canais ativos cadastrados
3. Verifique os logs de notificação via API
4. Teste manualmente criando um cupom/produto

## 📝 Notas Importantes

- ⚠️ **Rate Limiting**: O Telegram tem limite de ~30 mensagens/segundo
- ⚠️ **WhatsApp Cloud API**: Requer verificação de negócio para produção
- ⚠️ **Custos**: WhatsApp Cloud API tem custos por mensagem após limite gratuito
- ⚠️ **Privacidade**: Não armazene tokens em código, use variáveis de ambiente
- ⚠️ **Logs**: Configure limpeza automática de logs antigos (já implementado)

## 🔐 Segurança

- ✅ Apenas admins podem gerenciar canais
- ✅ Tokens armazenados em variáveis de ambiente
- ✅ Logs de todas as notificações enviadas
- ✅ Validação de dados em todos os endpoints
- ✅ Rate limiting aplicado nas rotas da API

## 📚 Recursos Adicionais

### WhatsApp
- [Meta WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Business API](https://business.whatsapp.com/products/business-api)

### Telegram
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [BotFather](https://t.me/botfather)
- [Telegram Bot Tutorial](https://core.telegram.org/bots/tutorial)

## 🎉 Conclusão

O sistema de bots está completamente integrado e pronto para uso. Todas as notificações são enviadas automaticamente, com logs completos e gerenciamento via painel admin.

**Próximos passos:**
1. Execute a migration do banco de dados
2. Configure as variáveis de ambiente
3. Crie os bots (WhatsApp e/ou Telegram)
4. Adicione os canais via API ou painel admin
5. Teste o envio
6. Monitore os logs

✨ **Sistema pronto para produção!**
