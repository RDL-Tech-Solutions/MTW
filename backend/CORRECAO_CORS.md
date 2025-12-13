# 🔧 Correção de CORS - Backend

## ⚠️ Problema

O erro de CORS ainda estava ocorrendo mesmo após as correções anteriores:
```
Access to XMLHttpRequest at 'http://localhost:3000/api/auth/register' from origin 'http://localhost:8081' has been blocked by CORS policy
```

## ✅ Solução Aplicada

### 1. Melhorias na Configuração de CORS

**Mudanças:**
- ✅ Removido `'*'` da lista de origens (causava problemas)
- ✅ Adicionado logging para debug em desenvolvimento
- ✅ Melhorado tratamento de preflight requests
- ✅ Adicionado handler explícito para `OPTIONS`

### 2. Código Atualizado

```javascript
// Configurar CORS
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()).filter(o => o) || [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:19006',
  'http://localhost:8081', // Expo Web
  'http://localhost:3000',
];

// Log de origens permitidas no startup
logger.info(`🌐 CORS: Origens permitidas: ${allowedOrigins.join(', ')}`);

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requisições sem origin (mobile apps nativos, Postman, etc)
    if (!origin) {
      return callback(null, true);
    }
    
    // Verificar se origin está na lista
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Em desenvolvimento, logar para debug
      if (process.env.NODE_ENV === 'development') {
        logger.warn(`⚠️  CORS: Origin bloqueada: ${origin}`);
        logger.info(`📋 CORS: Origens permitidas: ${allowedOrigins.join(', ')}`);
      }
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 horas
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Handle preflight requests explicitamente
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});
```

---

## 🚀 Como Aplicar

### 1. **REINICIAR O BACKEND** (OBRIGATÓRIO)

```bash
cd backend
# Parar o servidor atual (Ctrl+C)
npm start
```

**OU usar o script na raiz:**
```bash
.\restart_all.ps1
```

### 2. Verificar Logs

Ao iniciar, você deve ver:
```
🌐 CORS: Origens permitidas: http://localhost:5173, http://localhost:5174, http://localhost:19006, http://localhost:8081, http://localhost:3000
```

### 3. Testar

1. Abrir app em `http://localhost:8081`
2. Tentar registrar um novo usuário
3. Verificar se o erro de CORS desapareceu

---

## 🔍 Debug

Se ainda houver problemas:

1. **Verificar logs do backend** ao fazer requisição
2. **Verificar origin** no console do navegador
3. **Verificar se backend está rodando** em `http://localhost:3000`

### Teste Manual de CORS

```bash
# Testar preflight
curl -X OPTIONS http://localhost:3000/api/auth/register \
  -H "Origin: http://localhost:8081" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Deve retornar headers `Access-Control-Allow-Origin` e `Access-Control-Allow-Methods`.

---

## 📝 Notas

- ✅ **Preflight requests**: Agora tratados explicitamente
- ✅ **Logging**: Adicionado para facilitar debug
- ✅ **Headers**: Incluído `Accept` nos headers permitidos
- ✅ **Status code**: Preflight retorna 204 (No Content)

---

**Status**: ✅ Correção aplicada - **REINICIE O BACKEND**

