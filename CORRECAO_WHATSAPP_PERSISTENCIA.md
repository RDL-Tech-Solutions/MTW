# 🔧 Correção: Persistência de Sessão do WhatsApp Web

## 🐛 Problema Identificado

A conexão do WhatsApp Web não estava persistindo após reiniciar o backend. O sistema pedia para conectar novamente a cada reinicialização.

---

## 🔍 Causa Raiz

1. **Caminho Relativo**: O `sessionPath` estava usando caminho relativo (`./.wwebjs_auth`), o que pode causar problemas dependendo de onde o processo Node.js é iniciado.

2. **Falta de Verificação**: Não havia verificação se o diretório de sessão existia ou tinha permissões de escrita.

3. **Falta de clientId**: O `LocalAuth` não tinha um `clientId` único, o que pode causar conflitos em múltiplas instâncias.

---

## ✅ Correções Aplicadas

### 1. Caminho Absoluto no config.js

**Antes:**
```javascript
sessionPath: process.env.WHATSAPP_SESSION_PATH || './.wwebjs_auth',
```

**Depois:**
```javascript
// Obter o diretório raiz do projeto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

sessionPath: process.env.WHATSAPP_SESSION_PATH 
    ? path.resolve(projectRoot, process.env.WHATSAPP_SESSION_PATH)
    : path.resolve(projectRoot, '.wwebjs_auth'),
```

### 2. Criação e Verificação do Diretório no client.js

**Adicionado:**
```javascript
// Criar diretório de sessão se não existir
if (!fs.existsSync(absoluteSessionPath)) {
    logger.info(`📁 Creating session directory: ${absoluteSessionPath}`);
    fs.mkdirSync(absoluteSessionPath, { recursive: true });
}

// Verificar permissões de escrita
try {
    fs.accessSync(absoluteSessionPath, fs.constants.W_OK);
    logger.info(`✅ Session directory is writable: ${absoluteSessionPath}`);
} catch (permErr) {
    logger.error(`❌ Session directory is not writable: ${absoluteSessionPath}`);
    throw new Error(`Session directory is not writable: ${absoluteSessionPath}`);
}
```

### 3. ClientId Único no LocalAuth

**Antes:**
```javascript
authStrategy: new LocalAuth({
    dataPath: absoluteSessionPath
}),
```

**Depois:**
```javascript
authStrategy: new LocalAuth({
    dataPath: absoluteSessionPath,
    clientId: 'whatsapp-bot' // ID único para esta instância
}),
```

### 4. Variável de Ambiente Documentada

Adicionado no `.env.example`:
```env
# WhatsApp Web Bot Configuration
WHATSAPP_WEB_ENABLED=false
WHATSAPP_PAIRING_NUMBER=
WHATSAPP_ADMIN_NUMBERS=
# Caminho para armazenar a sessão do WhatsApp (usar caminho absoluto ou relativo à raiz do projeto)
# Padrão: .wwebjs_auth (será criado na raiz do projeto backend)
WHATSAPP_SESSION_PATH=.wwebjs_auth
```

---

## 📁 Estrutura de Arquivos

Após a correção, a estrutura será:

```
backend/
├── .wwebjs_auth/              # Diretório de sessão (criado automaticamente)
│   ├── session-whatsapp-bot/  # Sessão do cliente
│   │   ├── Default/
│   │   └── ...
│   └── lockfile               # Arquivo de lock (removido automaticamente)
├── src/
│   └── services/
│       └── whatsappWeb/
│           ├── client.js      # ✅ Corrigido
│           └── config.js      # ✅ Corrigido
└── .env
```

---

## 🎯 Como Funciona Agora

### 1. Primeira Conexão
1. Backend inicia
2. Diretório `.wwebjs_auth` é criado automaticamente
3. Usuário escaneia QR Code ou usa código de pareamento
4. Sessão é salva em `.wwebjs_auth/session-whatsapp-bot/`

### 2. Reinicialização
1. Backend reinicia
2. Sistema verifica se `.wwebjs_auth/session-whatsapp-bot/` existe
3. Se existir, carrega a sessão automaticamente
4. WhatsApp conecta sem precisar escanear QR Code novamente

### 3. Logs de Verificação

Você verá estes logs no console:

```
📁 Creating session directory: /path/to/backend/.wwebjs_auth
✅ Session directory is writable: /path/to/backend/.wwebjs_auth
🚀 Initializing WhatsApp Web Client with session at: /path/to/backend/.wwebjs_auth
⏳ Waiting for Client to initialize...
✅ WhatsApp Client AUTHENTICATED
✅ WhatsApp Client is READY!
```

---

## 🔒 Segurança

### Adicionar ao .gitignore

Certifique-se de que o diretório de sessão está no `.gitignore`:

```gitignore
# WhatsApp Web Session
.wwebjs_auth/
.wwebjs_cache/
```

### Backup da Sessão

Para fazer backup da sessão (útil em deploy):

```bash
# Backup
tar -czf whatsapp-session-backup.tar.gz .wwebjs_auth/

# Restaurar
tar -xzf whatsapp-session-backup.tar.gz
```

---

## 🧪 Como Testar

### Teste 1: Primeira Conexão
```bash
# 1. Iniciar backend
npm start

# 2. Conectar WhatsApp via painel admin
# 3. Verificar se diretório .wwebjs_auth foi criado
ls -la .wwebjs_auth/

# 4. Verificar logs
# Deve mostrar: "✅ WhatsApp Client is READY!"
```

### Teste 2: Persistência
```bash
# 1. Parar backend
Ctrl+C

# 2. Verificar se sessão existe
ls -la .wwebjs_auth/session-whatsapp-bot/

# 3. Reiniciar backend
npm start

# 4. Verificar logs
# Deve mostrar: "✅ WhatsApp Client AUTHENTICATED" (sem pedir QR Code)
```

### Teste 3: Permissões
```bash
# Verificar permissões do diretório
ls -ld .wwebjs_auth/

# Deve mostrar: drwxr-xr-x (ou similar com permissão de escrita)
```

---

## 🚨 Troubleshooting

### Problema: Sessão não persiste

**Solução 1: Verificar permissões**
```bash
chmod -R 755 .wwebjs_auth/
```

**Solução 2: Limpar sessão corrompida**
```bash
rm -rf .wwebjs_auth/
# Reiniciar backend e conectar novamente
```

**Solução 3: Verificar caminho no .env**
```env
# Usar caminho absoluto se necessário
WHATSAPP_SESSION_PATH=/home/user/backend/.wwebjs_auth
```

### Problema: Erro "lockfile"

**Solução:**
```bash
# Remover lockfile manualmente
rm .wwebjs_auth/lockfile
# Reiniciar backend
```

### Problema: Múltiplas instâncias

Se você tem múltiplas instâncias do backend rodando:

```env
# Usar clientId diferente para cada instância
# No código, mudar:
clientId: 'whatsapp-bot-1'  # Instância 1
clientId: 'whatsapp-bot-2'  # Instância 2
```

---

## 📊 Arquivos Modificados

1. ✅ `backend/src/services/whatsappWeb/config.js` - Caminho absoluto
2. ✅ `backend/src/services/whatsappWeb/client.js` - Verificações e clientId
3. ✅ `backend/.env.example` - Documentação da variável

---

## 🎉 Resultado

Agora a sessão do WhatsApp Web persiste corretamente entre reinicializações do backend. Você só precisa conectar uma vez!

**Antes:** 🔴 Pedia para conectar a cada reinicialização
**Depois:** ✅ Conecta automaticamente usando a sessão salva

---

**Data da Correção:** Fevereiro 2026
**Versão:** 1.0
