import { create } from 'zustand';
import { Platform } from 'react-native';
import api from '../services/api';

// Importação condicional do Firebase Messaging
let messaging = null;
try {
    messaging = require('@react-native-firebase/messaging').default;
} catch (error) {
    console.log('⚠️ Firebase Messaging não disponível (Expo Go). Use development build.');
}

export const useFcmStore = create((set, get) => ({
    isInitialized: false,
    hasPermission: false,
    fcmToken: null,
    isAvailable: !!messaging,
    navigationRef: null,

    // Definir referência de navegação
    setNavigationRef: (ref) => {
        set({ navigationRef: ref });
        console.log('🧭 FCM: Referência de navegação configurada');
    },

    // Inicializar FCM
    initialize: async () => {
        try {
            if (!messaging) {
                console.log('⚠️ FCM não disponível nesta build');
                console.log('💡 Para usar FCM:');
                console.log('   1. Execute: npx expo prebuild');
                console.log('   2. Execute: npx expo run:android');
                set({ isInitialized: false, isAvailable: false });
                return;
            }

            console.log('🔔 Inicializando Firebase Cloud Messaging...');

            // Handler para notificações recebidas em foreground
            const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
                console.log('🔔 FCM: Notificação em foreground:', remoteMessage);
                // Em foreground, FCM não exibe automaticamente — pode exibir via notificação local se quiser
            });

            // Handler para quando app é aberto via notificação (background/killed)
            messaging().onNotificationOpenedApp((remoteMessage) => {
                console.log('👆 FCM: App aberto via notificação:', remoteMessage);
                const data = remoteMessage?.data;
                if (data) {
                    try {
                        get().trackNotificationOpened(data);
                        setTimeout(() => get().handleNotificationNavigation(data), 500);
                    } catch (error) {
                        console.error('❌ FCM: Erro ao processar notificação:', error);
                    }
                }
            });

            // Verificar se app foi aberto por notificação (app estava morto)
            const initialNotification = await messaging().getInitialNotification();
            if (initialNotification) {
                console.log('📬 FCM: App aberto por notificação inicial:', initialNotification);
                const data = initialNotification?.data;
                if (data) {
                    setTimeout(() => {
                        try {
                            get().trackNotificationOpened(data);
                            get().handleNotificationNavigation(data);
                        } catch (error) {
                            console.error('❌ FCM: Erro ao processar notificação inicial:', error);
                        }
                    }, 1000);
                }
            }

            // Verificar permissão atual
            const authStatus = await messaging().requestPermission();
            const hasPermission = (
                authStatus === messaging.AuthorizationStatus?.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus?.PROVISIONAL ||
                authStatus === 1 || authStatus === 2
            );

            set({
                isInitialized: true,
                isAvailable: true,
                hasPermission
            });

            console.log('✅ FCM inicializado com sucesso');
            console.log('📱 Permissão:', hasPermission ? 'Concedida' : 'Negada');

            // Obter token se tem permissão
            if (hasPermission) {
                await get().refreshToken();
            }

        } catch (error) {
            console.error('❌ Erro ao inicializar FCM:', error);
            set({ isInitialized: false, isAvailable: false });
        }
    },

    // Solicitar permissão de notificação
    requestPermission: async () => {
        try {
            if (!messaging) {
                console.log('⚠️ FCM não disponível');
                return false;
            }

            console.log('🔔 Solicitando permissão de notificação FCM...');

            const authStatus = await messaging().requestPermission();
            const granted = (
                authStatus === messaging.AuthorizationStatus?.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus?.PROVISIONAL ||
                authStatus === 1 || authStatus === 2
            );

            set({ hasPermission: granted });
            console.log('📱 Permissão FCM:', granted ? 'Concedida' : 'Negada');

            if (granted) {
                await get().refreshToken();
            }

            return granted;
        } catch (error) {
            console.error('❌ Erro ao solicitar permissão FCM:', error);
            return false;
        }
    },

    // Obter/renovar token FCM e registrar no backend
    refreshToken: async () => {
        try {
            if (!messaging) return null;

            const token = await messaging().getToken();
            if (!token) {
                console.warn('⚠️ FCM: Token não obtido');
                return null;
            }

            console.log('📱 FCM Token obtido:', token.substring(0, 30) + '...');
            set({ fcmToken: token });

            // Registrar token no backend
            await get().registerTokenOnBackend(token);

            // Listener para renovação automática de token
            messaging().onTokenRefresh(async (newToken) => {
                console.log('🔄 FCM Token renovado');
                set({ fcmToken: newToken });
                await get().registerTokenOnBackend(newToken);
            });

            return token;
        } catch (error) {
            console.error('❌ FCM: Erro ao obter token:', error);
            return null;
        }
    },

    // Registrar token FCM no backend
    registerTokenOnBackend: async (token) => {
        try {
            await api.post('/notifications/register-token', { token });
            console.log('✅ FCM token registrado no backend');
        } catch (error) {
            console.error('❌ FCM: Erro ao registrar token no backend:', error.message);
        }
    },

    // Registrar usuário (login) — garante token atualizado
    login: async (userId) => {
        try {
            if (!messaging) {
                console.log('⚠️ FCM não disponível - login ignorado');
                return;
            }

            if (!userId) {
                console.warn('⚠️ userId não fornecido para FCM.login');
                return;
            }

            console.log('🔐 FCM: Registrando token para usuário:', userId);

            const hasPermission = get().hasPermission;
            if (!hasPermission) {
                await get().requestPermission();
            }

            // Garantir que o token está registrado
            const token = get().fcmToken || await get().refreshToken();

            if (token) {
                console.log('✅ FCM: Login realizado para usuário:', userId);
            } else {
                console.warn('⚠️ FCM: Login sem token (permissão não concedida)');
            }
        } catch (error) {
            console.error('❌ FCM: Erro ao fazer login:', error);
        }
    },

    // Logout — remover token do backend
    logout: async () => {
        try {
            if (!messaging) {
                console.log('⚠️ FCM não disponível - logout ignorado');
                return;
            }

            console.log('🚪 FCM: Fazendo logout');
            set({ fcmToken: null });
            // Não deletamos o token FCM aqui pois o device pode compartilhar entre usuários
            // O backend associa o token ao usuário autenticado via JWT
            console.log('✅ FCM: Logout realizado');
        } catch (error) {
            console.error('❌ FCM: Erro ao fazer logout:', error);
        }
    },

    // Navegar baseado nos dados da notificação
    handleNotificationNavigation: (data) => {
        try {
            console.log('🧭 FCM: Navegando baseado na notificação:', data);

            const navigationRef = get().navigationRef;

            if (!navigationRef) {
                console.warn('⚠️ Referência de navegação não disponível');
                return;
            }

            setTimeout(() => {
                try {
                    const { type, productId, couponId, screen } = data;

                    if (screen === 'ProductDetails' && productId) {
                        navigationRef.navigate('ProductDetails', { id: productId });
                    } else if (screen === 'CouponDetails' && couponId) {
                        navigationRef.navigate('CouponDetails', { id: couponId });
                    } else if (type === 'new_product' && productId) {
                        navigationRef.navigate('ProductDetails', { id: productId });
                    } else if (type === 'new_coupon' && couponId) {
                        navigationRef.navigate('CouponDetails', { id: couponId });
                    } else if (type === 'price_drop' && productId) {
                        navigationRef.navigate('ProductDetails', { id: productId });
                    } else {
                        navigationRef.navigate('Main', { screen: 'Home' });
                    }
                } catch (navError) {
                    console.error('❌ FCM: Erro ao navegar:', navError);
                }
            }, 500);
        } catch (error) {
            console.error('❌ FCM: Erro ao processar navegação:', error);
        }
    },

    // Tracking de notificação aberta
    trackNotificationOpened: async (data) => {
        try {
            const { type, productId, couponId } = data;
            console.log('📊 FCM: Tracking notificação aberta:', { type, productId, couponId });
            // Aqui você pode enviar para analytics: await api.post('/notifications/track-opened', { type, productId, couponId });
        } catch (error) {
            console.error('❌ FCM: Erro ao enviar tracking:', error);
        }
    },
}));
