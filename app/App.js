import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import OneSignal from 'react-native-onesignal';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import SplashScreen from './src/components/common/SplashScreen';
import { useThemeStore } from './src/theme/theme';
import { useNotificationStore } from './src/stores/notificationStore';
import { useAuthStore } from './src/stores/authStore';
import { useOneSignalStore } from './src/stores/oneSignalStore';

// Ignorar warnings específicos
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const { initialize: initializeTheme } = useThemeStore();
  const { initialize: initializePreferences } = useNotificationStore();
  const { initialize: initializeOneSignal, login: oneSignalLogin } = useOneSignalStore();
  const { isAuthenticated, user, initialize: initializeAuth } = useAuthStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Aguardar um pouco para garantir que os módulos nativos estejam prontos
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 1. Inicializar tema
        try {
          await initializeTheme();
        } catch (error) {
          console.error('Erro ao inicializar tema:', error);
        }

        // 2. Inicializar OneSignal (antes de auth para estar pronto)
        try {
          await initializeOneSignal();
        } catch (error) {
          console.error('Erro ao inicializar OneSignal:', error);
        }

        // 3. Inicializar autenticação
        try {
          await initializeAuth();
        } catch (error) {
          console.error('Erro ao inicializar auth:', error);
        }

        // 4. Inicializar preferências de notificação
        try {
          await initializePreferences();
        } catch (error) {
          console.error('Erro ao inicializar preferências:', error);
        }
        
        // Marcar como pronto
        setIsReady(true);
        
        // Simular carregamento inicial (6 segundos para completar animação do GIF)
        setTimeout(() => {
          setIsLoading(false);
        }, 6000);
      } catch (error) {
        console.error('Erro ao inicializar app:', error);
        setIsReady(true);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Registrar usuário no OneSignal após autenticação
  useEffect(() => {
    const registerOneSignal = async () => {
      if (isAuthenticated && user?.id && isReady) {
        try {
          console.log('🔐 Registrando usuário no OneSignal após autenticação');
          await oneSignalLogin(user.id);
          
          // Sincronizar preferências como tags
          try {
            const { preferences } = useNotificationStore.getState();
            if (preferences) {
              console.log('🏷️ Preferências carregadas, tags serão sincronizadas pelo backend');
            }
          } catch (error) {
            console.error('Erro ao verificar preferências:', error);
          }
        } catch (error) {
          console.error('Erro ao registrar no OneSignal:', error);
        }
      }
    };

    registerOneSignal();
  }, [isAuthenticated, user?.id, isReady]);

  if (isLoading) {
    return <SplashScreen onFinish={() => setIsLoading(false)} />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
