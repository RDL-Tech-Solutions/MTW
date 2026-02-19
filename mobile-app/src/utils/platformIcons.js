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

// ── Exported maps (keep compatibility) ──────────────────────
export const PLATFORM_LOGOS = Object.fromEntries(
  Object.entries(PLATFORM_CONFIG).map(([k, v]) => [k, null]) // no more CDN URLs
);

const PLATFORM_COLORS_MAP = Object.fromEntries(
  Object.entries(PLATFORM_CONFIG).map(([k, v]) => [k, v.bgColor])
);

const PLATFORM_NAMES = Object.fromEntries(
  Object.entries(PLATFORM_CONFIG).map(([k, v]) => [k, v.name])
);

/**
 * Get platform color
 */
export const getPlatformColor = (platform) => {
  return PLATFORM_CONFIG[platform?.toLowerCase()]?.bgColor || '#666';
};

/**
 * Get formatted platform name
 */
export const getPlatformName = (platform) => {
  return PLATFORM_CONFIG[platform?.toLowerCase()]?.name || 'Geral';
};

/**
 * Get platform logo URL — now returns null (no more CDN)
 */
export const getPlatformLogo = (platform) => {
  return null;
};

/**
 * Styled platform icon component — colored square with letter/abbreviation.
 * No network dependency, works instantly and looks premium.
 */
export const PlatformIcon = ({ platform, size = 24, color: fallbackColor = '#000' }) => {
  const key = platform?.toLowerCase();
  const config = PLATFORM_CONFIG[key];

  if (!config) {
    return <Ionicons name="gift" size={size} color={fallbackColor} />;
  }

  const fontSize = config.short.length > 2 ? size * 0.35 : size * 0.45;

  return (
    <View style={{
      width: size,
      height: size,
      backgroundColor: config.bgColor,
      borderRadius: size * 0.22,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <Text style={{
        color: config.color,
        fontSize,
        fontWeight: '900',
        letterSpacing: -0.5,
        includeFontPadding: false,
        textAlignVertical: 'center',
      }}>
        {config.short}
      </Text>
    </View>
  );
};

/**
 * Legacy function wrapper for PlatformIcon component
 */
export const getPlatformIcon = (platform, size = 24, color = '#000') => {
  return <PlatformIcon platform={platform} size={size} color={color} />;
};

/**
 * Platform logo badge — circle with styled icon, for icon rows (HomeScreen).
 * Clean, consistent, professional appearance.
 */
export const PlatformLogoBadge = ({ platform, size = 40 }) => {
  const key = platform?.toLowerCase();
  const config = PLATFORM_CONFIG[key];
  const innerSize = size * 0.65;

  if (!config) {
    const isAll = key === 'all';
    return (
      <View style={[badgeStyles.circle, {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#f3f4f6',
      }]}>
        <Ionicons
          name={isAll ? 'apps' : 'basket-outline'}
          size={size * 0.45}
          color={isAll ? '#666' : '#999'}
        />
      </View>
    );
  }

  const fontSize = config.short.length > 2 ? innerSize * 0.42 : innerSize * 0.52;

  return (
    <View style={[badgeStyles.circle, {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: '#fff',
      borderWidth: 2,
      borderColor: config.bgColor + '30',
      shadowColor: config.bgColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 2,
    }]}>
      <View style={{
        width: innerSize,
        height: innerSize,
        borderRadius: innerSize * 0.22,
        backgroundColor: config.bgColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{
          color: config.color,
          fontSize,
          fontWeight: '900',
          letterSpacing: -0.5,
          includeFontPadding: false,
          textAlignVertical: 'center',
        }}>
          {config.short}
        </Text>
      </View>
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
