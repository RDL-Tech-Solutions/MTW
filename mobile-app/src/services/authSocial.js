import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import api from './api';
import storage from './storage';
import { Platform } from 'react-native';

// Completar autenticação web
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

// URL de redirect para OAuth
const redirectTo = AuthSession.makeRedirectUri({
  scheme: 'precocerto',
  useProxy: true,
});

/**
 * Login com Google
 * Usa backend para OAuth - não expõe credenciais no app
 */
export async function loginWithGoogle() {
  try {
    // Obter URL de OAuth do backend
    const response = await api.post('/auth/social/url', {
      provider: 'google',
      redirect_url: redirectTo,
    });

    const { url: oauthUrl } = response.data.data;

    if (!oauthUrl) {
      throw new Error('URL de autenticação não retornada');
    }

    // Abrir URL de autenticação
    if (Platform.OS === 'web') {
      // Web: redirecionar
      window.location.href = oauthUrl;
      return { success: false, error: 'Redirecionando...' };
    } else {
      // Mobile: usar WebBrowser
      const result = await WebBrowser.openAuthSessionAsync(
        oauthUrl,
        redirectTo
      );

      if (result.type === 'success') {
        // Extrair código da URL
        const url = new URL(result.url);
        const code = url.searchParams.get('code');

        if (code) {
          // Enviar código para backend processar
          return await processOAuthCallback(code, 'google');
        }
      }
    }

    throw new Error('Falha na autenticação Google');
  } catch (error) {
    console.error('Erro no login Google:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Erro ao fazer login com Google',
    };
  }
}

/**
 * Login com Facebook
 * Usa backend para OAuth - não expõe credenciais no app
 */
export async function loginWithFacebook() {
  try {
    // Obter URL de OAuth do backend
    const response = await api.post('/auth/social/url', {
      provider: 'facebook',
      redirect_url: redirectTo,
    });

    const { url: oauthUrl } = response.data.data;

    if (!oauthUrl) {
      throw new Error('URL de autenticação não retornada');
    }

    // Abrir URL de autenticação
    if (Platform.OS === 'web') {
      // Web: redirecionar
      window.location.href = oauthUrl;
      return { success: false, error: 'Redirecionando...' };
    } else {
      // Mobile: usar WebBrowser
      const result = await WebBrowser.openAuthSessionAsync(
        oauthUrl,
        redirectTo
      );

      if (result.type === 'success') {
        // Extrair código da URL
        const url = new URL(result.url);
        const code = url.searchParams.get('code');

        if (code) {
          // Enviar código para backend processar
          return await processOAuthCallback(code, 'facebook');
        }
      }
    }

    throw new Error('Falha na autenticação Facebook');
  } catch (error) {
    console.error('Erro no login Facebook:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Erro ao fazer login com Facebook',
    };
  }
}

/**
 * Processar callback OAuth
 * Envia código para backend que processa com Supabase
 */
async function processOAuthCallback(code, provider) {
  try {
    // Backend processa o código e retorna tokens via POST
    const response = await api.post('/auth/social/callback', {
      code,
      provider,
      redirect_url: redirectTo,
    });

    // Backend retorna tokens diretamente
    if (response.data.success && response.data.data) {
      const { user, token, refreshToken } = response.data.data;

      // Salvar tokens
      await storage.setToken(token);
      await storage.setRefreshToken(refreshToken);
      await storage.setUser(user);

      // Configurar header de autorização
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return {
        success: true,
        user,
        token,
        refreshToken,
      };
    }

    throw new Error('Falha ao processar callback OAuth');
  } catch (error) {
    console.error('Erro ao processar callback:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Erro ao processar autenticação',
    };
  }
}
