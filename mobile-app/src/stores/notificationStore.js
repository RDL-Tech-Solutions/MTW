import { create } from 'zustand';
import { Platform } from 'react-native';
import api from '../services/api';
import storage from '../services/storage';
import * as Notifications from 'expo-notifications';

// ProjectId do app.json - usar diretamente para evitar problemas com expo-constants
// Este valor está em app.json -> extra -> eas -> projectId
// IMPORTANTE: Não usar expo-constants aqui para evitar erros de PlatformConstants
const PROJECT_ID = '967ccc1a-3521-4c83-91a4-851bed949c45';

// Configurar handler de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const useNotificationStore = create((set, get) => ({
  preferences: null,
  isLoading: false,
  pushToken: null,
  isEnabled: true,

  // Inicializar
  initialize: async () => {
    try {
      // Aguardar um pouco para garantir que os módulos nativos estejam prontos
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

      // Solicitar permissão e registrar token (com delay adicional)
      setTimeout(async () => {
        try {
          await get().registerForPushNotifications();
        } catch (error) {
          // Silenciar erros de VAPID no web e PlatformConstants
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
      set({ isLoading: true });
      const response = await api.put('/notification-preferences', updates);
      const preferences = response.data.data;
      
      set({ preferences, isEnabled: preferences?.push_enabled ?? true });
      await storage.setNotificationPreferences(preferences);
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error);
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
      // Push notifications não são suportadas no web sem configuração VAPID
      if (Platform.OS === 'web') {
        console.log('Push notifications não são suportadas no web sem configuração VAPID');
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
        set({ isEnabled: false });
        return null;
      }

      // Obter projectId de forma segura (sem depender de expo-constants durante o carregamento)
      // Usar projectId diretamente do app.json (sem depender de expo-constants)
      // Isso evita erros de PlatformConstants durante o carregamento do módulo
      const projectId = PROJECT_ID;
      
      if (!projectId) {
        console.warn('ProjectId não encontrado. Push notifications podem não funcionar.');
        set({ isEnabled: false });
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      set({ pushToken: token.data, isEnabled: true });

      // Registrar token no backend
      try {
        await api.post('/notifications/register-token', {
          push_token: token.data,
        });
      } catch (error) {
        console.error('Erro ao registrar token no backend:', error);
      }

      return token.data;
    } catch (error) {
      // Silenciar erros conhecidos
      const errorMessage = error?.message || error?.toString() || '';
      
      if (Platform.OS === 'web' && errorMessage.includes('vapidPublicKey')) {
        console.log('Push notifications não configuradas para web (VAPID keys necessárias)');
        set({ isEnabled: false });
        return null;
      }
      
      if (errorMessage.includes('PlatformConstants') || errorMessage.includes('TurboModuleRegistry')) {
        console.log('Módulos nativos não disponíveis. Push notifications podem não funcionar.');
        set({ isEnabled: false });
        return null;
      }
      
      console.error('Erro ao registrar push notifications:', error);
      set({ isEnabled: false });
      return null;
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

