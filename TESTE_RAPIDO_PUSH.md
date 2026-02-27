# Teste Rápido: Diagnóstico de Push Notifications

## Adicionar Teste Temporário

### 1. Abrir arquivo de configurações de notificações

**Arquivo:** `app/src/screens/settings/NotificationSettingsScreen.js`

### 2. Adicionar função de teste no início do componente

```javascript
// Adicionar após os imports
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NotificationSettingsScreen({ navigation }) {
  // ... estados existentes ...

  // ADICIONAR ESTA FUNÇÃO DE TESTE
  const runDiagnostics = async () => {
    console.log('\n========== DIAGNÓSTICO PUSH NOTIFICATIONS ==========\n');
    
    try {
      // 1. Verificar token de autenticação
      console.log('1️⃣ Verificando autenticação...');
      const token = await AsyncStorage.getItem('@mtw_token');
      console.log('   Token existe:', !!token);
      if (token) {
        console.log('   Token (primeiros 30 chars):', token.substring(0, 30) + '...');
      } else {
        console.log('   ❌ PROBLEMA: Token não encontrado!');
        Alert.alert('Erro', 'Você não está autenticado. Faça login novamente.');
        return;
      }

      // 2. Verificar URL da API
      console.log('\n2️⃣ Verificando URL da API...');
      console.log('   URL Base:', api.defaults.baseURL);

      // 3. Testar endpoint de health
      console.log('\n3️⃣ Testando conectividade (health check)...');
      try {
        const healthResponse = await api.get('/health');
        console.log('   ✅ Health check OK:', healthResponse.data);
      } catch (healthError) {
        console.log('   ❌ Health check falhou:', healthError.message);
        console.log('   Código:', healthError.code);
        Alert.alert('Erro de Conexão', 'Não foi possível conectar ao servidor. Verifique sua internet.');
        return;
      }

      // 4. Testar GET /notification-preferences
      console.log('\n4️⃣ Testando GET /notification-preferences...');
      try {
        const getResponse = await api.get('/notification-preferences');
        console.log('   ✅ GET OK:', getResponse.data);
      } catch (getError) {
        console.log('   ❌ GET falhou:', getError.response?.status, getError.response?.data || getError.message);
        if (getError.response?.status === 401) {
          Alert.alert('Erro de Autenticação', 'Seu token expirou. Faça login novamente.');
          return;
        }
      }

      // 5. Testar PUT /notification-preferences
      console.log('\n5️⃣ Testando PUT /notification-preferences...');
      try {
        const putResponse = await api.put('/notification-preferences', {
          push_enabled: true,
          email_enabled: false,
        });
        console.log('   ✅ PUT OK:', putResponse.data);
        Alert.alert('Sucesso!', 'Todos os testes passaram. As notificações devem funcionar.');
      } catch (putError) {
        console.log('   ❌ PUT falhou:', putError.response?.status, putError.response?.data || putError.message);
        console.log('   URL tentada:', putError.config?.url);
        console.log('   Headers:', putError.config?.headers);
        
        let errorMsg = 'Erro desconhecido';
        if (putError.message === 'Network Error') {
          errorMsg = 'Erro de rede. Verifique:\n1. Backend está rodando?\n2. URL está correta?\n3. Firewall bloqueando?';
        } else if (putError.response?.status === 401) {
          errorMsg = 'Token inválido ou expirado. Faça login novamente.';
        } else if (putError.response?.status === 404) {
          errorMsg = 'Rota não encontrada no servidor.';
        } else if (putError.response?.status >= 500) {
          errorMsg = 'Erro no servidor. Verifique os logs do backend.';
        }
        
        Alert.alert('Erro no Teste', errorMsg);
      }

      console.log('\n========== FIM DO DIAGNÓSTICO ==========\n');
    } catch (error) {
      console.error('Erro geral no diagnóstico:', error);
      Alert.alert('Erro', 'Erro ao executar diagnóstico: ' + error.message);
    }
  };

  // ... resto do código ...
```

### 3. Adicionar botão de teste na interface

