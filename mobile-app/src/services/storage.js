import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: '@mtw_token',
  REFRESH_TOKEN: '@mtw_refresh_token',
  USER: '@mtw_user',
  FAVORITES: '@mtw_favorites',
};

class StorageService {
  // Token
  async setToken(token) {
    try {
      await AsyncStorage.setItem(KEYS.TOKEN, token);
    } catch (error) {
      console.error('Erro ao salvar token:', error);
    }
  }

  async getToken() {
    try {
      return await AsyncStorage.getItem(KEYS.TOKEN);
    } catch (error) {
      console.error('Erro ao buscar token:', error);
      return null;
    }
  }

  async removeToken() {
    try {
      await AsyncStorage.removeItem(KEYS.TOKEN);
    } catch (error) {
      console.error('Erro ao remover token:', error);
    }
  }

  // Refresh Token
  async setRefreshToken(token) {
    try {
      await AsyncStorage.setItem(KEYS.REFRESH_TOKEN, token);
    } catch (error) {
      console.error('Erro ao salvar refresh token:', error);
    }
  }

  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Erro ao buscar refresh token:', error);
      return null;
    }
  }

  // User
  async setUser(user) {
    try {
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    }
  }

  async getUser() {
    try {
      const user = await AsyncStorage.getItem(KEYS.USER);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return null;
    }
  }

  async removeUser() {
    try {
      await AsyncStorage.removeItem(KEYS.USER);
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
    }
  }

  // Favorites (cache local)
  async setFavorites(favorites) {
    try {
      await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(favorites));
    } catch (error) {
      console.error('Erro ao salvar favoritos:', error);
    }
  }

  async getFavorites() {
    try {
      const favorites = await AsyncStorage.getItem(KEYS.FAVORITES);
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error('Erro ao buscar favoritos:', error);
      return [];
    }
  }

  // Clear all
  async clearAll() {
    try {
      await AsyncStorage.multiRemove([
        KEYS.TOKEN,
        KEYS.REFRESH_TOKEN,
        KEYS.USER,
        KEYS.FAVORITES,
      ]);
    } catch (error) {
      console.error('Erro ao limpar storage:', error);
    }
  }
}

export default new StorageService();
