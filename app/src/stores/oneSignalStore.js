import { create } from 'zustand';
import { Platform } from 'react-native';
import OneSignal from 'react-native-onesignal';
import api from '../services/api';
import storage from '../services/storage';
import logger from '../utils/logger';

/**
 * Store para gerenciar notificações via OneSignal
 * 
 * Substitui o notificationStore.js que usava Expo Notifications
 */
export const useOneSignalStore = create((set, get) => ({
  // Estado
  isInitialized: false,
  isEnabled: false,
  userId: null,
  pushToken: null,
  lastNotification: null,
  preferences: null,
  isLoading: false,

  /**
   * Inicializar OneSignal
   */
  initialize: async () => {
    try {
      if (Platform.OS === 'web') {
        logger.info('OneSignal não disponível na web');
        return;
      }

      logger.info('🚀 Inicializando OneSignal...');

      // Configurar OneSignal
      const appId = process.env.ONESIGNAL_APP_ID || 'YOUR_ONESIGNAL_APP_ID';
      
      OneSignal.setAppId(appId);

      // Solicitar permissão
      OneSignal.promptForPushNotificationsWithUserResponse(response => {
        logger.info(`Permissão de notificação: ${response}`);
        set({ isEnabled: response });
      });

      // Configurar handlers
      get().setupNotificationHandlers();

      set({ isInitialized: true });
      logger.info('✅ OneSignal inicializado');
    } catch (error) {
      logger.error(`Erro ao inicializar OneSignal: ${error.message}`);
      set({ isInitialized: false, isEnabled: false });
    }
  },

  /**
   * Configurar handlers de notificação
   */
  setupNotificationHandlers: () => {
    // Handler quando notificação é recebida
    OneSignal.setNotificationWillShowInForegroundHandler(notificationReceivedEvent => {
      logger.info('🔔 Notificação recebida:', notificationReceivedEvent);
      
      const notification = notificationReceivedEvent.getNotification();
      set({ lastNotification: notification });

      // Exibir notificação
      notificationReceivedEvent.complete(notification);
    });

    // Handler quando usuário clica na notificação
    OneSignal.setNotificationOpenedHandler(openedEvent => {
      logger.info('👆 Usuário abriu notificação:', openedEvent);
      
      const notification = openedEvent.notification;
      const data = notification.additionalData;

      set({ lastNotification: notification });

      // Navegar para tela apropriada baseado no tipo
      if (data) {
        get().handleNotificationNavigation(data);
      }
    });

    // Handler de mudança de estado de permissão
    OneSignal.addPermissionObserver(event => {
      logger.info(`Permissão mudou: ${event.to}`);
      set({ isEnabled: event.to });
    });

    // Handler de mudança de subscription
    OneSignal.addSubscriptionObserver(event => {
      logger.info(`Subscription mudou: ${JSON.stringify(event)}`);
      
      if (event.to.userId) {
        set({ userId: event.to.userId });
        get().syncWithBackend(event.to.userId);
      }
    });
  },

  /**
   * Sincronizar com backend
   */
  syncWithBackend: async (oneSignalUserId) => {
    try {
      const user = await storage.getUser();
      if (!user) return;

      // Enviar external_id para o backend
      await api.post('/notifications/register-onesignal', {
        onesignal_user_id: oneSignalUserId,
        external_id: user.id.toString()
      });

      logger.info('✅ OneSignal sincronizado com backend');
    } catch (error) {
      logger.error(`Erro ao sincronizar com backend: ${error.message}`);
    }
  },

  /**
   * Registrar usuário no OneSignal
   */
  registerUser: async (userId) => {
    try {
      if (Platform.OS === 'web') return;

      // Definir external user ID
      OneSignal.setExternalUserId(userId.toString());

      logger.info(`✅ Usuário registrado no OneSignal: ${userId}`);
      set({ userId });
    } catch (error) {
      logger.error(`Erro ao registrar usuário: ${error.message}`);
    }
  },

  /**
   * Remover usuário do OneSignal (logout)
   */
  unregisterUser: async () => {
    try {
      if (Platform.OS === 'web') return;

      OneSignal.removeExternalUserId();
      
      set({ userId: null, pushToken: null });
      logger.info('✅ Usuário removido do OneSignal');
    } catch (error) {
      logger.error(`Erro ao remover usuário: ${error.message}`);
    }
  },

  /**
   * Definir tags do usuário
   */
  setUserTags: async (tags) => {
    try {
      if (Platform.OS === 'web') return;

      OneSignal.sendTags(tags);
      logger.info(`✅ Tags definidas: ${JSON.stringify(tags)}`);
    } catch (error) {
      logger.error(`Erro ao definir tags: ${error.message}`);
    }
  },

  /**
   * Remover tags do usuário
   */
  deleteUserTags: async (tagKeys) => {
    try {
      if (Platform.OS === 'web') return;

      OneSignal.deleteTags(tagKeys);
      logger.info(`✅ Tags removidas: ${JSON.stringify(tagKeys)}`);
    } catch (error) {
      logger.error(`Erro ao remover tags: ${error.message}`);
    }
  },

  /**
   * Navegar baseado nos dados da notificação
   */
  handleNotificationNavigation: (data) => {
    const { type, screen, productId, couponId } = data;

    // Esta função será chamada pelo componente de navegação
    // que tem acesso ao navigation
    logger.info(`Navegando para: ${screen || type}`);
    
    // Emitir evento para o componente de navegação
    if (global.notificationNavigationHandler) {
      global.notificationNavigationHandler(data);
    }
  },

  /**
   * Obter estado de permissão
   */
  getPermissionStatus: async () => {
    try {
      if (Platform.OS === 'web') return false;

      const deviceState = await OneSignal.getDeviceState();
      return deviceState?.hasNotificationPermission || false;
    } catch (error) {
      logger.error(`Erro ao obter status de permissão: ${error.message}`);
      return false;
    }
  },

  /**
   * Solicitar permissão de notificação
   */
  requestPermission: async () => {
    try {
      if (Platform.OS === 'web') return false;

      return new Promise((resolve) => {
        OneSignal.promptForPushNotificationsWithUserResponse(response => {
          set({ isEnabled: response });
          resolve(response);
        });
      });
    } catch (error) {
      logger.error(`Erro ao solicitar permissão: ${error.message}`);
      return false;
    }
  },

  /**
   * Desabilitar notificações
   */
  disableNotifications: async () => {
    try {
      if (Platform.OS === 'web') return;

      OneSignal.disablePush(true);
      set({ isEnabled: false });
      logger.info('✅ Notificações desabilitadas');
    } catch (error) {
      logger.error(`Erro ao desabilitar notificações: ${error.message}`);
    }
  },

  /**
   * Habilitar notificações
   */
  enableNotifications: async () => {
    try {
      if (Platform.OS === 'web') return;

      OneSignal.disablePush(false);
      set({ isEnabled: true });
      logger.info('✅ Notificações habilitadas');
    } catch (error) {
      logger.error(`Erro ao habilitar notificações: ${error.message}`);
    }
  },

  /**
   * Enviar notificação de teste
   */
  sendTestNotification: async () => {
    try {
      await api.post('/onesignal/test', {
        user_id: get().userId
      });
      logger.info('✅ Notificação de teste enviada');
    } catch (error) {
      logger.error(`Erro ao enviar teste: ${error.message}`);
    }
  },

  /**
   * Limpar badge (iOS)
   */
  clearBadge: async () => {
    try {
      if (Platform.OS === 'ios') {
        OneSignal.clearOneSignalNotifications();
        logger.info('✅ Badge limpo');
      }
    } catch (error) {
      logger.error(`Erro ao limpar badge: ${error.message}`);
    }
  },

  /**
   * Obter device state
   */
  getDeviceState: async () => {
    try {
      if (Platform.OS === 'web') return null;

      const deviceState = await OneSignal.getDeviceState();
      logger.info(`Device State: ${JSON.stringify(deviceState)}`);
      return deviceState;
    } catch (error) {
      logger.error(`Erro ao obter device state: ${error.message}`);
      return null;
    }
  },

  /**
   * Limpar estado
   */
  reset: () => {
    set({
      isInitialized: false,
      isEnabled: false,
      userId: null,
      pushToken: null,
      lastNotification: null,
      preferences: null,
      isLoading: false
    });
  }
}));

export default useOneSignalStore;
