# Diagnóstico: Network Error ao Atualizar Preferências

## Erro Reportado
```
ERROR  Erro ao atualizar preferências: [AxiosError: Network Error]
```

---

## Causa Provável

O app mobile não consegue se conectar ao backend. Isso pode acontecer por:

1. **Backend não está rodando**
2. **URL da API incorreta**
3. **Firewall bloqueando conexão**
4. **Problema de CORS**
5. **Timeout de conexão**

---

## Verificações Necessárias

### 1. Verificar se o Backend Está Rodando

**No terminal do backend:**
```bash
cd backend
npm start
# ou
node src/server.js
```

**Deve aparecer:**
```
🚀 Servidor rodando na porta XXXX
✅ Conectado ao banco de dados
```

### 2. Verificar URL da API no App

**Arquivo:** `app/src/config/api.js`

**URL Atual:**
```javascript
const API_CONFIG = {
  web: 'https://king.apiprecocerto.space/api',
  mobile: 'https://king.apiprecocerto.space/api',
  production: 'https://king.apiprecocerto.space/api',
};
```

**Verificar:**
- ✅ A URL `https://king.apiprecocerto.space` está acessível?
- ✅ O backend está hospedado nessa URL?
- ✅ O certificado SSL está válido?

### 3. Testar Conexão Manualmente

**No navegador ou Postman:**
```
GET https://king.apiprecocerto.space/api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-26T..."
}
```

### 4. Verificar CORS

**Arquivo:** `backend/.env`

**CORS_ORIGIN atual:**
```
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:19006,http://192.168.7.9:8081,http://192.168.7.9,http://192.168.7.9:8081,http://localhost:8081,exp://192.168.7.9:8081,https://precocertooo.vercel.app
```

**Verificar:**
- ✅ A origem do app mobile está na lista?
- ✅ Se estiver usando Expo, adicionar: `exp://192.168.X.X:8081`

### 5. Verificar Timeout

**Arquivo:** `app/src/services/api.js`

**Timeout atual:**
```javascript
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Se a conexão for lenta, aumentar:**
```javascript
timeout: 30000, // 30 segundos
```

---

## Soluções Possíveis

### Solução 1: Backend Local (Desenvolvimento)

Se estiver desenvolvendo localmente, usar IP da máquina:

**1. Descobrir IP da máquina:**

**Windows:**
```bash
ipconfig
# Procurar por "IPv4 Address" na rede Wi-Fi ou Ethernet
```

**Mac/Linux:**
```bash
ifconfig
# ou
ip addr show
```

**2. Atualizar `app/src/config/api.js`:**
```javascript
const API_CONFIG = {
  web: 'http://localhost:3000/api',
  mobile: 'http://192.168.X.X:3000/api', // Seu IP local
  production: 'https://king.apiprecocerto.space/api',
};
```

**3. Atualizar CORS no backend:**
```env
CORS_ORIGIN=http://localhost:5173,http://192.168.X.X:8081,exp://192.168.X.X:8081
```

**4. Reiniciar backend e app**

### Solução 2: Verificar Servidor de Produção

Se `https://king.apiprecocerto.space` é o servidor de produção:

**1. Testar se está online:**
```bash
curl https://king.apiprecocerto.space/api/health
```

**2. Verificar logs do servidor**

**3. Verificar certificado SSL:**
```bash
curl -v https://king.apiprecocerto.space
```

**4. Verificar se a porta está aberta**

### Solução 3: Aumentar Timeout

Se a conexão for lenta:

**Arquivo:** `app/src/services/api.js`
```javascript
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Aumentar para 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Solução 4: Adicionar Retry Logic

Para conexões instáveis:

**Arquivo:** `app/src/services/api.js`
```javascript
import axios from 'axios';
import axiosRetry from 'axios-retry';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Adicionar retry automático
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           error.code === 'ECONNABORTED';
  },
});
```

**Instalar dependência:**
```bash
cd app
npm install axios-retry
```

### Solução 5: Verificar Firewall/Antivírus

**Windows:**
1. Abrir "Firewall do Windows Defender"
2. Permitir Node.js nas redes privadas e públicas

**Mac:**
1. System Preferences > Security & Privacy > Firewall
2. Adicionar Node.js às exceções

---

## Teste Rápido de Conectividade

**1. No app, adicionar log de debug:**

**Arquivo:** `app/src/stores/notificationStore.js`
```javascript
updatePreferences: async (updates) => {
  try {
    console.log('🔄 Atualizando preferências...');
    console.log('📍 URL:', api.defaults.baseURL);
    console.log('📦 Dados:', updates);
    
    set({ isLoading: true });
    const response = await api.put('/notification-preferences', updates);
    
    console.log('✅ Resposta:', response.data);
    
    const preferences = response.data.data;
    set({ preferences, isEnabled: preferences?.push_enabled ?? true });
    await storage.setNotificationPreferences(preferences);

    return { success: true };
  } catch (error) {
    console.error('❌ Erro completo:', error);
    console.error('📍 URL tentada:', error.config?.url);
    console.error('🔧 Código:', error.code);
    console.error('📡 Response:', error.response?.data);
    
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  } finally {
    set({ isLoading: false });
  }
},
```

**2. Verificar logs no console do app**

---

## Checklist de Diagnóstico

- [ ] Backend está rodando?
- [ ] URL da API está correta?
- [ ] Servidor está acessível (testar no navegador)?
- [ ] CORS está configurado corretamente?
- [ ] Firewall não está bloqueando?
- [ ] Certificado SSL está válido (se HTTPS)?
- [ ] Timeout é suficiente?
- [ ] Token de autenticação está válido?
- [ ] Rota `/notification-preferences` existe no backend?
- [ ] Logs do backend mostram a requisição chegando?

---

## Próximos Passos

1. **Verificar se backend está rodando**
   ```bash
   cd backend
   npm start
   ```

2. **Testar endpoint manualmente**
   ```bash
   curl https://king.apiprecocerto.space/api/health
   ```

3. **Verificar logs do app**
   - Adicionar console.log conforme exemplo acima
   - Ver qual erro específico está acontecendo

4. **Ajustar configuração conforme necessário**
   - URL da API
   - CORS
   - Timeout

---

## Informações Adicionais

**Rota no Backend:** ✅ Registrada
- Arquivo: `backend/src/routes/notificationPreferenceRoutes.js`
- Endpoint: `PUT /api/notification-preferences`
- Autenticação: Requerida (Bearer token)

**Configuração Atual:**
- URL App: `https://king.apiprecocerto.space/api`
- Timeout: 10 segundos
- CORS: Configurado no backend

**Possível Causa Mais Provável:**
- Backend não está rodando OU
- URL `https://king.apiprecocerto.space` não está acessível OU
- Problema de rede/firewall

---

## Solução Rápida (Desenvolvimento Local)

Se estiver desenvolvendo localmente:

**1. Atualizar `app/src/config/api.js`:**
```javascript
const API_CONFIG = {
  web: 'http://localhost:3000/api',
  mobile: 'http://localhost:3000/api', // Temporário para teste
  production: 'https://king.apiprecocerto.space/api',
};
```

**2. Iniciar backend:**
```bash
cd backend
npm start
```

**3. Testar no app**

Se funcionar com localhost, o problema é com a URL de produção.
