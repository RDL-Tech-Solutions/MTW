import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, Animated, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';
import PlatformBadge from './PlatformBadge';
import { PlatformIcon, getPlatformColor } from '../../utils/platformIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 8;
const GRID_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

export default function ProductCard({ product, onPress, onFavoritePress, isFavorite, index = 0, isGrid = false }) {
  const { colors } = useThemeStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: Math.min(index * 40, 400),
      useNativeDriver: true,
    }).start();
  }, [index]);

  const formatPrice = (price) => {
    const num = parseFloat(price);
    const intPart = Math.floor(num);
    const centPart = Math.round((num - intPart) * 100).toString().padStart(2, '0');
    return { intPart: intPart.toLocaleString('pt-BR'), centPart };
  };

  const handlePress = () => {
    if (onPress) {
      onPress(product);
    } else if (product.affiliate_link) {
      Linking.openURL(product.affiliate_link);
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { 
      toValue: 0.96, 
      friction: 5,
      tension: 100,
      useNativeDriver: true 
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { 
      toValue: 1, 
      friction: 5,
      tension: 100,
      useNativeDriver: true 
    }).start();
  };

  const discount = product.discount_percentage ||
    (product.old_price && product.old_price > product.current_price
      ? Math.round(((product.old_price - product.current_price) / product.old_price) * 100)
      : 0);

  const currentPrice = formatPrice(product.current_price);

  // Pegar o primeiro cupom disponível (se houver)
  const availableCoupon = product.coupons && product.coupons.length > 0 
    ? product.coupons[0] 
    : null;
  const couponCode = availableCoupon?.code || product.coupon_code;

  const s = isGrid ? gridStyles(colors) : listStyles(colors);

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        isGrid && { width: CARD_WIDTH },
      ]}
    >
      <TouchableOpacity
        style={s.card}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Image */}
        <View style={s.imageContainer}>
          <Image
            source={{ uri: product.image_url }}
            style={s.image}
            resizeMode="cover"
          />
          
          {/* Discount badge on image */}
          {discount > 0 && (
            <View style={s.discountBadge}>
              <Text style={s.discountBadgeText}>{discount}%</Text>
            </View>
          )}
          
          {/* Favorite button */}
          {onFavoritePress && (
            <TouchableOpacity
              style={s.favoriteBtn}
              onPress={() => onFavoritePress(product.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={isGrid ? 20 : 22}
                color={isFavorite ? colors.error : '#fff'}
              />
            </TouchableOpacity>
          )}
          {/* Platform logo */}
          <View style={s.platformLogoContainer}>
            <PlatformIcon platform={product.platform} size={isGrid ? 18 : 16} />
          </View>
        </View>

        {/* Info */}
        <View style={s.info}>
          <Text style={s.title} numberOfLines={2}>
            {product.name}
          </Text>

          {/* Old price */}
          {!!product.old_price && product.old_price > product.current_price && (
            <Text style={s.oldPrice}>
              R$ {parseFloat(product.old_price).toFixed(2).replace('.', ',')}
            </Text>
          )}

          {/* Current price ML-style */}
          <View style={s.priceRow}>
            <Text style={s.currencySign}>R$ </Text>
            <Text style={s.priceInt}>{currentPrice.intPart}</Text>
            <Text style={s.priceCent}>{currentPrice.centPart}</Text>
          </View>

          {/* Coupon */}
          {!!couponCode && (
            <View style={s.couponBadge}>
              <Ionicons name="ticket" size={12} color={colors.success} />
              <Text style={s.couponText}>{couponCode}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── GRID (2-column Modern Style) ──────────────────────────────
const gridStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    } : {
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    }),
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#FAFAFA',
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    } : {
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    }),
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    } : {
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    }),
  },
  platformLogoContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    } : {
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    }),
  },
  platformLogo: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  info: {
    padding: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 17,
    marginBottom: 8,
    minHeight: 34,
  },
  oldPrice: {
    fontSize: 11,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginBottom: 2,
    fontWeight: '400',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  currencySign: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    marginTop: 2,
  },
  priceInt: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  priceCent: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  couponBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: colors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.success + '40',
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 2px 6px ${colors.success}20`,
    } : {
      elevation: 2,
      shadowColor: colors.success,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    }),
  },
  couponText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});

// ─── LIST (full-width, legacy fallback) ────────────────────
const listStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    flexDirection: 'row',
  },
  imageContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#fff',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
    } : {
      elevation: 2,
    }),
  },
  platformLogoContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
    } : {
      elevation: 2,
    }),
  },
  platformLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 18,
    marginBottom: 6,
  },
  oldPrice: {
    fontSize: 11,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginBottom: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currencySign: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text,
    marginTop: 1,
  },
  priceInt: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 26,
  },
  priceCent: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.text,
    marginTop: 1,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
    marginTop: 2,
  },
  couponBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    backgroundColor: colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  couponText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
  },
});
