/**
 * Configuração da API
 * 
 * Este arquivo centraliza a configuração da URL da API
 * para evitar problemas com expo-constants e import.meta
 */

import { Platform } from 'react-native';

// Configuração da URL da API
// Ajuste conforme necessário para seu ambiente

const API_CONFIG = {
  // Web - usar localhost
  web: 'http://localhost:3000/api',

  // Mobile - usar IP da sua máquina na rede local
  // IMPORTANTE: Altere este IP para o IP da sua máquina
  mobile: 'http://192.168.7.8:3000/api',

  // Produção (quando estiver em produção)
  production: 'https://api.seudominio.com/api',
};

/**
 * Obter URL da API baseado na plataforma
 */
export function getApiUrl() {
  // Verificar se está em produção (ajuste conforme necessário)
  const isProduction = false; // Altere para true em produção

  if (isProduction) {
    return API_CONFIG.production;
  }

  // Retornar URL baseado na plataforma
  return Platform.OS === 'web'
    ? API_CONFIG.web
    : API_CONFIG.mobile;
}

// Exportar função e valor default
export default getApiUrl;

