import { create } from 'zustand';
import storage from '../services/storage';
import api from '../services/api';

// Cores para tema claro
export const lightColors = {
  // Cores principais
  primary: '#DC2626',
  primaryDark: '#B91C1C',
  primaryLight: '#EF4444',

  secondary: '#000000',
  secondaryLight: '#1F2937',

  accent: '#EF4444',

  // Backgrounds
  background: '#F9FAFB',
  backgroundDark: '#111827',
  card: '#FFFFFF',
  cardDark: '#1F2937',

  // Textos
  text: '#111827',
  textLight: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Bordas
  border: '#E5E7EB',
  borderDark: '#374151',

  // Estados
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Transparências
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',

  // Gradientes
  gradients: {
    primary: ['#DC2626', '#B91C1C'],
    success: ['#10B981', '#059669'],
    warning: ['#F59E0B', '#D97706'],
    info: ['#3B82F6', '#2563EB'],
    dark: ['#1F2937', '#111827'],
    purple: ['#8B5CF6', '#7C3AED'],
  },

  // Cores de ícones por categoria
  iconColors: {
    notifications: '#3B82F6',
    appearance: '#8B5CF6',
    products: '#10B981',
    account: '#F59E0B',
    about: '#6B7280',
    settings: '#DC2626',
  },
};

// Cores para tema escuro
export const darkColors = {
  // Cores principais (mantém as mesmas)
  primary: '#EF4444',
  primaryDark: '#DC2626',
  primaryLight: '#F87171',

  secondary: '#FFFFFF',
  secondaryLight: '#E5E7EB',

  accent: '#EF4444',

  // Backgrounds
  background: '#111827',
  backgroundDark: '#0F172A',
  card: '#1F2937',
  cardDark: '#374151',

  // Textos
  text: '#F9FAFB',
  textLight: '#D1D5DB',
  textMuted: '#9CA3AF',
  textInverse: '#111827',

  // Bordas
  border: '#374151',
  borderDark: '#4B5563',

  // Estados (mantém as mesmas)
  success: '#10B981',
  successLight: '#065F46',
  warning: '#F59E0B',
  warningLight: '#78350F',
  error: '#EF4444',
  errorLight: '#7F1D1D',
  info: '#3B82F6',
  infoLight: '#1E3A8A',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',

  // Transparências
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',

  // Gradientes
  gradients: {
    primary: ['#EF4444', '#DC2626'],
    success: ['#10B981', '#059669'],
    warning: ['#F59E0B', '#D97706'],
    info: ['#3B82F6', '#2563EB'],
    dark: ['#374151', '#1F2937'],
    purple: ['#A78BFA', '#8B5CF6'],
  },

  // Cores de ícones por categoria
  iconColors: {
    notifications: '#60A5FA',
    appearance: '#A78BFA',
    products: '#34D399',
    account: '#FBBF24',
    about: '#9CA3AF',
    settings: '#F87171',
  },
};

export const useThemeStore = create((set, get) => ({
  isDark: false,
  colors: lightColors,

  // Inicializar tema
  initialize: async () => {
    try {
      const savedTheme = await storage.getTheme();
      const isDark = savedTheme === 'dark';
      set({
        isDark,
        colors: isDark ? darkColors : lightColors
      });
    } catch (error) {
      console.error('Erro ao carregar tema:', error);
    }
  },

  // Alternar tema
  toggleTheme: async () => {
    const { isDark } = get();
    const newIsDark = !isDark;

    try {
      await storage.setTheme(newIsDark ? 'dark' : 'light');

      // Atualizar no backend se usuário estiver logado
      try {
        await api.put('/notification-preferences/theme', { dark_mode: newIsDark });
      } catch (error) {
        console.error('Erro ao atualizar tema no backend:', error);
      }

      set({
        isDark: newIsDark,
        colors: newIsDark ? darkColors : lightColors
      });
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  },

  // Definir tema
  setTheme: async (isDark) => {
    try {
      await storage.setTheme(isDark ? 'dark' : 'light');

      // Atualizar no backend se usuário estiver logado
      try {
        await api.put('/notification-preferences/theme', { dark_mode: isDark });
      } catch (error) {
        console.error('Erro ao atualizar tema no backend:', error);
      }

      set({
        isDark,
        colors: isDark ? darkColors : lightColors
      });
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  },
}));

// Exportar cores padrão (tema claro) para compatibilidade
export default lightColors;

