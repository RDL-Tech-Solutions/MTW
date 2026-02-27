# Diagnóstico: Erro ao Ativar Notificações Push

## Erro Reportado
```
ERROR  Erro ao atualizar preferências: [AxiosError: Network Error]
```

---

## Situação Atual

✅ **Backend:** Conectado e funcionando normalmente  
❌ **App:** Não consegue ativar notificações push (erro de rede ao salvar preferências)

---

## Diagnóstico Detalhado

### 1. Logs Adicionados

Adicionei logs detalhados na função `updatePreferences` para identificar o problema exato:

**Arquivo:** `app/src/stores/notificationStore.js`

**Logs que serão exibidos:**
```
🔄 Atualizando preferências...
📍 URL Base: https://king.apiprecocerto.space/api
📦 Dados: { push_enabled: true, ... }
```

**Em caso de erro:**
```
❌ Erro ao atualizar preferências
📍 URL tentada: /notification-preferences
📍 URL completa: https://king.apiprecocerto.space/api/notification-preferences
🔧 Código de erro: NETWORK_ERROR
📡 Status HTTP: undefined
🌐 Erro de rede - Verifique:
   1. Backend está rodando?
   2. URL está correta?
   3. Firewall bloqueando?
   4. Certificado SSL válido?
```

---

## Verificações Necessárias

### 1. Verificar Autenticação

O endpoint `/notification-preferences` requer autenticação. Verificar se o token está sendo enviado:

**No console do app, procurar por:**
```
🔑 Headers: { Authorization: "Bearer ..." }
```

**Se não aparecer o token:**
- Usuário não está logado
- Token expirou
- Token não foi salvo corretamente

**Solução:**
1. Fazer logout e login novamente
2. Verificar se o token está sendo salvo no AsyncStorage

### 2. Verificar URL da API

**Arquivo:** `app/src/config/api.js`

**URL Atual:**
```javascript
mobile: 'https://king.apiprecocerto.space/api'
```

**Testar manualmente:**
```bash
# No navegador ou Postman
GET https://king.apiprecocerto.space/api/health

# Deve retornar:
{
  "status": "ok",
  "timestamp": "..."
}
```

**Se não funcionar:**
- Servidor está offline
- URL está incorreta
- Certificado SSL inválido
- Firewall bloqueando

### 3. Verificar CORS

**Arquivo:** `backend/.env`

**CORS_ORIGIN atual:**
```
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:19006,http://192.168.7.9:8081,http://192.168.7.9,http://192.168.7.9:8081,http://localhost:8081,exp://192.168.7.9:8081,https://precocertooo.vercel.app
```

**Para app mobile, adicionar:**
```
CORS_ORIGIN=...,https://king.apiprecocerto.space
```

### 4. Verificar Rota no Backend

**Verificação:**
```bash
# No backend
grep -r "notification-preferences" src/routes/
```

**Resultado esperado:**
```
src/routes/index.js:router.use('/notification-preferences', notificationPreferenceRoutes);
```

✅ **Status:** Rota está registrada corretamente

---

## Testes de Diagnóstico

### Teste 1: Verificar Conectividade Básica

**No app, adicionar teste:**

```javascript
// Testar endpoint de health
const testConnection = async () => {
  try {
    console.log('🧪 Testando conexão...');
    const response = await api.get('/health');
    console.log('✅ Conexão OK:', response.data);
  } catch (error) {
    console.error('❌ Falha na conexão:', error.message);
  }
};

// Chamar antes de updatePreferences
await testConnection();
```

### Teste 2: Verificar Autenticação

```javascript
// Verificar se token existe
import AsyncStorage from '@react-native-async-storage/async-storage';

const checkAuth = async () => {
  const token = await AsyncStorage.getItem('@mtw_token');
  console.log('🔑 Token existe:', !!token);
  console.log('🔑 Token (primeiros 20 chars):', token?.substring(0, 20));
};

await checkAuth();
```

### Teste 3: Testar Endpoint Específico

```javascript
// Testar GET antes do PUT
const testPreferences = async () => {
  try {
    console.log('🧪 Testando GET /notification-preferences...');
    const response = await api.get('/notification-preferences');
    console.log('✅ GET OK:', response.data);
    
    console.log('🧪 Testando PUT /notification-preferences...');
    const putResponse = await api.put('/notification-preferences', {
      push_enabled: true
    });
    console.log('✅ PUT OK:', putResponse.data);
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
};

await testPreferences();
```

---

## Soluções Possíveis

### Solução 1: Problema de Autenticação

**Se o erro for 401 (Unauthorized):**

1. **Fazer logout e login novamente:**
   ```javascript
   // No app
   await AsyncStorage.clear();
   // Navegar para tela de login
   ```

2. **Verificar se token está sendo enviado:**
   ```javascript
   // app/src/services/api.js
   api.interceptors.request.use(
     async (config) => {
       const token = await AsyncStorage.getItem('@mtw_token');
       console.log('🔑 Enviando token:', !!token);
       if (token) {
         config.headers.Authorization = `Bearer ${token}`;
       }
       return config;
     }
   );
   ```

