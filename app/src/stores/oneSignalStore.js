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
  navigationRef: null,

  // Definir referência de navegação
  setNavigationRef: (ref) => {
    set({ navigationRef: ref });
    console.log('🧭 Referência de navegação configurada');
  },

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

      // NÃO solicitar permissões automaticamente na inicialização
      // Deixar o usuário decidir quando ativar
      console.log('ℹ️ OneSignal inicializado. Use requestPermission() para solicitar permissões.');

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
        
        // Validar dados da notificação
        if (!data) {
          console.warn('⚠️ Notificação sem dados adicionais');
          return;
        }

        // Enviar tracking de abertura
        try {
          get().trackNotificationOpened(data);
        } catch (error) {
          console.error('❌ Erro ao enviar tracking:', error);
        }
        
        // Navegar para a tela correta
        try {
          get().handleNotificationNavigation(data);
        } catch (error) {
          console.error('❌ Erro ao navegar:', error);
        }
      });

      // Verificar se já tem permissão
      const deviceState = await OneSignal.getDeviceState();
      const hasPermission = deviceState?.isPushDisabled === false;
      
      set({ 
        isInitialized: true, 
        isAvailable: true,
        hasPermission 
      });
      
      console.log('✅ OneSignal inicializado com sucesso');
      console.log('📱 Permissão atual:', hasPermission ? 'Concedida' : 'Não concedida');

    } catch (error) {
      console.error('❌ Erro ao inicializar OneSignal:', error);
      set({ isInitialized: false, isAvailable: false });
    }
  },

  // Solicitar permissões manualmente
  requestPermission: async () => {
    try {
      if (!OneSignal) {
        console.log('⚠️ OneSignal não disponível');
        return false;
      }

      console.log('🔔 Solicitando permissão de notificação...');
      
      return new Promise((resolve) => {
        OneSignal.promptForPushNotificationsWithUserResponse(response => {
          console.log('📱 Resposta da permissão:', response);
          set({ hasPermission: response });
          resolve(response);
        });
      });
    } catch (error) {
      console.error('❌ Erro ao solicitar permissão:', error);
      return false;
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
      
      // Verificar se tem permissão, se não, solicitar
      const hasPermission = get().hasPermission;
      if (!hasPermission) {
        console.log('⚠️ Sem permissão de notificação, solicitando...');
        await get().requestPermission();
      }
      
      // Fazer login com external_id
      OneSignal.login(userId.toString());
      
      set({ userId: userId.toString() });
      console.log('✅ Login no OneSignal realizado:', userId);

      // Obter e logar o estado do dispositivo para debug
      const deviceState = await get().getDeviceState();
      if (deviceState) {
        console.log('📱 Player ID:', deviceState.userId);
        console.log('📱 Push Token:', deviceState.pushToken);
      }

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

      const navigationRef = get().navigationRef;
      
      if (!navigationRef) {
        console.warn('⚠️ Referência de navegação não disponível');
        return;
      }

      // Aguardar um pouco para garantir que a navegação está pronta
      setTimeout(() => {
        try {
          // Mapear tipos de notificação para telas
          const { type, productId, couponId, screen } = data;

          if (screen === 'ProductDetails' && productId) {
            console.log('→ Navegando para ProductDetails:', productId);
            navigationRef.navigate('ProductDetails', { id: productId });
          } else if (screen === 'CouponDetails' && couponId) {
            console.log('→ Navegando para CouponDetails:', couponId);
            navigationRef.navigate('CouponDetails', { id: couponId });
          } else if (type === 'new_product' && productId) {
            console.log('→ Navegando para ProductDetails (new_product):', productId);
            navigationRef.navigate('ProductDetails', { id: productId });
          } else if (type === 'new_coupon' && couponId) {
            console.log('→ Navegando para CouponDetails (new_coupon):', couponId);
            navigationRef.navigate('CouponDetails', { id: couponId });
          } else if (type === 'price_drop' && productId) {
            console.log('→ Navegando para ProductDetails (price_drop):', productId);
            navigationRef.navigate('ProductDetails', { id: productId });
          } else if (screen === 'Home' || type === 'general') {
            console.log('→ Navegando para Home');
            navigationRef.navigate('Main', { screen: 'Home' });
          } else {
            console.log('→ Tipo de notificação não reconhecido, indo para Home');
            navigationRef.navigate('Main', { screen: 'Home' });
          }
        } catch (navError) {
          console.error('❌ Erro ao executar navegação:', navError);
        }
      }, 500);

    } catch (error) {
      console.error('❌ Erro ao navegar:', error);
    }
  },

  // Enviar tracking de notificação aberta
  trackNotificationOpened: async (data) => {
    try {
      const { type, productId, couponId } = data;
      
      console.log('📊 Tracking notificação aberta:', { type, productId, couponId });

      // Aqui você pode enviar para seu backend ou analytics
      // Por exemplo: await api.post('/notifications/track-opened', { type, productId, couponId });
      
    } catch (error) {
      console.error('❌ Erro ao enviar tracking:', error);
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
