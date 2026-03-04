import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

// ========== FIREBASE BACKGROUND MESSAGE HANDLER ==========
// IMPORTANTE: Deve ser registrado ANTES de registerRootComponent
// Este handler processa notificações quando o app está em background ou fechado
try {
  const messaging = require('@react-native-firebase/messaging').default;
  
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('🔔 FCM Background: Notificação recebida em background', remoteMessage);
    
    // Aqui você pode processar a notificação em background
    // Por exemplo: salvar no AsyncStorage, atualizar badge, etc.
    
    // NOTA: Não faça operações pesadas aqui, pois o sistema pode matar o processo
    // O Android já exibe a notificação automaticamente
    
    return Promise.resolve();
  });
  
  console.log('✅ FCM Background Handler registrado');
} catch (error) {
  console.log('⚠️ Firebase Messaging não disponível (Expo Go). Use development build.');
}
// ========================================================

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
