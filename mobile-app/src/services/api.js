import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// URL da API - ajuste conforme necessário
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@mtw_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Erro ao buscar token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token inválido ou expirado
      await AsyncStorage.removeItem('@mtw_token');
      await AsyncStorage.removeItem('@mtw_user');
      // Aqui você pode redirecionar para login
    }
    return Promise.reject(error);
  }
);

export default api;
