import { create } from 'zustand';
import api from '../services/api';
import storage from '../services/storage';
import { useOneSignalStore } from './oneSignalStore';

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
        
        // Fazer login no OneSignal se usuário estiver autenticado
        try {
          const oneSignalStore = useOneSignalStore.getState();
          await oneSignalStore.login(user.id);
        } catch (error) {
          console.error('Erro ao fazer login no OneSignal:', error);
        }
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

      // Fazer login no OneSignal
      try {
        const oneSignalStore = useOneSignalStore.getState();
        await oneSignalStore.login(user.id);
        console.log('✅ Usuário registrado no OneSignal:', user.id);
      } catch (error) {
        console.error('Erro ao registrar no OneSignal:', error);
      }

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

      // Fazer login no OneSignal
      try {
        const oneSignalStore = useOneSignalStore.getState();
        await oneSignalStore.login(user.id);
        console.log('✅ Usuário registrado no OneSignal:', user.id);
      } catch (error) {
        console.error('Erro ao registrar no OneSignal:', error);
      }

      return { success: true };
    } catch (error) {
      console.error('Erro no registro:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao criar conta',
      };
    }
  },

  // Solicitar código de recuperação de senha
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Erro ao solicitar recuperação:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao solicitar recuperação de senha',
      };
    }
  },

  // Verificar código de recuperação
  verifyResetCode: async (email, code) => {
    try {
      const response = await api.post('/auth/verify-reset-code', { email, code });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Erro ao verificar código:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Código inválido ou expirado',
      };
    }
  },

  // Redefinir senha com código
  resetPasswordWithCode: async (email, code, newPassword) => {
    try {
      const response = await api.post('/auth/reset-password', { email, code, newPassword });
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao redefinir senha',
      };
    }
  },

  // Logout
  logout: async () => {
    try {
      // Fazer logout do OneSignal
      try {
        const oneSignalStore = useOneSignalStore.getState();
        await oneSignalStore.logout();
        console.log('✅ Logout do OneSignal realizado');
      } catch (error) {
        console.error('Erro ao fazer logout do OneSignal:', error);
      }

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

  // Registrar token de notificação (mantido para compatibilidade)
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
