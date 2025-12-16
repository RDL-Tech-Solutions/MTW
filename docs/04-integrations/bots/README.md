# 🤖 Bots (WhatsApp & Telegram)

Guia completo para configurar e usar os bots de notificações.

## 📋 Visão Geral

O sistema de bots permite enviar notificações automáticas de produtos e cupons via WhatsApp e Telegram.

## ✨ Funcionalidades

- ✅ Envio automático de notificações
- ✅ Templates de mensagem personalizáveis
- ✅ Múltiplos canais (grupos)
- ✅ Logs e estatísticas
- ✅ Teste de envio

## 🚀 Configuração Rápida

### 1. Telegram Bot

1. Crie um bot com [@BotFather](https://t.me/BotFather)
2. Copie o token
3. Configure no admin panel em `/bots`
4. Adicione canais (grupos)
5. Teste o envio

### 2. WhatsApp Bot

1. Crie um app no [Facebook Developers](https://developers.facebook.com)
2. Adicione WhatsApp Business API
3. Obtenha o token e phone number ID
4. Configure no admin panel em `/bots`
5. Adicione canais
6. Teste o envio

## 📝 Templates de Mensagem

Crie templates personalizados no admin panel em `/bots/templates`.

### Variáveis Disponíveis

- `{product_name}` - Nome do produto
- `{current_price}` - Preço atual
- `{old_price}` - Preço antigo
- `{discount_percentage}` - Percentual de desconto
- `{affiliate_link}` - Link de afiliado
- `{coupon_code}` - Código do cupom
- `{discount_value}` - Valor do desconto

## 📚 Documentação Completa

- [Guia Passo a Passo](./step-by-step.md)
- [Configuração WhatsApp](./whatsapp-setup.md)
- [Configuração Telegram](./telegram-setup.md)
- [Templates](./templates.md)

---

**Próximo**: [Mercado Livre](../mercadolivre/README.md)
