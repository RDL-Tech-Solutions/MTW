# 🚀 Telegram Collector - Versão Node.js

## 📋 Resumo

O sistema de captura de cupons do Telegram foi desenvolvido completamente em Node.js usando **gramjs** (telegram), **sem dependência do Python**.

## ✅ Status

✅ **Migração Completa**: Todo o código Python foi removido e substituído por Node.js
✅ **Sem Dependências Python**: Não é mais necessário instalar ou configurar Python
✅ **100% JavaScript**: Tudo funciona nativamente no Node.js

## ✅ O que foi feito

### 1. **Dependências Adicionadas**

- `gramjs`: Biblioteca JavaScript para MTProto do Telegram
- `big-integer`: Dependência do gramjs

### 2. **Novos Serviços Node.js Criados**

#### `telegramClient.js`
- Cliente Telegram usando gramjs
- Gerencia conexão, autenticação e sessões
- Substitui o Python `auth_api.py`

#### `couponExtractor.js`
- Extrai informações de cupons de mensagens
- Usa regex para detectar códigos, descontos, plataformas
- Substitui o Python `coupon_extractor.py`

#### `listenerService.js`
- Monitora canais do Telegram em tempo real
- Processa mensagens e extrai cupons
- Salva cupons no banco de dados
- Substitui o Python `telegram_listener.py`

### 3. **Serviços Atualizados**

#### `authService.js`
- Usa `telegramClient.js` para autenticação
- Mantém a mesma interface para os controllers

#### `collectorService.js`
- Usa `listenerService.js` para gerenciar o listener
- Mantém a mesma interface para os controllers

## 🔧 Como Funciona

### Autenticação

1. **Enviar Código**: Usa `Api.auth.SendCode` do gramjs
2. **Verificar Código**: Usa `Api.auth.SignIn` ou `Api.auth.CheckPassword` (2FA)
3. **Sessão**: Salva em `telegram_sessions/` como string

### Listener

1. **Conectar**: Usa `TelegramClient` do gramjs
2. **Eventos**: Usa `NewMessage` event handler
3. **Processamento**: Extrai cupons e salva no banco
4. **Reconexão**: Automática em caso de desconexão

## 📁 Estrutura de Arquivos

```
backend/src/services/telegramCollector/
├── telegramClient.js      # Cliente Telegram (gramjs)
├── couponExtractor.js     # Extrator de cupons
├── listenerService.js     # Listener de canais
├── authService.js         # Serviço de autenticação (atualizado)
└── collectorService.js    # Gerenciador do listener (atualizado)
```

## 🎯 Vantagens

1. **Sem Python**: Não precisa mais instalar/configurar Python
2. **Mais Rápido**: Comunicação direta, sem processos externos
3. **Mais Simples**: Tudo em JavaScript/Node.js
4. **Melhor Debugging**: Logs e erros integrados
5. **Menos Dependências**: Apenas npm packages

## 📝 Notas Importantes

- As sessões são salvas em `backend/telegram_sessions/`
- **Python não é mais necessário**: Todo o código foi migrado para Node.js
- A interface da API permanece a mesma (controllers não precisaram mudar)
- O campo `python_path` foi removido do banco de dados e do painel admin

## 🧪 Como Testar

1. **Instalar dependências**:
   ```bash
   cd backend
   npm install
   ```

2. **Configurar no painel admin**:
   - Acesse `/telegram-channels`
   - Configure API ID, API Hash e Telefone
   - Clique em "Enviar Código de Verificação"
   - Digite o código recebido
   - Se tiver 2FA, digite a senha

3. **Adicionar canais**:
   - Na aba "Canais", adicione canais públicos do Telegram
   - Ative os canais que deseja monitorar

4. **Iniciar listener**:
   - Na aba "Listener", clique em "Iniciar Listener"
   - O sistema começará a monitorar os canais ativos

## ⚠️ Migração de Sessões

Se você já tinha sessões do Python/Telethon, elas não são compatíveis. Você precisará:
1. Autenticar novamente usando o painel admin
2. A nova sessão será salva em formato gramjs (StringSession)

## 🔍 Troubleshooting

### Erro de autenticação
- Verifique se API ID e API Hash estão corretos
- Certifique-se de que o telefone está no formato internacional (+55...)

### Listener não inicia
- Verifique se está autenticado
- Verifique se há canais ativos configurados
- Veja os logs do backend para mais detalhes

### Cupons não são capturados
- Verifique se os canais estão ativos
- Verifique se as mensagens contêm palavras-chave de cupom
- Veja os logs para ver se há erros no processamento

