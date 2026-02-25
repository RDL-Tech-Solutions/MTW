/**
 * Funções auxiliares para o app
 */

/**
 * Formatar preço em reais
 */
export const formatPrice = (price) => {
  if (!price && price !== 0) return 'R$ 0,00';
  return `R$ ${price.toFixed(2).replace('.', ',')}`;
};

/**
 * Formatar porcentagem
 */
export const formatPercentage = (value) => {
  if (!value && value !== 0) return '0%';
  return `${Math.round(value)}%`;
};

/**
 * Formatar data
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '';
  
  const d = new Date(date);
  
  if (format === 'short') {
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  if (format === 'long') {
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }
  
  return d.toLocaleDateString('pt-BR');
};

/**
 * Calcular dias até expiração
 */
export const daysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Truncar texto
 */
export const truncate = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Validar email
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  return /\S+@\S+\.\S+/.test(email);
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Tratar erro da API
 */
export const handleApiError = (error) => {
  if (error.response) {
    // Erro com resposta do servidor
    return error.response.data?.error || error.response.data?.message || 'Erro no servidor';
  } else if (error.request) {
    // Erro de rede
    return 'Erro de conexão. Verifique sua internet.';
  } else {
    // Outro erro
    return error.message || 'Erro desconhecido';
  }
};

/**
 * Verificar se está online
 */
export const isOnline = () => {
  // Implementação básica - pode ser melhorada com NetInfo
  return true;
};

export default {
  formatPrice,
  formatPercentage,
  formatDate,
  daysUntilExpiry,
  truncate,
  isValidEmail,
  debounce,
  handleApiError,
  isOnline,
};

