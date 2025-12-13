import { create } from 'zustand';
import api from '../services/api';
import storage from '../services/storage';
import { loginWithGoogle, loginWithFacebook } from '../services/authSocial';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  // Inicializar (carregar do storage)
  initialize: async () => {
    try {
      const token = await storage.getToken();
      const user = await storage.getUser();

      if (token && user) {
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Erro ao inicializar auth:', error);
      set({ isLoading: false });
    }
  },

  // Login
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, token, refreshToken } = response.data.data;

      await storage.setToken(token);
      await storage.setRefreshToken(refreshToken);
      await storage.setUser(user);

      set({ user, token, isAuthenticated: true });
      return { success: true };
    } catch (error) {
      console.error('Erro no login:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao fazer login',
      };
    }
  },

  // Registro
  register: async (name, email, password) => {
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { user, token, refreshToken } = response.data.data;

      await storage.setToken(token);
      await storage.setRefreshToken(refreshToken);
      await storage.setUser(user);

      set({ user, token, isAuthenticated: true });
      return { success: true };
    } catch (error) {
      console.error('Erro no registro:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao criar conta',
      };
    }
  },

  // Login com Google
  loginWithGoogle: async () => {
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        set({ 
          user: result.user, 
          token: result.token, 
          isAuthenticated: true 
        });
      }
      return result;
    } catch (error) {
      console.error('Erro no login Google:', error);
      return {
        success: false,
        error: error.message || 'Erro ao fazer login com Google',
      };
    }
  },

  // Login com Facebook
  loginWithFacebook: async () => {
    try {
      const result = await loginWithFacebook();
      if (result.success) {
        set({ 
          user: result.user, 
          token: result.token, 
          isAuthenticated: true 
        });
      }
      return result;
    } catch (error) {
      console.error('Erro no login Facebook:', error);
      return {
        success: false,
        error: error.message || 'Erro ao fazer login com Facebook',
      };
    }
  },

  // Logout
  logout: async () => {
    try {
      await storage.clearAll();
      set({ user: null, token: null, isAuthenticated: false });
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  },

  // Atualizar usuário
  updateUser: async (updates) => {
    try {
      const response = await api.put('/users/me', updates);
      const updatedUser = response.data.data;

      await storage.setUser(updatedUser);
      set({ user: updatedUser });

      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao atualizar perfil',
      };
    }
  },

  // Registrar token de notificação
  registerPushToken: async (pushToken) => {
    try {
      await api.post('/users/push-token', { token: pushToken });
      
      const user = get().user;
      if (user) {
        const updatedUser = { ...user, push_token: pushToken };
        await storage.setUser(updatedUser);
        set({ user: updatedUser });
      }
    } catch (error) {
      console.error('Erro ao registrar push token:', error);
    }
  },
}));
