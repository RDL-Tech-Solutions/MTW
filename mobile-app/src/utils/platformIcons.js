/**
 * Ícones oficiais das plataformas
 * Usa componentes de ícone do Expo/Ionicons para melhor qualidade
 */

import { Ionicons } from '@expo/vector-icons';

/**
 * Obter ícone da plataforma
 * @param {string} platform - Nome da plataforma
 * @param {number} size - Tamanho do ícone
 * @param {string} color - Cor do ícone
 * @returns {JSX.Element} Componente de ícone
 */
export const getPlatformIcon = (platform, size = 24, color = '#000') => {
  switch (platform?.toLowerCase()) {
    case 'mercadolivre':
      // Mercado Livre - usar ícone de carrinho de compras amarelo
      return <Ionicons name="cart" size={size} color="#FFE600" />;
    
    case 'shopee':
      // Shopee - usar ícone de loja laranja
      return <Ionicons name="storefront" size={size} color="#EE4D2D" />;
    
    case 'amazon':
      // Amazon - usar ícone de caixa azul
      return <Ionicons name="cube" size={size} color="#FF9900" />;
    
    case 'aliexpress':
      // AliExpress - usar ícone de globo vermelho
      return <Ionicons name="globe" size={size} color="#FF4747" />;
    
    default:
      // Ícone padrão
      return <Ionicons name="gift" size={size} color={color} />;
  }
};

/**
 * Obter cor da plataforma
 * @param {string} platform - Nome da plataforma
 * @returns {string} Cor hexadecimal
 */
export const getPlatformColor = (platform) => {
  switch (platform?.toLowerCase()) {
    case 'mercadolivre':
      return '#FFE600';
    case 'shopee':
      return '#EE4D2D';
    case 'amazon':
      return '#FF9900';
    case 'aliexpress':
      return '#FF4747';
    default:
      return '#666';
  }
};

/**
 * Obter nome da plataforma formatado
 * @param {string} platform - Nome da plataforma
 * @returns {string} Nome formatado
 */
export const getPlatformName = (platform) => {
  switch (platform?.toLowerCase()) {
    case 'mercadolivre':
      return 'Mercado Livre';
    case 'shopee':
      return 'Shopee';
    case 'amazon':
      return 'Amazon';
    case 'aliexpress':
      return 'AliExpress';
    default:
      return 'Geral';
  }
};

export default {
  getPlatformIcon,
  getPlatformColor,
  getPlatformName,
};

