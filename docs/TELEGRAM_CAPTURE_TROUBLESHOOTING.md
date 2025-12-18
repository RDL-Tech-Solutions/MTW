# Troubleshooting: Captura de Canais Telegram

## Problema Identificado
A captura de mensagens dos canais do Telegram não estava funcionando corretamente.

## Correções Aplicadas

### 1. Melhorias na Extração de Texto
- **Problema**: Mensagens com texto em diferentes formatos não eram capturadas
- **Solução**: Adicionados 7 métodos diferentes de extração de texto:
  - `message.message` (string)
  - `message.text` (string ou objeto)
  - `message.rawText`
  - `message.message.text` (aninhado)
  - `getMessageText()` (método do gramjs)
  - `message.media.caption` (captions de fotos/vídeos)
  - `toString()` como fallback

### 2. Extrator de Cupons Mais Flexível
- **Problema**: Validações muito rígidas ignoravam cupons válidos
- **Solução**:
  - Expandida lista de palavras-chave de 9 para 24 termos
  - Reduzido tamanho mínimo de texto de 10 para 5 caracteres
  - Ampliado contexto de busca de 50 para 100 caracteres
  - Adicionada lógica de fallback para códigos de 5+ caracteres

### 3. Logs de Debug Aprimorados
- **Problema**: Difícil rastrear onde o processo falhava
- **Solução**:
  - Contadores de eventos e mensagens
  - Logs detalhados em cada etapa da extração
  - Identificação clara quando canal é encontrado vs. não monitorado

### 4. Novos Endpoints de Diagnóstico

#### POST `/api/telegram-collector/test-capture`
Testa extração de cupom de um texto manualmente.

**Request:**
```json
{
  "text": "Use o cupom DESCONTO20 para 20% OFF!",
  "channel_username": "meucanal"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cupom detectado com sucesso",
  "data": {
    "code": "DESCONTO20",
    "platform": "general",
    "discount_type": "percentage",
    "discount_value": 20,
    "title": "Cupom DESCONTO20 - general"
  }
}
```

#### GET `/api/telegram-collector/listener/channels`
Verifica quais canais estão sendo monitorados.

**Response:**
```json
{
  "success": true,
  "data": {
    "channels": [
      {
        "id": 1,
        "name": "Canal de Cupons",
        "username": "canaldecupons",
        "channel_id": "-1001234567890",
        "is_active": true
      }
    ],
    "count": 1,
    "is_running": true,
    "events_received": 42,
    "messages_received": 15
  }
}
```

## Como Verificar se a Captura Está Funcionando

### 1. Verificar Status do Listener
```bash
GET /api/telegram-collector/listener/status
```

Deve retornar:
- `status: "running"` - Listener ativo
- `is_connected: true` - Cliente conectado ao Telegram

### 2. Verificar Canais Monitorados
```bash
GET /api/telegram-collector/listener/channels
```

Verifique:
- Número de canais (`count` > 0)
- Cada canal tem `channel_id` preenchido
- `is_running: true`
- `events_received` e `messages_received` aumentando

### 3. Testar Extração Manual
```bash
POST /api/telegram-collector/test-capture
{
  "text": "🔥 CUPOM EXCLUSIVO! Use TESTE50 para 50% OFF",
  "channel_username": "teste"
}
```

Se retornar cupom detectado, o extrator está funcionando.

### 4. Verificar Logs do Servidor

Procure por:
- `📨 EVENTO #X RECEBIDO` - Eventos sendo recebidos
- `📨 MENSAGEM #X recebida` - Mensagens sendo processadas
- `✅ MATCH! Mensagem de canal monitorado` - Canal identificado corretamente
- `🎟️ Cupom detectado` - Cupom extraído com sucesso
- `✅ Cupom salvo` - Cupom salvo no banco de dados

## Problemas Comuns e Soluções

### Problema: Listener rodando mas não recebe mensagens
**Sintomas**: `events_received: 0` mesmo após várias mensagens enviadas

**Soluções**:
1. Verificar se o canal está ativo:
   ```bash
   GET /api/telegram-channels
   ```
2. Verificar se `channel_id` está preenchido
3. Reiniciar listener:
   ```bash
   POST /api/telegram-collector/listener/restart
   ```

### Problema: Mensagens recebidas mas cupons não são detectados
**Sintomas**: `messages_received` aumenta mas nenhum cupom é salvo

**Soluções**:
1. Testar extração manual com texto da mensagem
2. Verificar se texto contém palavras-chave:
   - cupom, desconto, promo, off, voucher, código, etc.
3. Verificar se há código alfanumérico de 4-15 caracteres

### Problema: Canal não está sendo monitorado
**Sintomas**: Mensagens mostram `📭 Mensagem de canal não monitorado`

**Soluções**:
1. Verificar se canal está ativo no banco
2. Verificar se `channel_id` foi resolvido corretamente
3. Comparar `channel_id` nos logs com ID do canal monitorado
4. Se IDs não correspondem, listener tentará atualizar automaticamente

### Problema: channel_id não foi resolvido
**Sintomas**: Canal aparece sem `channel_id` em `/listener/channels`

**Soluções**:
1. Verificar se username está correto (com ou sem @)
2. Verificar se canal é público
3. Verificar se cliente tem acesso ao canal
4. Reiniciar listener para forçar nova resolução

## Palavras-chave Detectadas

O sistema agora detecta as seguintes palavras-chave:
- cupom, cupão, coupon
- desconto, promo, promoção
- off, cashback, voucher, código
- oferta, mega, super
- frete, grátis, economia
- ganhe, presente, brinde, bônus
- aproveite, imperdível
- queima, black, cyber, sale
- liquidação

## Formato de IDs de Canais

Canais públicos do Telegram têm IDs no formato:
- `-100XXXXXXXXX` (número negativo com prefixo -100)
- Exemplo: `-1001234567890`

O sistema normaliza automaticamente diferentes formatos de ID para garantir correspondência correta.

## Próximos Passos se Problema Persistir

1. Verificar logs completos do servidor backend
2. Testar com canal de teste conhecido
3. Verificar se conta Telegram está autenticada corretamente
4. Verificar se há mensagens de erro no console
5. Tentar limpar sessões e reautenticar:
   ```bash
   DELETE /api/telegram-collector/sessions
   ```
