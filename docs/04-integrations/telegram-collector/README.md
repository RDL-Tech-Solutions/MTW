# 📡 Telegram Collector

Guia completo para configurar o coletor de cupons do Telegram.

## 📋 Visão Geral

O Telegram Collector monitora canais públicos do Telegram e captura cupons automaticamente usando **MTProto (Node.js)**.

## ✅ Status: 100% Funcional

## 🚀 Configuração

### 1. Obter Credenciais

1. Acesse [my.telegram.org/apps](https://my.telegram.org/apps)
2. Faça login
3. Crie uma aplicação
4. Copie **API ID** e **API Hash**

### 2. Configurar no Admin Panel

1. Acesse `/telegram-channels`
2. Aba **Configuração**
3. Configure:
   - API ID
   - API Hash
   - Telefone (formato internacional: +5511999999999)
4. Salve

### 3. Autenticar

1. Aba **Autenticação**
2. Clique em **Enviar Código de Verificação**
3. Digite o código recebido no Telegram
4. Se tiver 2FA, digite a senha
5. Aguarde confirmação

### 4. Adicionar Canais

1. Aba **Canais**
2. Clique em **Adicionar Canal**
3. Preencha:
   - Nome do canal
   - Username (@canal)
   - ID do canal (se souber)
4. Ative o canal

### 5. Iniciar Listener

1. Aba **Listener**
2. Clique em **Iniciar Listener**
3. Aguarde confirmação
4. O sistema começará a monitorar os canais

## 🔍 Como Funciona

1. Listener monitora canais ativos
2. Detecta mensagens com palavras-chave de cupom
3. Extrai informações (código, desconto, plataforma)
4. Salva cupom no banco (pendente de aprovação)
5. Admin aprova ou rejeita

## 📝 Palavras-chave

O sistema detecta automaticamente:
- cupom, cupão, coupon
- desconto, promo, promoção
- off, cashback, voucher

## ⚙️ Configurações Avançadas

No admin panel em `/settings`:
- Rate Limit Delay
- Max Retries
- Reconnect Delay

## 📚 Mais Informações

- [Migração Node.js](../../backend/TELEGRAM_NODEJS_MIGRATION.md)
- [Remoção Python](../../backend/REMOCAO_PYTHON.md)

---

**Próximo**: [API Reference](../../05-api-reference/README.md)



