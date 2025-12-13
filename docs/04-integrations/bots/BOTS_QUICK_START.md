# 🚀 Guia Rápido - Configuração dos Bots

## ⚡ Setup em 5 Minutos

### 1️⃣ Executar Migration do Banco

Acesse o **Supabase SQL Editor** e execute:

```sql
-- Copie e cole o conteúdo de:
database/migrations/001_add_bot_tables.sql
```

### 2️⃣ Configurar Bot do Telegram

1. Abra o Telegram e procure `@BotFather`
2. Envie: `/newbot`
3. Escolha um nome: `MTW Promo Bot`
4. Escolha um username: `mtwpromo_bot` (deve terminar com `_bot`)
5. Copie o **token** fornecido

**Obter Chat ID do Grupo:**
1. Crie um grupo no Telegram
2. Adicione seu bot ao grupo
3. Adicione também o bot `@getidsbot`
4. O bot enviará o Chat ID (exemplo: `-1001234567890`)

### 3️⃣ Configurar Variáveis de Ambiente

Edite o arquivo `backend/.env`:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# WhatsApp (opcional - pode configurar depois)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN=seu_token
WHATSAPP_PHONE_NUMBER_ID=seu_id

# Habilitar Cron Jobs
ENABLE_CRON_JOBS=true
```

### 4️⃣ Reiniciar Backend

```bash
cd backend
npm run dev
```

### 5️⃣ Cadastrar Canal via API

```bash
# Fazer login como admin e obter token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mtwpromo.com",
    "password": "sua_senha"
  }'

# Cadastrar canal do Telegram
curl -X POST http://localhost:3000/api/bots/channels \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "identifier": "-1001234567890",
    "name": "Grupo Principal",
    "is_active": true
  }'
```

### 6️⃣ Testar Envio

```bash
# Enviar mensagem de teste
curl -X POST http://localhost:3000/api/bots/test \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"
```

✅ **Pronto!** Você deve receber uma mensagem de teste no grupo do Telegram.

---

## 🧪 Testar Notificações Automáticas

### Criar um Cupom de Teste

```bash
curl -X POST http://localhost:3000/api/coupons \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TESTE10",
    "platform": "shopee",
    "discount_type": "percentage",
    "discount_value": 10,
    "valid_from": "2024-01-01T00:00:00Z",
    "valid_until": "2024-12-31T23:59:59Z",
    "is_general": true
  }'
```

✅ **Resultado:** Notificação automática enviada para todos os canais ativos!

### Criar uma Promoção de Teste

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smartphone XYZ",
    "image_url": "https://exemplo.com/imagem.jpg",
    "platform": "shopee",
    "current_price": 899.90,
    "old_price": 1299.90,
    "category_id": "uuid-da-categoria",
    "affiliate_link": "https://exemplo.com/produto",
    "external_id": "PROD123"
  }'
```

✅ **Resultado:** Notificação de nova promoção enviada automaticamente!

---

## 📊 Verificar Logs

```bash
# Ver logs de notificações
curl -X GET "http://localhost:3000/api/bots/logs?limit=10" \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"

# Ver estatísticas
curl -X GET http://localhost:3000/api/bots/stats \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"

# Verificar status dos bots
curl -X GET http://localhost:3000/api/bots/status \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"
```

---

## 🔧 Configuração Avançada do WhatsApp

### Opção 1: Meta WhatsApp Cloud API (Gratuito até 1000 mensagens/mês)

1. Acesse: https://developers.facebook.com/
2. Crie um App → Adicione WhatsApp
3. Vá em **WhatsApp** → **API Setup**
4. Copie:
   - **Phone Number ID**
   - **Access Token** (gere um token permanente)
5. Configure no `.env`

### Opção 2: Z-API (Mais Simples)

1. Acesse: https://z-api.io/
2. Crie uma conta e conecte seu WhatsApp
3. Obtenha a **Instance ID** e **Token**
4. Configure:

```env
WHATSAPP_API_URL=https://api.z-api.io
WHATSAPP_API_TOKEN=seu_token_zapi
WHATSAPP_PHONE_NUMBER_ID=sua_instance_id
```

---

## 🎯 Próximos Passos

1. ✅ Configure o painel admin para gerenciar canais visualmente
2. ✅ Adicione mais grupos/canais conforme necessário
3. ✅ Monitore os logs regularmente
4. ✅ Configure alertas para falhas de envio
5. ✅ Ajuste as mensagens conforme feedback dos usuários

---

## 🆘 Problemas Comuns

### "Bot não está enviando mensagens"

**Solução:**
```bash
# 1. Verificar se o bot está configurado
curl -X GET http://localhost:3000/api/bots/status \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"

# 2. Verificar logs do backend
tail -f backend/logs/app.log | grep -i "bot"

# 3. Testar manualmente
curl -X POST http://localhost:3000/api/bots/test \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"
```

### "Chat ID inválido no Telegram"

- Chat ID de grupos sempre começa com `-` (negativo)
- Use `@getidsbot` para obter o ID correto
- Certifique-se que o bot foi adicionado ao grupo

### "Cron jobs não estão rodando"

```env
# Verifique no .env:
ENABLE_CRON_JOBS=true

# Reinicie o backend
npm run dev
```

---

## 📞 Suporte

- 📖 Documentação completa: `BOTS_DOCUMENTATION.md`
- 🐛 Issues: Abra uma issue no repositório
- 💬 Telegram: @BotFather para dúvidas sobre bots

---

**🎉 Sistema de Bots Configurado com Sucesso!**

Agora todas as promoções e cupons serão notificados automaticamente! 🚀
