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

### Modos de Template

O sistema suporta 3 modos de template:

1. **Padrão**: Template fixo do sistema
2. **Customizado**: Template editável pelo admin
3. **IA ADVANCED**: Template gerado dinamicamente pela IA ✨

### IA ADVANCED

O modo **IA ADVANCED** gera templates automaticamente baseados no produto:

- **Títulos Otimizados**: Títulos curtos, chamativos e otimizados
- **Descrições Persuasivas**: Descrições elaboradas e convincentes
- **Formatação Inteligente**: Correção automática de preços, emojis e formatação
- **Contexto Adaptativo**: Adapta a mensagem ao tipo de produto e desconto

**Configuração**:
1. Acesse `/settings` no admin panel
2. Configure OpenRouter API Key
3. Selecione o modelo de IA
4. Configure o modo de template como "IA ADVANCED"

### Variáveis Disponíveis

- `{product_name}` - Nome do produto (otimizado pela IA se modo ADVANCED)
- `{current_price}` - Preço atual formatado
- `{old_price}` - Preço antigo formatado (com strikethrough)
- `{discount_percentage}` - Percentual de desconto
- `{affiliate_link}` - Link de afiliado
- `{coupon_code}` - Código do cupom
- `{coupon_discount}` - Valor do desconto do cupom
- `{platform_name}` - Nome da plataforma
- `{final_price}` - Preço final com cupom (se aplicável)

## 🧠 Segmentação Inteligente

Os bots podem ser configurados com segmentação inteligente:

### Filtros Disponíveis

- **Por Categoria**: Publica apenas produtos de categorias específicas
- **Por Plataforma**: Publica apenas de plataformas específicas (Shopee, ML, etc)
- **Por Score Mínimo**: Publica apenas produtos com score de qualidade acima do mínimo
- **Horários de Engajamento**: Respeita horários configurados (ex: 9h-18h)
- **Anti-Duplicação**: Evita publicar a mesma oferta em período curto (configurável em horas)

### Configuração

1. Acesse `/bots` no admin panel
2. Edite um canal
3. Configure os filtros desejados
4. Salve as alterações

## 📚 Documentação Completa

- [Sistema de IA](../../03-modules/ai-system/README.md)
- [Guia Passo a Passo](./step-by-step.md)
- [Configuração WhatsApp](./whatsapp-setup.md)
- [Configuração Telegram](./telegram-setup.md)
- [Templates](./templates.md)

---

**Próximo**: [Mercado Livre](../mercadolivre/README.md)
