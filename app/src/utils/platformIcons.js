/**
 * Platform icons — styled letter badges for reliability & professional look.
 * No external CDN dependencies, works 100% offline.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ── Platform config ─────────────────────────────────────────
const PLATFORM_CONFIG = {
  mercadolivre: {
    name: 'Mercado Livre',
    short: 'ML',
    color: '#2D3277',
    bgColor: '#FFE600',
    iconName: 'pricetag',
  },
  shopee: {
    name: 'Shopee',
    short: 'S',
    color: '#fff',
    bgColor: '#EE4D2D',
    iconName: 'bag-handle',
  },
  amazon: {
    name: 'Amazon',
    short: 'a',
    color: '#FF9900',
    bgColor: '#232F3E',
    iconName: 'cart',
    useSmile: true,
  },
  aliexpress: {
    name: 'AliExpress',
    short: 'Ali',
    color: '#fff',
    bgColor: '#E43225',
    iconName: 'flame',
  },
  kabum: {
    name: 'Kabum',
    short: 'K',
    color: '#fff',
    bgColor: '#FF6500',
    iconName: 'flash',
  },
  magazineluiza: {
    name: 'Magazine Luiza',
    short: 'M',
    color: '#fff',
    bgColor: '#0086FF',
    iconName: 'storefront',
  },
  pichau: {
    name: 'Pichau',
    short: 'P',
    color: '#fff',
    bgColor: '#FF6600',
    iconName: 'hardware-chip',
  },
};

// ── Exported maps ─────────────────────────────────────────
export const PLATFORM_LOGOS = Object.fromEntries(
  Object.entries(PLATFORM_CONFIG).map(([k]) => [k, null])
);

const PLATFORM_COLORS_MAP = Object.fromEntries(
  Object.entries(PLATFORM_CONFIG).map(([k, v]) => [k, v.bgColor])
);

const PLATFORM_NAMES = Object.fromEntries(
  Object.entries(PLATFORM_CONFIG).map(([k, v]) => [k, v.name])
);

export const getPlatformColor = (platform) =>
  PLATFORM_CONFIG[platform?.toLowerCase()]?.bgColor || '#666';

export const getPlatformName = (platform) =>
  PLATFORM_CONFIG[platform?.toLowerCase()]?.name || 'Geral';

export const getPlatformLogo = () => null;

/**
 * PlatformIcon — quadrado levemente arredondado
 */
export const PlatformIcon = ({ platform, size = 24, color: fallbackColor = '#000' }) => {
  const key = platform?.toLowerCase();
  const config = PLATFORM_CONFIG[key];

  if (!config) {
    return <Ionicons name="gift" size={size} color={fallbackColor} />;
  }

  const fontSize =
    config.short.length > 2
      ? size * 0.5
      : size * 0.65;

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size * 0.2, // leve arredondamento
      backgroundColor: config.bgColor,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Text style={{
        color: config.color,
        fontSize,
        lineHeight: fontSize,
        fontWeight: '900',
        letterSpacing: -0.5,
        includeFontPadding: false,
      }}>
        {config.short}
      </Text>
    </View>
  );
};

export const getPlatformIcon = (platform, size = 24, color = '#000') => {
  return <PlatformIcon platform={platform} size={size} color={color} />;
};

/**
 * PlatformLogoBadge — círculo verdadeiro, sem camada interna
 */
export const PlatformLogoBadge = ({ platform, size = 40 }) => {
  const key = platform?.toLowerCase();
  const config = PLATFORM_CONFIG[key];

  if (!config) {
    const isAll = key === 'all';
    return (
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Ionicons
          name={isAll ? 'apps' : 'basket-outline'}
          size={size * 0.5}
          color="#777"
        />
      </View>
    );
  }

  const fontSize =
    config.short.length > 2
      ? size * 0.45
      : size * 0.6;

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2, // círculo matematicamente correto
      backgroundColor: config.bgColor,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: config.bgColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    }}>
      <Text style={{
        color: config.color,
        fontSize,
        lineHeight: fontSize,
        fontWeight: '900',
        letterSpacing: -0.5,
        includeFontPadding: false,
      }}>
        {config.short}
      </Text>
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default {
  getPlatformIcon,
  getPlatformLogo,
  getPlatformColor,
  getPlatformName,
  PlatformLogoBadge,
  PlatformIcon,
  PLATFORM_LOGOS,
};
