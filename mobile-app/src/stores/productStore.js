import { create } from 'zustand';
import api from '../services/api';
import storage from '../services/storage';

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
      // Construir query params corretamente
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const queryString = params.toString();
      const url = `/products${queryString ? `?${queryString}` : ''}`;
      const response = await api.get(url);
      
      // A API retorna { products: [...], total, page, limit, totalPages }
      const data = response.data.data || {};
      const products = data.products || [];
      
      set({ products, isLoading: false });
      return { 
        success: true, 
        products,
        pagination: {
          total: data.total || 0,
          page: data.page || 1,
          limit: data.limit || 20,
          totalPages: data.totalPages || 1
        }
      };
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao buscar produtos';
      set({ error: errorMessage, isLoading: false, products: [] });
      return { success: false, error: errorMessage };
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
      const response = await api.get('/favorites');
      const favorites = response.data.data || [];
      
      // Salvar no cache local
      await storage.setFavorites(favorites);
      
      set({ favorites, isLoading: false });
      return { success: true, favorites };
    } catch (error) {
      console.error('Erro ao buscar favoritos:', error);
      
      // Tentar carregar do cache local
      try {
        const cachedFavorites = await storage.getFavorites();
        set({ favorites: cachedFavorites || [], isLoading: false });
        return { success: true, favorites: cachedFavorites || [] };
      } catch (cacheError) {
        set({ favorites: [], isLoading: false });
        return { success: false, error: error.message };
      }
    }
  },

  // Adicionar favorito
  addFavorite: async (productId) => {
    try {
      await api.post(`/favorites/${productId}`);
      
      // Buscar produto completo se não estiver na lista
      let product = get().products.find(p => p.id === productId);
      
      if (!product) {
        const productResult = await get().fetchProductById(productId);
        if (productResult.success) {
          product = productResult.product;
        }
      }
      
      // Atualizar lista local
      const favorites = get().favorites;
      if (product && !favorites.find(f => f.id === productId)) {
        const updatedFavorites = [...favorites, product];
        set({ favorites: updatedFavorites });
        
        // Salvar no cache
        await storage.setFavorites(updatedFavorites);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao adicionar favorito:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Erro ao adicionar favorito' 
      };
    }
  },

  // Remover favorito
  removeFavorite: async (productId) => {
    try {
      await api.delete(`/favorites/${productId}`);
      
      // Atualizar lista local
      const favorites = get().favorites.filter(f => f.id !== productId);
      set({ favorites });
      
      // Salvar no cache
      await storage.setFavorites(favorites);
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
      
      // Remover localmente mesmo se a API falhar
      const favorites = get().favorites.filter(f => f.id !== productId);
      set({ favorites });
      
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Erro ao remover favorito' 
      };
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
      // Não bloquear a UI, fazer em background
      api.post(`/products/${productId}/click`).catch(err => {
        console.error('Erro ao registrar clique:', err);
      });
    } catch (error) {
      console.error('Erro ao registrar clique:', error);
    }
  },
  
  // Buscar cupons
  fetchCoupons: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const queryString = params.toString();
      const url = `/coupons${queryString ? `?${queryString}` : ''}`;
      const response = await api.get(url);
      
      const data = response.data.data || {};
      const coupons = Array.isArray(data) ? data : (data.coupons || []);
      
      return { success: true, coupons };
    } catch (error) {
      console.error('Erro ao buscar cupons:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Erro ao buscar cupons' 
      };
    }
  },
  
  // Buscar cupom por ID
  fetchCouponById: async (id) => {
    try {
      const response = await api.get(`/coupons/${id}`);
      return { success: true, coupon: response.data.data };
    } catch (error) {
      console.error('Erro ao buscar cupom:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Erro ao buscar cupom' 
      };
    }
  },
}));
