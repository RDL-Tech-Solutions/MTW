import { create } from 'zustand';
import api from '../services/api';

export const useProductStore = create((set, get) => ({
  products: [],
  categories: [],
  favorites: [],
  isLoading: false,
  error: null,

  // Buscar produtos
  fetchProducts: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/products?${params}`);
      const products = response.data.data.products || [];
      
      set({ products, isLoading: false });
      return { success: true, products };
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  // Buscar produto por ID
  fetchProductById: async (id) => {
    try {
      const response = await api.get(`/products/${id}`);
      return { success: true, product: response.data.data };
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      return { success: false, error: error.message };
    }
  },

  // Buscar categorias
  fetchCategories: async () => {
    try {
      const response = await api.get('/categories');
      const categories = response.data.data || [];
      
      set({ categories });
      return { success: true, categories };
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      return { success: false, error: error.message };
    }
  },

  // Buscar favoritos
  fetchFavorites: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/users/favorites');
      const favorites = response.data.data || [];
      
      set({ favorites, isLoading: false });
      return { success: true, favorites };
    } catch (error) {
      console.error('Erro ao buscar favoritos:', error);
      set({ isLoading: false });
      return { success: false, error: error.message };
    }
  },

  // Adicionar favorito
  addFavorite: async (productId) => {
    try {
      await api.post(`/users/favorites/${productId}`);
      
      // Atualizar lista local
      const favorites = get().favorites;
      const products = get().products;
      const product = products.find(p => p.id === productId);
      
      if (product) {
        set({ favorites: [...favorites, product] });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao adicionar favorito:', error);
      return { success: false, error: error.message };
    }
  },

  // Remover favorito
  removeFavorite: async (productId) => {
    try {
      await api.delete(`/users/favorites/${productId}`);
      
      // Atualizar lista local
      const favorites = get().favorites.filter(f => f.id !== productId);
      set({ favorites });
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
      return { success: false, error: error.message };
    }
  },

  // Verificar se é favorito
  isFavorite: (productId) => {
    const favorites = get().favorites;
    return favorites.some(f => f.id === productId);
  },

  // Registrar clique no produto
  registerClick: async (productId) => {
    try {
      await api.post(`/products/${productId}/click`);
    } catch (error) {
      console.error('Erro ao registrar clique:', error);
    }
  },
}));
