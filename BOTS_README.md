# 🤖 Sistema de Bots WhatsApp e Telegram - MTW Promo

## ✅ Implementação Completa

Sistema de notificações automáticas via bots de WhatsApp e Telegram totalmente integrado ao backend existente.

---

## 📦 O Que Foi Implementado

### 🗄️ **Banco de Dados**
- ✅ Tabela `bot_channels` - Gerenciamento de canais
- ✅ Tabela `notification_logs` - Histórico de notificações
- ✅ Migration completa com RLS e políticas de segurança
- ✅ Índices otimizados para performance

### 🔧 **Backend (Node.js/Express)**

#### Models
- ✅ `BotChannel.js` - CRUD de canais
- ✅ `NotificationLog.js` - Logs e estatísticas

#### Services
- ✅ `whatsappService.js` - Integração WhatsApp Cloud API
- ✅ `telegramService.js` - Integração Telegram Bot API
- ✅ `notificationDispatcher.js` - Dispatcher central de notificações

#### Controllers & Routes
- ✅ `botController.js` - Lógica de negócio
- ✅ `botRoutes.js` - Endpoints REST
- ✅ Integração com controllers existentes (Product, Coupon)

#### Cron Jobs
- ✅ `monitorExpiredCoupons.js` - Monitora cupons expirados (1 min)
- ✅ Integração com sistema de cron existente

### 🎯 **Funcionalidades**

#### Notificações Automáticas
- ✅ **Nova Promoção** - Quando produto com desconto é criado
- ✅ **Novo Cupom** - Quando cupom é cadastrado
- ✅ **Cupom Expirado** - Verificação automática a cada 1 minuto

#### API Endpoints
```
GET    /api/bots/channels          - Listar canais
POST   /api/bots/channels          - Criar canal
PUT    /api/bots/channels/:id      - Atualizar canal
DELETE /api/bots/channels/:id      - Deletar canal
PATCH  /api/bots/channels/:id/toggle - Ativar/Desativar

POST   /api/bots/test              - Enviar teste
GET    /api/bots/logs              - Listar logs
GET    /api/bots/stats             - Estatísticas
GET    /api/bots/status            - Status dos bots
```

### 📱 **Painel Admin**
- ✅ Exemplo completo de página React (Material-UI)
- ✅ Gerenciamento visual de canais
- ✅ Envio de testes
- ✅ Visualização de logs
- ✅ Estatísticas em tempo real

### 📚 **Documentação**
- ✅ `BOTS_DOCUMENTATION.md` - Documentação completa
- ✅ `BOTS_QUICK_START.md` - Guia rápido de setup
- ✅ `BOTS_PAGE_EXAMPLE.jsx` - Exemplo de UI
- ✅ Este README

---

## 🚀 Como Usar

### 1. Executar Migration
```sql
-- No Supabase SQL Editor
database/migrations/001_add_bot_tables.sql
```

### 2. Configurar Variáveis de Ambiente
```env
# backend/.env
TELEGRAM_BOT_TOKEN=seu_token_aqui
WHATSAPP_API_TOKEN=seu_token_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_id_aqui
ENABLE_CRON_JOBS=true
```

### 3. Reiniciar Backend
```bash
cd backend
npm run dev
```

### 4. Cadastrar Canal
```bash
curl -X POST http://localhost:3000/api/bots/channels \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "identifier": "-1001234567890",
    "name": "Grupo Principal",
    "is_active": true
  }'
```

### 5. Testar
```bash
curl -X POST http://localhost:3000/api/bots/test \
  -H "Authorization: Bearer TOKEN_ADMIN"
```

---

## 📁 Estrutura de Arquivos Criados

```
MTW/
├── database/
│   └── migrations/
│       └── 001_add_bot_tables.sql          ✨ NOVO
│
├── backend/
│   └── src/
│       ├── models/
│       │   ├── BotChannel.js               ✨ NOVO
│       │   └── NotificationLog.js          ✨ NOVO
│       │
│       ├── services/
│       │   ├── bots/                       ✨ NOVO
│       │   │   ├── whatsappService.js
│       │   │   ├── telegramService.js
│       │   │   └── notificationDispatcher.js
│       │   │
│       │   └── cron/
│       │       ├── monitorExpiredCoupons.js ✨ NOVO
│       │       └── index.js                 🔄 MODIFICADO
│       │
│       ├── controllers/
│       │   ├── botController.js            ✨ NOVO
│       │   ├── couponController.js         🔄 MODIFICADO
│       │   └── productController.js        🔄 MODIFICADO
│       │
│       └── routes/
│           ├── botRoutes.js                ✨ NOVO
│           └── index.js                    🔄 MODIFICADO
│
├── admin-panel/
│   └── BOTS_PAGE_EXAMPLE.jsx               ✨ NOVO
│
├── BOTS_DOCUMENTATION.md                    ✨ NOVO
├── BOTS_QUICK_START.md                      ✨ NOVO
└── BOTS_README.md                           ✨ NOVO (este arquivo)
```

