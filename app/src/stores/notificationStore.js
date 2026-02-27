import { create } from 'zustand';
import { Platform } from 'react-native';
import api from '../services/api';
import storage from '../services/storage';
import * as Notifications from 'expo-notifications';

// ProjectId do app.json
const PROJECT_ID = 'e04af0c1-090d-4315-8448-626e0b84834e';

// Configurar handler de notificações
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: data?.priority === 'high' ? Notifications.AndroidNotificationPriority.HIGH : Notifications.AndroidNotificationPriority.DEFAULT,
    };
  },
});

export const useNotificationStore = create((set, get) => ({
  preferences: null,
  isLoading: false,
  pushToken: null,
  isEnabled: true,
  lastNotification: null,
  notificationListener: null,
  responseListener: null,

  // Inicializar
  initialize: async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      // Carregar preferências do cache
      const cachedPrefs = await storage.getNotificationPreferences();
      if (cachedPrefs) {
        set({ preferences: cachedPrefs });
      }

      // Buscar do backend
      try {
        await get().fetchPreferences();
      } catch (error) {
        console.error('Erro ao buscar preferências:', error);
      }

      // Configurar listeners de notificações
      get().setupNotificationListeners();

      // Solicitar permissão e registrar token
      setTimeout(async () => {
        try {
          await get().registerForPushNotifications();
        } catch (error) {
          if (error.message?.includes('vapidPublicKey') || error.message?.includes('PlatformConstants')) {
            console.log('Push notifications não disponíveis nesta plataforma');
          } else {
            console.error('Erro ao registrar push notifications:', error);
          }
        }
      }, 500);
    } catch (error) {
      console.error('Erro ao inicializar notificações:', error);
    }
  },

  // Configurar listeners de notificações
  setupNotificationListeners: () => {
    // Listener para notificações recebidas enquanto app está aberto
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notificação recebida:', notification);
      set({ lastNotification: notification });
    });

    // Listener para quando usuário toca na notificação
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Usuário tocou na notificação:', response);
      const data = response.notification.request.content.data;
      
      // Aqui você pode navegar para telas específicas baseado no tipo
      if (data?.screen) {
        console.log(`Navegar para: ${data.screen}`);
        // TODO: Implementar navegação usando navigation ref
      }
      
      set({ lastNotification: response.notification });
    });

    set({ notificationListener, responseListener });
  },

  // Limpar listeners
  cleanup: () => {
    const { notificationListener, responseListener } = get();
    
    if (notificationListener) {
      Notifications.removeNotificationSubscription(notificationListener);
    }
    
    if (responseListener) {
      Notifications.removeNotificationSubscription(responseListener);
    }
  },

  // Buscar preferências
  fetchPreferences: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get('/notification-preferences');
      const preferences = response.data.data;

      if (preferences) {
        set({ preferences });
        await storage.setNotificationPreferences(preferences);
      }
    } catch (error) {
      console.error('Erro ao buscar preferências:', error);
      // Se não existir, criar com valores padrão
      if (error.response?.status === 404) {
        const defaultPrefs = {
          push_enabled: true,
          email_enabled: false,
          category_preferences: [],
          keyword_preferences: [],
          product_name_preferences: [],
          home_filters: {
            platforms: [],
            categories: [],
            min_discount: 0,
            max_price: null,
            only_with_coupon: false,
          },
        };
        await get().updatePreferences(defaultPrefs);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  // Atualizar preferências
  updatePreferences: async (updates) => {
    try {
      console.log('🔄 Atualizando preferências...');
      console.log('📍 URL Base:', api.defaults.baseURL);
      console.log('📦 Dados:', JSON.stringify(updates, null, 2));
      
      set({ isLoading: true });
      
      const response = await api.put('/notification-preferences', updates);
      
      console.log('✅ Resposta recebida:', response.status);
      console.log('📦 Dados da resposta:', JSON.stringify(response.data, null, 2));
      
      const preferences = response.data.data;

      set({ preferences, isEnabled: preferences?.push_enabled ?? true });
      await storage.setNotificationPreferences(preferences);

      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao atualizar preferências:', error);
      console.error('📍 URL tentada:', error.config?.url);
      console.error('📍 URL completa:', error.config?.baseURL + error.config?.url);
      console.error('🔧 Código de erro:', error.code);
      console.error('📡 Status HTTP:', error.response?.status);
      console.error('📡 Dados da resposta:', error.response?.data);
      console.error('🔑 Headers:', error.config?.headers);
      
      // Verificar se é erro de autenticação
      if (error.response?.status === 401) {
        console.error('🔐 Erro de autenticação - Token inválido ou expirado');
      }
      
      // Verificar se é erro de rede
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        console.error('⏱️ Timeout - Servidor demorou muito para responder');
      }
      
      if (error.message === 'Network Error') {
        console.error('🌐 Erro de rede - Verifique:');
        console.error('   1. Backend está rodando?');
        console.error('   2. URL está correta?', api.defaults.baseURL);
        console.error('   3. Firewall bloqueando?');
        console.error('   4. Certificado SSL válido?');
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    } finally {
      set({ isLoading: false });
    }
  },

  // Registrar para push notifications
  registerForPushNotifications: async () => {
    try {
      if (Platform.OS === 'web') {
        console.log('🔔 Push notifications não suportadas no web');
        set({ isEnabled: false });
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Permissão de notificação negada');
        set({ isEnabled: false });
        return null;
      }

      const projectId = PROJECT_ID;

      if (!projectId) {
        console.warn('⚠️ ProjectId não encontrado');
        set({ isEnabled: false });
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      console.log('✅ Push token obtido:', token.data);
      set({ pushToken: token.data, isEnabled: true });

      // Registrar token no backend
      try {
        await api.post('/notifications/register-token', {
          push_token: token.data,
        });
        console.log('✅ Token registrado no backend');
      } catch (error) {
        console.error('❌ Erro ao registrar token:', error.response?.data || error.message);
      }

      // Configurar canal de notificação no Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Notificações Gerais',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#DC2626',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('coupon', {
          name: 'Cupons',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('price_alert', {
          name: 'Alertas de Preço',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#F59E0B',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('promo', {
          name: 'Promoções',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#DC2626',
          sound: 'default',
        });

        console.log('✅ Canais de notificação configurados');
      }

      return token.data;
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || '';

      if (errorMessage.includes('removed from Expo Go') || errorMessage.includes('SDK 53')) {
        console.log('⚠️ EXPO GO: Push Notifications remotas não disponíveis no SDK 53+');
        console.log('📱 Use development build para testar notificações');
        set({ isEnabled: false });
        return null;
      }

      if (Platform.OS === 'web' && errorMessage.includes('vapidPublicKey')) {
        console.log('🌐 Push notifications não configuradas para web');
        set({ isEnabled: false });
        return null;
      }

      if (errorMessage.includes('PlatformConstants') || errorMessage.includes('TurboModuleRegistry')) {
        console.log('⚠️ Módulos nativos não disponíveis');
        set({ isEnabled: false });
        return null;
      }

      console.error('❌ Erro ao registrar push notifications:', error);
      set({ isEnabled: false });
      return null;
    }
  },

  // Enviar notificação local de teste
  sendTestNotification: async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Notificação de Teste',
          body: 'Esta é uma notificação local de teste!',
          data: { type: 'test', screen: 'Home' },
          sound: 'default',
        },
        trigger: null, // Enviar imediatamente
      });
      console.log('✅ Notificação de teste enviada');
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar notificação de teste:', error);
      return false;
    }
  },

  // Limpar badge de notificações
  clearBadge: async () => {
    try {
      await Notifications.setBadgeCountAsync(0);
      console.log('✅ Badge limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar badge:', error);
    }
  },

  // Obter todas as notificações pendentes
  getPendingNotifications: async () => {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📋 ${notifications.length} notificações pendentes`);
      return notifications;
    } catch (error) {
      console.error('❌ Erro ao obter notificações pendentes:', error);
      return [];
    }
  },

  // Cancelar todas as notificações pendentes
  cancelAllNotifications: async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ Todas as notificações canceladas');
    } catch (error) {
      console.error('❌ Erro ao cancelar notificações:', error);
    }
  },

  // Adicionar categoria às preferências
  addCategory: async (categoryId) => {
    const { preferences } = get();
    if (!preferences) return;

    const categories = [...(preferences.category_preferences || [])];
    if (!categories.includes(categoryId)) {
      categories.push(categoryId);
      await get().updatePreferences({
        ...preferences,
        category_preferences: categories,
      });
    }
  },

  // Remover categoria das preferências
  removeCategory: async (categoryId) => {
    const { preferences } = get();
    if (!preferences) return;

    const categories = (preferences.category_preferences || []).filter(
      id => id !== categoryId
    );
    await get().updatePreferences({
      ...preferences,
      category_preferences: categories,
    });
  },

  // Adicionar palavra-chave
  addKeyword: async (keyword) => {
    const { preferences } = get();
    if (!preferences) return;

    const keywords = [...(preferences.keyword_preferences || [])];
    if (!keywords.includes(keyword.toLowerCase())) {
      keywords.push(keyword.toLowerCase());
      await get().updatePreferences({
        ...preferences,
        keyword_preferences: keywords,
      });
    }
  },

  // Remover palavra-chave
  removeKeyword: async (keyword) => {
    const { preferences } = get();
    if (!preferences) return;

    const keywords = (preferences.keyword_preferences || []).filter(
      k => k.toLowerCase() !== keyword.toLowerCase()
    );
    await get().updatePreferences({
      ...preferences,
      keyword_preferences: keywords,
    });
  },

  // Adicionar nome de produto
  addProductName: async (productName) => {
    const { preferences } = get();
    if (!preferences) return;

    const productNames = [...(preferences.product_name_preferences || [])];
    if (!productNames.includes(productName)) {
      productNames.push(productName);
      await get().updatePreferences({
        ...preferences,
        product_name_preferences: productNames,
      });
    }
  },

  // Remover nome de produto
  removeProductName: async (productName) => {
    const { preferences } = get();
    if (!preferences) return;

    const productNames = (preferences.product_name_preferences || []).filter(
      pn => pn !== productName
    );
    await get().updatePreferences({
      ...preferences,
      product_name_preferences: productNames,
    });
  },
}));

