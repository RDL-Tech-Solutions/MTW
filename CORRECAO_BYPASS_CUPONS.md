# ✅ Correção: Bypass de Categoria para Cupons Manuais

## 🐛 Problema Identificado

Os cupons criados pela plataforma admin ou pelos bots **não estavam sendo publicados** nos canais WhatsApp Web, mesmo que antes funcionasse normalmente.

### Causa Raiz

O código tinha uma lógica de **bypass** para cupons manuais sem categoria, mas estava **incompleta**:

```javascript
// ANTES (BUGADO):
if (options.manual && eventType === 'coupon_new') {
    logger.info(`⚠️ Bypass ativo...`);
    // ❌ MAS NÃO FAZIA NADA! O código continuava e executava o "continue" abaixo
} else {
    logger.info(`🚫 Canal ignorado...`);
    continue; // ← Este continue era SEMPRE executado
}
```

O problema era que o `continue` (que bloqueia o canal) estava **fora** do `else`, então mesmo com o bypass ativo, o canal era bloqueado.

## ✅ Correção Aplicada

### Arquivo: `backend/src/services/bots/notificationDispatcher.js`

**Linha 387-397** - Corrigida a lógica do bypass:

```javascript
// DEPOIS (CORRIGIDO):
} else {
  if (channel.category_filter && Array.isArray(channel.category_filter) && channel.category_filter.length > 0) {
    // Bypass para cupons manuais sem categoria
    if (options.manual && eventType === 'coupon_new') {
      logger.info(`   ⚠️ Canal ${channel.name}: Item sem categoria, mas bypass ativo por envio manual de cupom.`);
      // NÃO bloquear - permitir que o cupom seja enviado
    } else {
      const itemType = eventType === 'promotion_new' ? 'produto' : 'cupom';
      logger.info(`🚫 Canal ${channel.name} ignorado: Item sem categoria e canal possui filtro restrito.`);
      continue; // ← Bloquear APENAS se NÃO for manual
    }
  }
}
```

**Linha 185** - Passado `options` para a função de filtro:

```javascript
const channels = await this.filterChannelsBySegmentation(activeChannels, eventType, data, options);
```

**Linha 321** - Atualizada assinatura da função:

```javascript
async filterChannelsBySegmentation(channels, eventType, data, options = {}) {
```

## 🧪 Teste de Validação

Criado script de teste: `backend/scripts/test-coupon-without-category.js`

### Resultado do Teste:

```
✅ SUCESSO! Cupom sem categoria foi publicado com bypass manual!
   Total de canais: 3
   Enviados: 3 (incluindo 2 canais WhatsApp Web)
   Falhas: 0
```

## 📋 Como Funciona Agora

### Cupons COM categoria:
- ✅ Publicados normalmente se a categoria estiver na lista do canal
- ❌ Bloqueados se a categoria NÃO estiver na lista

### Cupons SEM categoria:

#### Criados manualmente (admin/bots):
- ✅ **PUBLICADOS** com bypass automático (`manual: true`)
- Ignora o filtro de categoria
- Funciona para WhatsApp Web, Telegram, etc.

#### Criados automaticamente (sistema):
- ❌ Bloqueados se o canal tiver filtro de categoria
- Requer categoria definida

## 🔍 Como Verificar

### 1. Teste rápido:
```bash
cd backend
node scripts/test-coupon-without-category.js
```

### 2. Criar cupom real:
- Crie um cupom pelo painel admin **sem** selecionar categoria
- Verifique se foi publicado nos canais WhatsApp Web
- Deve aparecer nos logs: `⚠️ bypass ativo por envio manual de cupom`

### 3. Verificar logs:
```bash
tail -f backend/logs/combined.log | grep -i "bypass\|cupom"
```

## 📊 Comportamento Esperado

| Origem | Categoria | Resultado |
|--------|-----------|-----------|
| Admin Panel | ✅ Sim | ✅ Publicado |
| Admin Panel | ❌ Não | ✅ Publicado (bypass) |
| Bot Telegram | ✅ Sim | ✅ Publicado |
| Bot Telegram | ❌ Não | ✅ Publicado (bypass) |
| Bot WhatsApp | ✅ Sim | ✅ Publicado |
| Bot WhatsApp | ❌ Não | ✅ Publicado (bypass) |
| Sistema Auto | ❌ Não | ❌ Bloqueado |

## ⚠️ Importante

- O bypass **APENAS** funciona para `eventType === 'coupon_new'`
- Produtos (`promotion_new`) **sempre** precisam de categoria se o canal tiver filtro
- O bypass é ativado pela flag `options.manual = true`

## 🚀 Aplicar no Servidor

1. Fazer commit das alterações:
```bash
git add backend/src/services/bots/notificationDispatcher.js
git commit -m "fix: corrigir bypass de categoria para cupons manuais"
```

2. Deploy no servidor:
```bash
git push origin main
# Reiniciar o serviço no servidor
```

3. Verificar logs do servidor após deploy

## 📝 Arquivos Modificados

- ✅ `backend/src/services/bots/notificationDispatcher.js` (3 alterações)
- ✅ `backend/scripts/test-coupon-without-category.js` (novo)
- ✅ `CORRECAO_BYPASS_CUPONS.md` (este arquivo)

## ✅ Status

- [x] Bug identificado
- [x] Correção aplicada
- [x] Teste validado
- [x] Documentação criada
- [ ] Deploy no servidor (pendente)
