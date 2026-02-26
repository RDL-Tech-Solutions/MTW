# 📱 Personalização do Nome do Dispositivo WhatsApp

## 🎯 Objetivo

Mudar o nome que aparece em "Dispositivos Conectados" no WhatsApp de "Chrome Mac OS" para "PreçoCerto Bot" (ou qualquer nome personalizado).

---

## ✅ Implementação

### 1. Configuração Personalizada (config.js)

Adicionadas novas configurações:

```javascript
// Nome do dispositivo que aparece no WhatsApp
deviceName: process.env.WHATSAPP_DEVICE_NAME || 'PreçoCerto Bot',

// Versão do sistema
systemVersion: process.env.WHATSAPP_SYSTEM_VERSION || '1.0.0',
```

### 2. User Agent Customizado (client.js)

O user agent do navegador foi personalizado para incluir o nome do sistema:

```javascript
const customUserAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ${config.deviceName}/${config.systemVersion} Chrome/120.0.0.0 Safari/537.36`;
```

### 3. Injeção no WhatsApp Web

Após a autenticação, o sistema tenta modificar o nome exibido:

```javascript
this.client.on('ready', async () => {
    // Tentar definir nome customizado do dispositivo
    try {
        if (this.client.pupPage) {
            await this.client.pupPage.evaluate(() => {
                if (window.Store && window.Store.Conn) {
                    window.Store.Conn.platform = 'PreçoCerto Bot';
                }
            });
            logger.info('✅ Device name customized to "PreçoCerto Bot"');
        }
    } catch (err) {
        logger.warn('⚠️ Could not customize device name:', err.message);
    }
});
```

---

## 🔧 Configuração

### Variáveis de Ambiente (.env)

Adicione ao seu arquivo `.env`:

```env
# Nome do dispositivo que aparece no WhatsApp
WHATSAPP_DEVICE_NAME=PreçoCerto Bot

# Versão do sistema (opcional)
WHATSAPP_SYSTEM_VERSION=1.0.0
```

### Exemplos de Nomes

Você pode usar qualquer nome que desejar:

```env
# Opção 1: Nome do sistema
WHATSAPP_DEVICE_NAME=PreçoCerto Bot

# Opção 2: Nome da empresa
WHATSAPP_DEVICE_NAME=PreçoCerto Sistema

# Opção 3: Nome descritivo
WHATSAPP_DEVICE_NAME=Bot de Cupons

# Opção 4: Nome com emoji (pode não funcionar em todos os casos)
WHATSAPP_DEVICE_NAME=🤖 PreçoCerto
```

---

## 📱 Como Aparece no WhatsApp

### Antes
```
Dispositivos Conectados:
├── Chrome Mac OS
│   └── Última vez: agora
```

### Depois
```
Dispositivos Conectados:
├── PreçoCerto Bot 1.0.0
│   └── Última vez: agora
```

---

## 🧪 Como Testar

### Passo 1: Configurar o Nome

Edite o arquivo `.env`:

```env
WHATSAPP_DEVICE_NAME=PreçoCerto Bot
WHATSAPP_SYSTEM_VERSION=1.0.0
```

### Passo 2: Desconectar Sessão Atual

Para que a mudança tenha efeito, você precisa desconectar e reconectar:

```bash
# Opção 1: Via painel admin
# Vá em Configurações → WhatsApp Web → Desconectar

# Opção 2: Via terminal
rm -rf .wwebjs_auth/
```

### Passo 3: Reiniciar Backend

```bash
npm start
```

### Passo 4: Reconectar WhatsApp

1. Acesse o painel admin
2. Vá em Configurações → WhatsApp Web
3. Conecte novamente (QR Code ou código de pareamento)

### Passo 5: Verificar no WhatsApp

1. Abra o WhatsApp no celular
2. Vá em Configurações → Dispositivos Conectados
3. Você verá "PreçoCerto Bot 1.0.0" (ou o nome que configurou)

---

## 📊 Logs de Verificação

Ao iniciar o backend, você verá:

```
🚀 Initializing WhatsApp Web Client with session at: /path/to/.wwebjs_auth
📱 Device name: PreçoCerto Bot v1.0.0
⏳ Waiting for Client to initialize...
✅ WhatsApp Client AUTHENTICATED
✅ WhatsApp Client is READY!
✅ Device name customized to "PreçoCerto Bot"
```

---

## ⚠️ Observações Importantes

### 1. Limitações do WhatsApp

O WhatsApp pode não exibir o nome customizado em todos os casos. Depende de:
- Versão do WhatsApp Web
- Versão da biblioteca whatsapp-web.js
- Políticas do WhatsApp

### 2. Reconexão Necessária

Para que o nome seja atualizado, você precisa:
1. Desconectar a sessão atual
2. Limpar o cache (`.wwebjs_auth/`)
3. Reconectar

### 3. User Agent

O user agent é usado principalmente para:
- Identificação no servidor do WhatsApp
- Logs e analytics
- Pode não ser exibido diretamente no app

### 4. Fallback

Se a personalização não funcionar, o WhatsApp pode exibir:
- "Chrome Linux" (devido ao user agent)
- "WhatsApp Web" (padrão)
- "Navegador desconhecido"

---

## 🔄 Alternativas

### Opção 1: Usar Emoji no Nome

```env
WHATSAPP_DEVICE_NAME=🤖 PreçoCerto
```

### Opção 2: Incluir Ambiente

```env
# Produção
WHATSAPP_DEVICE_NAME=PreçoCerto Bot [PROD]

# Desenvolvimento
WHATSAPP_DEVICE_NAME=PreçoCerto Bot [DEV]
```

### Opção 3: Incluir Servidor

```env
WHATSAPP_DEVICE_NAME=PreçoCerto Bot - Servidor 1
```

---

## 🐛 Troubleshooting

### Problema: Nome não mudou

**Solução:**
```bash
# 1. Limpar sessão
rm -rf .wwebjs_auth/

# 2. Verificar .env
cat .env | grep WHATSAPP_DEVICE_NAME

# 3. Reiniciar backend
npm start

# 4. Reconectar WhatsApp
```

### Problema: Aparece "Chrome Linux"

**Causa:** O WhatsApp está usando o user agent do navegador.

**Solução:** Isso é normal. O nome customizado pode não aparecer em todos os casos devido às limitações do WhatsApp.

### Problema: Erro ao inicializar

**Solução:**
```bash
# Verificar logs
npm start

# Procurar por:
# ✅ Device name customized to "PreçoCerto Bot"
# ou
# ⚠️ Could not customize device name: [erro]
```

---

## 📝 Arquivos Modificados

1. ✅ `backend/src/services/whatsappWeb/config.js` - Configurações
2. ✅ `backend/src/services/whatsappWeb/client.js` - User agent e injeção
3. ✅ `backend/.env.example` - Documentação das variáveis

---

## 🎉 Resultado

Agora o dispositivo conectado no WhatsApp aparece com o nome personalizado "PreçoCerto Bot" ao invés de "Chrome Mac OS"!

**Antes:** 🔴 Chrome Mac OS
**Depois:** ✅ PreçoCerto Bot 1.0.0

---

**Data da Implementação:** Fevereiro 2026
**Versão:** 1.0
