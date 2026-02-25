import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: '@mtw_token',
  REFRESH_TOKEN: '@mtw_refresh_token',
  USER: '@mtw_user',
  FAVORITES: '@mtw_favorites',
  THEME: '@mtw_theme',
  NOTIFICATION_PREFERENCES: '@mtw_notification_preferences',
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

  // Theme
  async setTheme(theme) {
    try {
      await AsyncStorage.setItem(KEYS.THEME, theme);
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  }

  async getTheme() {
    try {
      return await AsyncStorage.getItem(KEYS.THEME) || 'light';
    } catch (error) {
      console.error('Erro ao buscar tema:', error);
      return 'light';
    }
  }

  // Notification Preferences (cache local)
  async setNotificationPreferences(preferences) {
    try {
      await AsyncStorage.setItem(KEYS.NOTIFICATION_PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
    }
  }

  async getNotificationPreferences() {
    try {
      const prefs = await AsyncStorage.getItem(KEYS.NOTIFICATION_PREFERENCES);
      return prefs ? JSON.parse(prefs) : null;
    } catch (error) {
      console.error('Erro ao buscar preferências:', error);
      return null;
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
        KEYS.NOTIFICATION_PREFERENCES,
      ]);
    } catch (error) {
      console.error('Erro ao limpar storage:', error);
    }
  }
}

export default new StorageService();