---

## 🎯 Fluxo de Notificações

### Nova Promoção
```
Admin cria produto com desconto
    ↓
ProductController.create()
    ↓
notificationDispatcher.notifyNewPromotion()
    ↓
Envia para todos os canais ativos
    ↓
Registra log de envio
```

### Novo Cupom
```
Admin cria cupom
    ↓
CouponController.create()
    ↓
notificationDispatcher.notifyNewCoupon()
    ↓
Envia para todos os canais ativos
    ↓
Registra log de envio
```

### Cupom Expirado
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

---

## 🔐 Segurança

- ✅ Autenticação obrigatória (JWT)
- ✅ Apenas admins podem gerenciar bots
- ✅ RLS habilitado no Supabase
- ✅ Tokens em variáveis de ambiente
- ✅ Validação de dados em todos endpoints
- ✅ Rate limiting aplicado

---

## 📊 Monitoramento

### Logs do Sistema
```bash
tail -f backend/logs/app.log | grep -i "bot\|notification"
```

### Via API
```bash
# Logs
curl http://localhost:3000/api/bots/logs \
  -H "Authorization: Bearer TOKEN"

# Estatísticas
curl http://localhost:3000/api/bots/stats \
  -H "Authorization: Bearer TOKEN"

# Status
curl http://localhost:3000/api/bots/status \
  -H "Authorization: Bearer TOKEN"
```

---

## 🧪 Testes

### Teste Manual de Notificação

#### Criar Cupom de Teste
```bash
curl -X POST http://localhost:3000/api/coupons \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TESTE10",
    "platform": "shopee",
    "discount_type": "percentage",
    "discount_value": 10,
    "valid_from": "2024-01-01T00:00:00Z",
    "valid_until": "2024-12-31T23:59:59Z"
  }'
```

✅ **Resultado Esperado:** Notificação enviada automaticamente para todos os canais!

---

## 🆘 Troubleshooting

### Bot não envia mensagens
1. Verifique `ENABLE_CRON_JOBS=true` no `.env`
2. Confirme que há canais ativos: `GET /api/bots/channels`
3. Teste manualmente: `POST /api/bots/test`
4. Verifique logs: `tail -f backend/logs/app.log`

### Telegram não funciona
1. Token correto? Teste: `curl https://api.telegram.org/bot{TOKEN}/getMe`
2. Bot adicionado ao grupo?
3. Chat ID correto? (deve começar com `-`)
4. Use `@getidsbot` para obter o ID correto

### WhatsApp não funciona
1. Token e Phone Number ID corretos?
2. Número verificado no Meta Business?
3. Teste a API manualmente primeiro
4. Considere usar Z-API como alternativa

---

## 📈 Próximos Passos

### Implementar no Painel Admin
1. Copie `admin-panel/BOTS_PAGE_EXAMPLE.jsx` para `admin-panel/src/pages/Bots.jsx`
2. Adicione rota no router
3. Adicione item no menu
4. Customize conforme necessário

### Melhorias Futuras
- [ ] Agendamento de mensagens
- [ ] Templates de mensagens customizáveis
- [ ] Suporte a múltiplos idiomas
- [ ] Webhook para receber mensagens
- [ ] Dashboard de analytics avançado
- [ ] Integração com mais plataformas (Discord, Slack)

---

## 📞 Suporte

- 📖 **Documentação Completa**: `BOTS_DOCUMENTATION.md`
- 🚀 **Guia Rápido**: `BOTS_QUICK_START.md`
- 💻 **Exemplo de UI**: `admin-panel/BOTS_PAGE_EXAMPLE.jsx`

---

## ✨ Conclusão

Sistema de bots **100% funcional** e **pronto para produção**!

### ✅ Checklist de Implementação
- [x] Banco de dados configurado
- [x] Serviços de bot implementados
- [x] Dispatcher de notificações
- [x] Endpoints REST
- [x] Integração com controllers existentes
- [x] Cron job de monitoramento
- [x] Logs e estatísticas
- [x] Documentação completa
- [x] Exemplo de UI para admin

### 🎉 Pronto para Usar!

Basta configurar os tokens, cadastrar os canais e começar a receber notificações automáticas de todas as promoções e cupons!

---

**Desenvolvido para MTW Promo** 🚀
