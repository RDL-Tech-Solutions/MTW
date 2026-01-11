import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Utilitário seguro para obter informações da plataforma
 * Evita crashes de TurboModule/PlatformConstants
 */
export const getPlatformInfo = () => {
    try {
        return {
            OS: Platform.OS,
            Version: Platform.Version,
            isAndroid: Platform.OS === 'android',
            isIOS: Platform.OS === 'ios',
            isWeb: Platform.OS === 'web',
        };
    } catch (error) {
        console.warn('Erro ao obter info da plataforma:', error);
        // Fallback seguro
        return {
            OS: 'unknown',
            Version: 'unknown',
            isAndroid: false,
            isIOS: false,
            isWeb: true,
        };
    }
};

/**
 * Obter constantes do Expo de forma segura
 */
export const getExpoConstants = () => {
    try {
        return {
            appVersion: Constants.expoConfig?.version || '1.0.0',
            appName: Constants.expoConfig?.name || 'PreçoCerto',
            apiUrl: Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api',
        };
    } catch (error) {
        console.warn('Erro ao obter Expo constants:', error);
        return {
            appVersion: '1.0.0',
            appName: 'PreçoCerto',
            apiUrl: 'http://localhost:3000/api',
        };
    }
};

/**
 * Verificar se está em modo desenvolvimento
 */
export const isDevelopment = () => {
    try {
        return __DEV__;
    } catch {
        return true; // Padrão para dev
    }
};

export default {
    getPlatformInfo,
    getExpoConstants,
    isDevelopment,
};
