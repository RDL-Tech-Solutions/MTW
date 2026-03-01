# 📱 Configuração do OneSignal no App Mobile

## ✅ Status Atual

O backend está 100% configurado e funcionando com OneSignal!

O erro "All included players are not subscribed" é esperado e significa que o usuário precisa se registrar no OneSignal através do app mobile.

## 🔧 O que precisa ser feito no App

### 1. Instalar OneSignal SDK

```bash
cd app
npm install react-native-onesignal
```

### 2. Configurar OneSignal no App

**app/App.js** (ou onde você inicializa o app):
```javascript
import OneSignal from 'react-native-onesignal';

// Inicializar OneSignal
OneSignal.setAppId('40967aa6-5a0e-4ac3-813e-f22c589b89ce');

// Solicitar permissões (iOS)
OneSignal.promptForPushNotificationsWithUserResponse();

// Handler para quando notificação é recebida
OneSignal.setNotificationWillShowInForegroundHandler(notificationReceivedEvent => {
  console.log("OneSignal: notification will show in foreground:", notificationReceivedEvent);
  let notification = notificationReceivedEvent.getNotification();
  notificationReceivedEvent.complete(notification);
});

// Handler para quando notificação é clicada
OneSignal.setNotificationOpenedHandler(notification => {
  console.log("OneSignal: notification opened:", notification);
  
  const data = notification.notification.additionalData;
  
  // Navegar para a tela correta baseado no tipo
  if (data.screen === 'ProductDetails') {
    navigation.navigate('ProductDetails', { id: data.productId });
  } else if (data.screen === 'CouponDetails') {
    navigation.navigate('CouponDetails', { id: data.couponId });
  } else if (data.screen === 'Home') {
    navigation.navigate('Home');
  }
});
```

### 3. Definir External ID no Login

**Após o usuário fazer login com sucesso:**

```javascript
// No seu authStore ou após login bem-sucedido
const loginUser = async (email, password) => {
  try {
    // Seu código de login existente...
    const response = await api.post('/auth/login', { email, password });
    const { user, token } = response.data;
    
    // Salvar token e user...
    
    // IMPORTANTE: Registrar usuário no OneSignal
    OneSignal.login(user.id.toString());
    
    console.log('✅ Usuário registrado no OneSignal:', user.id);
    
  } catch (error) {
    console.error('Erro no login:', error);
  }
};
```

### 4. Remover External ID no Logout

```javascript
const logoutUser = async () => {
  try {
    // Remover do OneSignal
    OneSignal.logout();
    
    // Seu código de logout existente...
    
  } catch (error) {
    console.error('Erro no logout:', error);
  }
};
```

## 📋 Configuração Completa do App

### app/src/stores/authStore.js (exemplo)

```javascript
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OneSignal from 'react-native-onesignal';
import api from '../config/api';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, token } = response.data;

      // Salvar no AsyncStorage
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      // Configurar header de autenticação
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Registrar no OneSignal
      OneSignal.login(user.id.toString());
      console.log('✅ Usuário registrado no OneSignal:', user.id);

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false
      });

      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      console.error('Erro no login:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erro ao fazer login'
      };
    }
  },

  logout: async () => {
    try {
      // Remover do OneSignal
      OneSignal.logout();
      console.log('✅ Usuário removido do OneSignal');

      // Limpar AsyncStorage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');

      // Limpar header de autenticação
      delete api.defaults.headers.common['Authorization'];

      set({
        user: null,
        token: null,
        isAuthenticated: false
      });
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  },

  // Restaurar sessão ao abrir o app
  restoreSession: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');

      if (token && userStr) {
        const user = JSON.parse(userStr);
        
        // Configurar header de autenticação
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Registrar no OneSignal
        OneSignal.login(user.id.toString());
        console.log('✅ Sessão restaurada e registrada no OneSignal:', user.id);

        set({
          user,
          token,
          isAuthenticated: true
        });
      }
    } catch (error) {
      console.error('Erro ao restaurar sessão:', error);
    }
  }
}));

export default useAuthStore;
```

## 🧪 Testando

### 1. No App Mobile:

1. Abra o app
2. Faça login com um usuário
3. Permita notificações quando solicitado
4. Aguarde alguns segundos para sincronização

### 2. No Backend:

```bash
cd backend
npm run test:push-quick
```

Ou teste interativo:

```bash
npm run test:push
```

### 3. Verificar no Dashboard OneSignal:

1. Acesse: https://dashboard.onesignal.com
2. Selecione seu app
3. Vá em "Audience" → "All Users"
4. Procure pelo `external_id` (user.id)
5. Verifique se há dispositivos registrados

## 🔍 Troubleshooting

### Notificação não chega

1. **Verifique permissões:**
   - Configurações do dispositivo → Notificações → Seu App
   - Certifique-se de que notificações estão habilitadas

2. **Verifique logs do app:**
   ```javascript
   // Adicione logs para debug
   OneSignal.setLogLevel(6, 0); // Verbose logging
   ```

3. **Verifique registro no OneSignal:**
   - Dashboard → Audience → All Users
   - Procure pelo external_id (user.id)

4. **Teste manual no Dashboard:**
   - Dashboard → Messages → New Push
   - Envie para o external_id específico

### "All included players are not subscribed"

Isso significa que o usuário não está registrado no OneSignal. Certifique-se de:

1. OneSignal SDK está inicializado no app
2. `OneSignal.login(user.id)` é chamado após login
3. Permissões de notificação foram concedidas
4. Aguarde alguns segundos após o login para sincronização

## 📊 Monitoramento

### Ver estatísticas no Dashboard:

1. **Delivery:**
   - Taxa de entrega
   - Dispositivos alcançados
   - Erros

2. **Engagement:**
   - Taxa de abertura
   - Cliques
   - Conversões

3. **Audience:**
   - Usuários registrados
   - Dispositivos ativos
   - Segmentação

## 🎯 Próximos Passos

Após configurar o OneSignal no app:

1. ✅ Teste notificações manuais
2. ✅ Teste notificações automáticas (novos cupons/produtos)
3. ✅ Configure preferências de notificação
4. ✅ Implemente deep linking
5. ✅ Monitore métricas e engajamento

## 📝 Notas Importantes

- **External ID:** Sempre use `user.id.toString()` como external_id
- **Logout:** Sempre chame `OneSignal.logout()` ao fazer logout
- **Múltiplos Dispositivos:** Um usuário pode ter vários dispositivos registrados
- **Sincronização:** Aguarde alguns segundos após login para sincronização completa
- **Permissões:** Sempre solicite permissões de notificação no momento apropriado
