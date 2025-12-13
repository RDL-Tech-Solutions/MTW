import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const { state } = JSON.parse(authStorage);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token inválido ou expirado (401 ou 403)
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn('🔒 Token inválido ou expirado. Redirecionando para login...');
      localStorage.removeItem('auth-storage');
      localStorage.clear(); // Limpar tudo
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