```javascript
// Adicionar antes do botão "Salvar Preferências"

{/* Botão de Diagnóstico - TEMPORÁRIO */}
<Button
  title="🔍 Executar Diagnóstico"
  onPress={runDiagnostics}
  style={[styles.saveButton, { backgroundColor: colors.warning }]}
  size="large"
/>
```

### 4. Executar o teste

1. Abrir o app
2. Ir para Configurações > Notificações
3. Clicar no botão "🔍 Executar Diagnóstico"
4. Ver os logs no console
5. Ver os alertas na tela

---

## O que o teste verifica

1. ✅ **Token de autenticação existe?**
2. ✅ **URL da API está configurada?**
3. ✅ **Servidor está acessível? (health check)**
4. ✅ **Endpoint GET funciona?**
5. ✅ **Endpoint PUT funciona?**

---

## Interpretando os Resultados

### Cenário 1: Todos os testes passam ✅
```
1️⃣ Token existe: true
2️⃣ URL Base: https://king.apiprecocerto.space/api
3️⃣ Health check OK
4️⃣ GET OK
5️⃣ PUT OK
```
**Solução:** Notificações devem funcionar. Se ainda não funcionar, o problema é em outro lugar.

### Cenário 2: Token não encontrado ❌
```
1️⃣ Token existe: false
❌ PROBLEMA: Token não encontrado!
```
**Solução:** Fazer logout e login novamente.

### Cenário 3: Health check falha ❌
```
3️⃣ Health check falhou: Network Error
```
**Solução:** 
- Backend não está rodando
- URL está incorreta
- Problema de rede/firewall

### Cenário 4: GET falha com 401 ❌
```
4️⃣ GET falhou: 401 Unauthorized
```
**Solução:** Token expirou. Fazer logout e login novamente.

### Cenário 5: PUT falha com Network Error ❌
```
5️⃣ PUT falhou: Network Error
```
**Solução:**
- Verificar se backend está rodando
- Verificar URL da API
- Verificar firewall
- Verificar CORS no backend

---

## Código Completo para Copiar

```javascript
// Adicionar no início do componente NotificationSettingsScreen

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';

// Dentro do componente, antes do return
const runDiagnostics = async () => {
  console.log('\n========== DIAGNÓSTICO PUSH NOTIFICATIONS ==========\n');
  
  try {
    // 1. Verificar token
    console.log('1️⃣ Verificando autenticação...');
    const token = await AsyncStorage.getItem('@mtw_token');
    console.log('   Token existe:', !!token);
    if (!token) {
      Alert.alert('Erro', 'Você não está autenticado. Faça login novamente.');
      return;
    }

    // 2. Verificar URL
    console.log('\n2️⃣ URL Base:', api.defaults.baseURL);

    // 3. Health check
    console.log('\n3️⃣ Testando health check...');
    const healthResponse = await api.get('/health');
    console.log('   ✅ Health OK');

    // 4. GET preferences
    console.log('\n4️⃣ Testando GET...');
    const getResponse = await api.get('/notification-preferences');
    console.log('   ✅ GET OK');

    // 5. PUT preferences
    console.log('\n5️⃣ Testando PUT...');
    const putResponse = await api.put('/notification-preferences', {
      push_enabled: true,
      email_enabled: false,
    });
    console.log('   ✅ PUT OK');
    
    Alert.alert('Sucesso!', 'Todos os testes passaram!');
  } catch (error) {
    console.error('❌ Erro:', error.response?.status, error.message);
    Alert.alert('Erro', error.message);
  }
  
  console.log('\n========== FIM ==========\n');
};

// No JSX, adicionar botão antes do botão Salvar:
<Button
  title="🔍 Executar Diagnóstico"
  onPress={runDiagnostics}
  style={[styles.saveButton, { backgroundColor: '#F59E0B' }]}
/>
```

---

## Após o Diagnóstico

1. **Copiar todos os logs do console**
2. **Anotar qual teste falhou**
3. **Compartilhar os logs**

Com essas informações, será possível identificar exatamente o problema!
