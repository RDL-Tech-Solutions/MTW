import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import api from './api';
import storage from './storage';
import { Platform } from 'react-native';

// Completar autenticação web
WebBrowser.maybeCompleteAuthSession();

// Web Client ID do Google Cloud Console (usado para validação no backend)
const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID || 'YOUR_WEB_CLIENT_ID';

// Expo Client ID (gerado automaticamente pelo Expo)
const GOOGLE_EXPO_CLIENT_ID = process.env.GOOGLE_EXPO_CLIENT_ID || GOOGLE_WEB_CLIENT_ID;

const redirectUri = makeRedirectUri({
  scheme: 'precocerto',
  path: 'auth/google',
});

console.log('🔗 [Google OAuth Config] Redirect URI:', redirectUri);
console.log('🔗 [Google OAuth Config] Platform:', Platform.OS);

/**
 * Login com Google usando expo-auth-session
 * Retorna um objeto com request, response e promptAsync para uso em componentes
 */
export function useGoogleAuth() {
  return Google.useAuthRequest({
    expoClientId: GOOGLE_EXPO_CLIENT_ID,
    iosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
    redirectUri,
  });
}

/**
 * Processar resposta do Google Auth
 */
export async function processGoogleAuthResponse(response) {
  try {
    console.log('📱 [App Google Auth] Processando resposta');
    console.log('   Type:', response?.type);

    if (response?.type === 'success') {
      console.log('✅ [App Google Auth] Autenticação bem-sucedida');

      const { authentication } = response;
      const idToken = authentication?.idToken;
      const accessToken = authentication?.accessToken;

      if (!idToken) {
        throw new Error('Token ID não recebido do Google');
      }

      console.log('🔑 [App Google Auth] Token ID recebido');

      // Enviar token para backend verificar
      return await processGoogleToken(idToken);
    } else if (response?.type === 'cancel') {
      console.log('⚠️ [App Google Auth] Usuário cancelou');
      return {
        success: false,
        error: 'Autenticação cancelada',
      };
    } else if (response?.type === 'error') {
      console.error('❌ [App Google Auth] Erro:', response.error);
      throw new Error(response.error?.message || 'Erro na autenticação');
    }

    return {
      success: false,
      error: 'Resposta inválida do Google',
    };
  } catch (error) {
    console.error('❌ [App Google Auth] Erro:', error);
    return {
      success: false,
      error: error.message || 'Erro ao processar autenticação',
    };
  }
}

/**
 * Processar token do Google
 * Envia token para backend verificar e criar/atualizar usuário
 */
async function processGoogleToken(idToken) {
  try {
    console.log('🔄 [App Google Auth] Enviando token para backend');

    const response = await api.post('/auth/google', {
      idToken,
    });

    console.log('📦 [App Google Auth] Resposta do backend recebida');
    console.log('   Success:', response.data.success);

    if (response.data.success && response.data.data) {
      const { user, token, refreshToken } = response.data.data;

      console.log('✅ [App Google Auth] Tokens recebidos');
      console.log('   User ID:', user.id);
      console.log('   Email:', user.email);

      // Salvar tokens
      await storage.setToken(token);
      await storage.setRefreshToken(refreshToken);
      await storage.setUser(user);

      // Configurar header de autorização
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      console.log('✅ [App Google Auth] Login concluído com sucesso');

      return {
        success: true,
        user,
        token,
        refreshToken,
      };
    }

    console.error('❌ [App Google Auth] Resposta inválida do backend');
    throw new Error('Falha ao processar autenticação');
  } catch (error) {
    console.error('❌ [App Google Auth] Erro ao processar token:', error);
    console.error('   Mensagem:', error.message);
    console.error('   Response:', error.response?.data);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Erro ao processar autenticação',
    };
  }
}