### Solução 2: Problema de URL

**Se o servidor não estiver acessível:**

**Opção A: Usar IP local (desenvolvimento)**
```javascript
// app/src/config/api.js
const API_CONFIG = {
  mobile: 'http://192.168.X.X:3000/api', // Seu IP local
};
```

**Opção B: Verificar servidor de produção**
```bash
# Verificar se está online
curl https://king.apiprecocerto.space/api/health

# Verificar certificado SSL
curl -v https://king.apiprecocerto.space 2>&1 | grep -i ssl
```

### Solução 3: Problema de Timeout

**Se a conexão for lenta:**

```javascript
// app/src/services/api.js
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Aumentar para 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Solução 4: Problema de CORS

**Se for erro de CORS:**

```env
# backend/.env
CORS_ORIGIN=*
# ou
CORS_ORIGIN=https://king.apiprecocerto.space,http://192.168.X.X:8081
```

**Reiniciar backend após alterar**

### Solução 5: Bypass Temporário (Teste)

**Para testar se o problema é específico do endpoint:**

```javascript
// Comentar temporariamente a chamada da API
updatePreferences: async (updates) => {
  try {
    console.log('🧪 TESTE: Salvando apenas localmente');
    set({ preferences: updates, isEnabled: updates.push_enabled });
    await storage.setNotificationPreferences(updates);
    return { success: true };
  } catch (error) {
    console.error('Erro:', error);
    return { success: false, error: error.message };
  }
},
```

**Se funcionar:** Problema é na comunicação com backend  
**Se não funcionar:** Problema é no código local

---

## Checklist de Diagnóstico

Execute os testes na ordem e anote os resultados:

- [ ] **Teste 1:** Backend está rodando?
  ```bash
  cd backend
  npm start
  ```

- [ ] **Teste 2:** Endpoint de health responde?
  ```bash
  curl https://king.apiprecocerto.space/api/health
  ```

- [ ] **Teste 3:** Usuário está autenticado?
  ```javascript
  const token = await AsyncStorage.getItem('@mtw_token');
  console.log('Token:', !!token);
  ```

- [ ] **Teste 4:** Token é válido?
  ```bash
  # No Postman ou curl
  curl -H "Authorization: Bearer SEU_TOKEN" \
       https://king.apiprecocerto.space/api/notification-preferences
  ```

- [ ] **Teste 5:** Logs detalhados aparecem?
  - Abrir console do app
  - Tentar ativar notificações
  - Ver logs completos

- [ ] **Teste 6:** Erro específico identificado?
  - Network Error → Problema de conectividade
  - 401 → Problema de autenticação
  - 404 → Rota não encontrada
  - 500 → Erro no servidor

---

## Próximos Passos

### 1. Executar App e Ver Logs

```bash
cd app
npm start
# ou
npx expo start
```

**No console, procurar por:**
```
🔄 Atualizando preferências...
📍 URL Base: ...
📦 Dados: ...
```

### 2. Anotar Erro Específico

**Copiar e colar aqui:**
```
[Cole o erro completo do console]
```

### 3. Testar Manualmente

**No Postman ou navegador:**
```
GET https://king.apiprecocerto.space/api/notification-preferences
Headers:
  Authorization: Bearer SEU_TOKEN_AQUI
```

**Resultado:**
```
[Cole o resultado aqui]
```

---

## Informações Adicionais

**Configuração Atual:**

- **URL Backend:** `https://king.apiprecocerto.space/api`
- **Endpoint:** `PUT /notification-preferences`
- **Autenticação:** Bearer Token (obrigatório)
- **Timeout:** 10 segundos
- **Rota Backend:** ✅ Registrada em `src/routes/index.js`

**Arquivos Modificados:**

- ✅ `app/src/stores/notificationStore.js` - Logs detalhados adicionados

**Próxima Ação:**

1. Executar app
2. Tentar ativar notificações
3. Copiar logs completos do console
4. Compartilhar logs para análise

---

## Comandos Úteis

**Verificar se backend está rodando:**
```bash
curl https://king.apiprecocerto.space/api/health
```

**Ver logs do backend:**
```bash
cd backend
npm start
# Logs aparecerão no terminal
```

**Limpar cache do app:**
```bash
cd app
npx expo start --clear
```

**Ver token no app:**
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
const token = await AsyncStorage.getItem('@mtw_token');
console.log('Token:', token);
```

---

## Conclusão

Com os logs detalhados adicionados, agora será possível identificar exatamente onde está o problema:

1. ✅ Logs mostram URL tentada
2. ✅ Logs mostram dados enviados
3. ✅ Logs mostram erro específico
4. ✅ Logs mostram se token está sendo enviado

**Próximo passo:** Executar o app e compartilhar os logs completos do console.
