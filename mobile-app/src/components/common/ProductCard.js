import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, Animated, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';
import PlatformBadge from './PlatformBadge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 8;
const GRID_PADDING = 12;
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
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  const discount = product.discount_percentage ||
    (product.old_price && product.old_price > product.current_price
      ? Math.round(((product.old_price - product.current_price) / product.old_price) * 100)
      : 0);

  const currentPrice = formatPrice(product.current_price);

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
            resizeMode="contain"
          />
          {/* Favorite button */}
          {onFavoritePress && (
            <TouchableOpacity
              style={s.favoriteBtn}
              onPress={() => onFavoritePress(product.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={isGrid ? 18 : 22}
                color={isFavorite ? colors.error : colors.textMuted}
              />
            </TouchableOpacity>
          )}
          {/* Platform badge */}
          <View style={s.badgeContainer}>
            <PlatformBadge platform={product.platform} size="small" />
          </View>
        </View>

        {/* Info */}
        <View style={s.info}>
          <Text style={s.title} numberOfLines={2}>
            {product.name}
          </Text>

          {/* Old price */}
          {product.old_price && product.old_price > product.current_price && (
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

          {/* Discount badge */}
          {discount > 0 && (
            <Text style={s.discountText}>{discount}% OFF</Text>
          )}

          {/* Coupon */}
          {product.coupon_code && (
            <View style={s.couponBadge}>
              <Ionicons name="ticket-outline" size={12} color={colors.success} />
              <Text style={s.couponText}>{product.coupon_code}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── GRID (2-column ML-style) ──────────────────────────────
const gridStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: GRID_GAP,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
    } : {
      elevation: 2,
    }),
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 6,
    left: 6,
  },
  info: {
    padding: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 16,
    marginBottom: 6,
    minHeight: 32,
  },
  oldPrice: {
    fontSize: 10,
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
    fontSize: 20,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 24,
  },
  priceCent: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.text,
    marginTop: 1,
  },
  discountText: {
    fontSize: 11,
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
  badgeContainer: {
    position: 'absolute',
    bottom: 4,
    left: 4,
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
