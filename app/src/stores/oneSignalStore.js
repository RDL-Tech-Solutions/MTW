import { create } from 'zustand';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Importação condicional do OneSignal
let OneSignal = null;
try {
  OneSignal = require('react-native-onesignal').default;
} catch (error) {
  console.log('⚠️ OneSignal não disponível (Expo Go). Use development build para OneSignal.');
}

// Obter App ID do ambiente
const ONESIGNAL_APP_ID = Constants.expoConfig?.extra?.oneSignalAppId || 
                         process.env.ONESIGNAL_APP_ID || 
                         '40967aa6-5a0e-4ac3-813e-f22c589b89ce';

export const useOneSignalStore = create((set, get) => ({
  isInitialized: false,
  hasPermission: false,
  userId: null,
  isAvailable: !!OneSignal,

  // Inicializar OneSignal
  initialize: async () => {
    try {
      // Verificar se OneSignal está disponível
      if (!OneSignal) {
        console.log('⚠️ OneSignal não disponível nesta build');
        console.log('💡 Para usar OneSignal:');
        console.log('   1. Execute: npx expo prebuild');
        console.log('   2. Execute: npx expo run:android ou npx expo run:ios');
        console.log('   3. OneSignal funcionará no build nativo');
        set({ isInitialized: false, isAvailable: false });
        return;
      }

      console.log('🔔 Inicializando OneSignal...');

      // Configurar App ID
      OneSignal.setAppId(ONESIGNAL_APP_ID);

      // Configurar log level (apenas em desenvolvimento)
      if (__DEV__) {
        OneSignal.setLogLevel(6, 0); // Verbose
      }

      // Solicitar permissões (iOS)
      if (Platform.OS === 'ios') {
        OneSignal.promptForPushNotificationsWithUserResponse(response => {
          console.log('📱 Permissão de notificação:', response);
          set({ hasPermission: response });
        });
      } else {
        // Android geralmente concede permissão automaticamente
        set({ hasPermission: true });
      }

      // Handler para notificações recebidas em foreground
      OneSignal.setNotificationWillShowInForegroundHandler(notificationReceivedEvent => {
        console.log('🔔 Notificação recebida em foreground:', notificationReceivedEvent);
        
        const notification = notificationReceivedEvent.getNotification();
        console.log('📬 Dados da notificação:', notification);
        
        // Mostrar a notificação
        notificationReceivedEvent.complete(notification);
      });

      // Handler para quando notificação é clicada
      OneSignal.setNotificationOpenedHandler(openedEvent => {
        console.log('👆 Notificação clicada:', openedEvent);
        
        const notification = openedEvent.notification;
        const data = notification.additionalData;
        
        console.log('📦 Dados adicionais:', data);
        
        // Navegar para a tela correta
        if (data) {
          get().handleNotificationNavigation(data);
        }
      });

      set({ isInitialized: true, isAvailable: true });
      console.log('✅ OneSignal inicializado com sucesso');

    } catch (error) {
      console.error('❌ Erro ao inicializar OneSignal:', error);
      set({ isInitialized: false, isAvailable: false });
    }
  },

  // Fazer login do usuário no OneSignal
  login: async (userId) => {
    try {
      if (!OneSignal) {
        console.log('⚠️ OneSignal não disponível - login ignorado');
        return;
      }

      if (!userId) {
        console.warn('⚠️ userId não fornecido para OneSignal.login');
        return;
      }

      console.log('🔐 Fazendo login no OneSignal:', userId);
      
      // Fazer login com external_id
      OneSignal.login(userId.toString());
      
      set({ userId: userId.toString() });
      console.log('✅ Login no OneSignal realizado:', userId);

    } catch (error) {
      console.error('❌ Erro ao fazer login no OneSignal:', error);
    }
  },

  // Fazer logout do usuário no OneSignal
  logout: async () => {
    try {
      if (!OneSignal) {
        console.log('⚠️ OneSignal não disponível - logout ignorado');
        return;
      }

      console.log('🚪 Fazendo logout do OneSignal');
      
      OneSignal.logout();
      
      set({ userId: null });
      console.log('✅ Logout do OneSignal realizado');

    } catch (error) {
      console.error('❌ Erro ao fazer logout do OneSignal:', error);
    }
  },

  // Navegar baseado nos dados da notificação
  handleNotificationNavigation: (data) => {
    try {
      console.log('🧭 Navegando baseado na notificação:', data);

      // Obter navegação (isso precisa ser feito de forma diferente)
      // Por enquanto, apenas logamos
      // A navegação real será feita no AppNavigator

      if (data.screen === 'ProductDetails' && data.productId) {
        console.log('→ Navegar para ProductDetails:', data.productId);
        // navigation.navigate('ProductDetails', { id: data.productId });
      } else if (data.screen === 'CouponDetails' && data.couponId) {
        console.log('→ Navegar para CouponDetails:', data.couponId);
        // navigation.navigate('CouponDetails', { id: data.couponId });
      } else if (data.screen === 'Home') {
        console.log('→ Navegar para Home');
        // navigation.navigate('Home');
      } else {
        console.log('→ Tela não especificada, permanecendo na tela atual');
      }

    } catch (error) {
      console.error('❌ Erro ao navegar:', error);
    }
  },

  // Obter ID do dispositivo OneSignal
  getDeviceState: async () => {
    try {
      if (!OneSignal) {
        console.log('⚠️ OneSignal não disponível');
        return null;
      }

      const deviceState = await OneSignal.getDeviceState();
      console.log('📱 Estado do dispositivo OneSignal:', deviceState);
      return deviceState;
    } catch (error) {
      console.error('❌ Erro ao obter estado do dispositivo:', error);
      return null;
    }
  },

  // Enviar tag personalizada
  sendTag: (key, value) => {
    try {
      if (!OneSignal) {
        console.log('⚠️ OneSignal não disponível - tag ignorada');
        return;
      }

      OneSignal.sendTag(key, value);
      console.log(`🏷️ Tag enviada: ${key} = ${value}`);
    } catch (error) {
      console.error('❌ Erro ao enviar tag:', error);
    }
  },

  // Enviar múltiplas tags
  sendTags: (tags) => {
    try {
      if (!OneSignal) {
        console.log('⚠️ OneSignal não disponível - tags ignoradas');
        return;
      }

      OneSignal.sendTags(tags);
      console.log('🏷️ Tags enviadas:', tags);
    } catch (error) {
      console.error('❌ Erro ao enviar tags:', error);
    }
  },

  // Deletar tag
  deleteTag: (key) => {
    try {
      if (!OneSignal) {
        console.log('⚠️ OneSignal não disponível - delete tag ignorado');
        return;
      }

      OneSignal.deleteTag(key);
      console.log(`🗑️ Tag deletada: ${key}`);
    } catch (error) {
      console.error('❌ Erro ao deletar tag:', error);
    }
  },
}));
