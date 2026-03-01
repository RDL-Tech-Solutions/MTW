import { create } from 'zustand';
import api from '../services/api';
import storage from '../services/storage';

/**
 * Store de Preferências de Notificação
 * 
 * Gerencia apenas as preferências do usuário.
 * Notificações push são gerenciadas pelo OneSignal (oneSignalStore.js)
 */
export const useNotificationStore = create((set, get) => ({
  preferences: null,
  isLoading: false,

  // Inicializar
  initialize: async () => {
    try {
      // Carregar preferências do cache
      const cachedPrefs = await storage.getNotificationPreferences();
      if (cachedPrefs) {
        set({ preferences: cachedPrefs });
      }

      // Buscar do backend
      try {
        await get().fetchPreferences();
      } catch (error) {
        console.error('Erro ao buscar preferências:', error);
      }
    } catch (error) {
      console.error('Erro ao inicializar preferências de notificação:', error);
    }
  },

  // Buscar preferências
  fetchPreferences: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get('/notification-preferences');
      const preferences = response.data.data;

      if (preferences) {
        set({ preferences });
        await storage.setNotificationPreferences(preferences);
      }
    } catch (error) {
      console.error('Erro ao buscar preferências:', error);
      // Se não existir, criar com valores padrão
      if (error.response?.status === 404) {
        const defaultPrefs = {
          push_enabled: true,
          email_enabled: false,
          category_preferences: [],
          keyword_preferences: [],
          product_name_preferences: [],
          home_filters: {
            platforms: [],
            categories: [],
            min_discount: 0,
            max_price: null,
            only_with_coupon: false,
          },
        };
        await get().updatePreferences(defaultPrefs);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  // Atualizar preferências
  updatePreferences: async (updates) => {
    try {
      set({ isLoading: true });
      
      const response = await api.put('/notification-preferences', updates);
      
      const preferences = response.data.data;

      set({ preferences });
      await storage.setNotificationPreferences(preferences);

      console.log('✅ Preferências atualizadas com sucesso');

      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao atualizar preferências:', error);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    } finally {
      set({ isLoading: false });
    }
  },

  // Adicionar categoria às preferências
  addCategory: async (categoryId) => {
    const { preferences } = get();
    if (!preferences) return;

    const categories = [...(preferences.category_preferences || [])];
    if (!categories.includes(categoryId)) {
      categories.push(categoryId);
      await get().updatePreferences({
        ...preferences,
        category_preferences: categories,
      });
    }
  },

  // Remover categoria das preferências
  removeCategory: async (categoryId) => {
    const { preferences } = get();
    if (!preferences) return;

    const categories = (preferences.category_preferences || []).filter(
      id => id !== categoryId
    );
    await get().updatePreferences({
      ...preferences,
      category_preferences: categories,
    });
  },

  // Adicionar palavra-chave
  addKeyword: async (keyword) => {
    const { preferences } = get();
    if (!preferences) return;

    const keywords = [...(preferences.keyword_preferences || [])];
    if (!keywords.includes(keyword.toLowerCase())) {
      keywords.push(keyword.toLowerCase());
      await get().updatePreferences({
        ...preferences,
        keyword_preferences: keywords,
      });
    }
  },

  // Remover palavra-chave
  removeKeyword: async (keyword) => {
    const { preferences } = get();
    if (!preferences) return;

    const keywords = (preferences.keyword_preferences || []).filter(
      k => k.toLowerCase() !== keyword.toLowerCase()
    );
    await get().updatePreferences({
      ...preferences,
      keyword_preferences: keywords,
    });
  },

  // Adicionar nome de produto
  addProductName: async (productName) => {
    const { preferences } = get();
    if (!preferences) return;

    const productNames = [...(preferences.product_name_preferences || [])];
    if (!productNames.includes(productName)) {
      productNames.push(productName);
      await get().updatePreferences({
        ...preferences,
        product_name_preferences: productNames,
      });
    }
  },

  // Remover nome de produto
  removeProductName: async (productName) => {
    const { preferences } = get();
    if (!preferences) return;

    const productNames = (preferences.product_name_preferences || []).filter(
      pn => pn !== productName
    );
    await get().updatePreferences({
      ...preferences,
      product_name_preferences: productNames,
    });
  },
}));
