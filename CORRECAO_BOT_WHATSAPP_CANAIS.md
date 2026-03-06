# Correção: Bot WhatsApp Respondendo em Canais

## Problema Identificado
O bot do WhatsApp Web estava respondendo a comandos e mensagens enviadas nos canais salvos (newsletters), quando deveria responder APENAS para números de administradores em conversas privadas.

## Comportamento Incorreto
- Bot processava mensagens de canais/newsletters
- Bot enviava comandos e respostas para os canais
- Canais são usados apenas para PUBLICAR ofertas, não para interação

## Causa Raiz
O `messageHandler.js` verificava apenas se a mensagem vinha de um grupo (`chat.isGroup`), mas não verificava se era um canal/newsletter.

### Diferença entre Grupo e Canal no WhatsApp:
- **Grupo**: Conversa com múltiplos participantes (ID termina com `@g.us`)
- **Canal/Newsletter**: Broadcast unidirecional (ID termina com `@newsletter`)

## Solução Implementada

### Arquivo Modificado: `backend/src/services/whatsappWeb/handlers/messageHandler.js`

#### Antes (com problema):
```javascript
const chat = await msg.getChat();
if (chat.isGroup) {
    // logger.debug(`[MsgHandler] Grupo detectado (${chat.name}). Ignorando interação.`);
    return;
}

const body = msg.body.trim();
const chatId = msg.from;
```

#### Depois (corrigido):
```javascript
const chat = await msg.getChat();

// CORREÇÃO: Ignorar mensagens de grupos E canais (newsletters)
if (chat.isGroup) {
    logger.debug(`[MsgHandler] Grupo detectado (${chat.name}). Ignorando interação.`);
    return;
}

// Verificar se é um canal/newsletter (id termina com @newsletter)
const isChannel = msg.from.includes('@newsletter') || chat.id._serialized.includes('@newsletter');
if (isChannel) {
    logger.debug(`[MsgHandler] Canal/Newsletter detectado (${chat.name || msg.from}). Ignorando interação.`);
    return;
}

const body = msg.body.trim();
const chatId = msg.from;
```

## Mudanças Realizadas

### 1. Verificação de Canais
Adicionada verificação explícita para detectar canais/newsletters:
```javascript
const isChannel = msg.from.includes('@newsletter') || chat.id._serialized.includes('@newsletter');
```

### 2. Ignorar Mensagens de Canais
Se a mensagem vem de um canal, o bot retorna imediatamente sem processar:
```javascript
if (isChannel) {
    logger.debug(`[MsgHandler] Canal/Newsletter detectado (${chat.name || msg.from}). Ignorando interação.`);
    return;
}
```

### 3. Logs Melhorados
Adicionados logs de debug para identificar quando mensagens de grupos ou canais são ignoradas.

## Comportamento Após Correção

### Bot RESPONDE em:
✅ Conversas privadas com números admin (configurados no banco ou .env)
✅ Mensagens enviadas pelo próprio bot (fromMe = true)

### Bot IGNORA em:
❌ Grupos do WhatsApp
❌ Canais/Newsletters do WhatsApp
❌ Conversas privadas com números não-admin

## Fluxo de Validação

```
Mensagem recebida
    ↓
É de um número admin? → NÃO → IGNORAR
    ↓ SIM
É de um grupo? → SIM → IGNORAR
    ↓ NÃO
É de um canal? → SIM → IGNORAR
    ↓ NÃO
PROCESSAR MENSAGEM
```

## Identificação de Canais

### Métodos de Detecção:
1. **ID da mensagem**: `msg.from.includes('@newsletter')`
2. **ID do chat**: `chat.id._serialized.includes('@newsletter')`

### Exemplos de IDs:
- Conversa privada: `5511999999999@c.us`
- Grupo: `120363123456789012@g.us`
- Canal: `120363123456789012@newsletter`

## Configuração de Números Admin

### Onde configurar:
1. **Banco de dados**: Tabela `bot_config`, campo `whatsapp_web_admin_numbers`
2. **Variável de ambiente**: `WHATSAPP_ADMIN_NUMBERS` no `.env`

### Formato:
```env
WHATSAPP_ADMIN_NUMBERS=5511999999999,5511888888888,5511777777777
```

### Cache:
- Números admin são carregados do banco com cache de 60 segundos
- Combina números do banco + .env
- Atualização automática sem reiniciar o bot

## Teste de Validação

### Como testar:
1. Enviar mensagem em um canal salvo
2. Verificar logs: Deve aparecer `[MsgHandler] Canal/Newsletter detectado`
3. Bot NÃO deve responder no canal

### Verificar no console:
```bash
# Logs esperados ao receber mensagem de canal:
[MsgHandler] Auth Check: Sender=5511999999999, Allowed=["5511999999999"], IsAllowed=true, FromMe=false
[MsgHandler] Canal/Newsletter detectado (Nome do Canal). Ignorando interação.
```

### Teste com número admin:
1. Enviar mensagem privada de um número admin
2. Bot deve responder normalmente
3. Comandos devem funcionar

### Teste com número não-admin:
1. Enviar mensagem privada de um número não-admin
2. Bot deve ignorar (retornar antes de processar)
3. Log: `IsAllowed=false`

## Segurança

### Camadas de Proteção:
1. **Autenticação**: Apenas números admin podem interagir
2. **Tipo de chat**: Ignora grupos e canais
3. **Cache de admin**: Atualização periódica do banco

### Prevenção de Spam:
- Bot não responde em canais públicos
- Bot não responde em grupos
- Bot não responde para números desconhecidos

## Logs de Debug

### Ativar logs detalhados:
Os logs já estão ativos por padrão. Para ver mais detalhes:

```javascript
// Em messageHandler.js, descomentar:
logger.debug(`[MsgHandler] ${senderNum} (Fwd:${isForwarded}): "${body.substring(0, 30)}..."`);
```

### Informações nos logs:
- Número do remetente
- Status de autorização (IsAllowed)
- Tipo de chat (grupo/canal/privado)
- Primeiros 30 caracteres da mensagem

## Status
✅ **CORRIGIDO** - Bot agora ignora mensagens de canais e responde apenas para admins em conversas privadas

## Arquivos Modificados
- `backend/src/services/whatsappWeb/handlers/messageHandler.js`

## Próximos Passos (Opcional)
1. Adicionar comando para listar canais salvos
2. Implementar whitelist de canais específicos (se necessário)
3. Adicionar métricas de mensagens ignoradas
