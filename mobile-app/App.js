import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import SplashScreen from './src/components/common/SplashScreen';
import { useThemeStore } from './src/theme/theme';
import { useNotificationStore } from './src/stores/notificationStore';
import { useAuthStore } from './src/stores/authStore';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const { initialize: initializeTheme } = useThemeStore();
  const { initialize: initializeNotifications } = useNotificationStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Aguardar um pouco para garantir que os módulos nativos estejam prontos
        // Isso é especialmente importante para evitar erros de PlatformConstants
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Inicializar tema
        try {
          await initializeTheme();
        } catch (error) {
          console.error('Erro ao inicializar tema:', error);
        }
        
        // Marcar como pronto
        setIsReady(true);
        
        // Inicializar notificações se autenticado (após um delay maior para garantir que tudo está pronto)
        if (isAuthenticated) {
          setTimeout(() => {
            initializeNotifications().catch(err => {
              // Silenciar erros de VAPID no web e PlatformConstants
              if (err.message?.includes('vapidPublicKey') || err.message?.includes('PlatformConstants')) {
                console.log('Push notifications não disponíveis nesta plataforma');
              } else {
                console.error('Erro ao inicializar notificações:', err);
              }
            });
          }, 1000);
        }
        
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
  }, [isAuthenticated]);

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
