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
  const heartScaleAnim = useRef(new Animated.Value(1)).current;
  const heartRotateAnim = useRef(new Animated.Value(0)).current;

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

  const handleFavoritePress = () => {
    // Animação do coração
    Animated.sequence([
      Animated.parallel([
        Animated.spring(heartScaleAnim, {
          toValue: 1.5,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(heartRotateAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(heartScaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(heartRotateAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    if (onFavoritePress) {
      onFavoritePress(product.id);
    }
  };

  // Calcular desconto baseado no preço original vs preço atual
  const discount = product.discount_percentage ||
    (product.old_price && product.old_price > product.current_price
      ? Math.round(((product.old_price - product.current_price) / product.old_price) * 100)
      : 0);

  // Selecionar o melhor cupom (maior desconto em %)
  const getBestCoupon = () => {
    if (!product.coupons || product.coupons.length === 0) return null;
    
    // Filtrar cupons não esgotados
    const activeCoupons = product.coupons.filter(c => !c.is_out_of_stock);
    if (activeCoupons.length === 0) return null;

    // Calcular desconto percentual de cada cupom
    const couponsWithDiscount = activeCoupons.map(coupon => {
      const currentPrice = parseFloat(product.current_price) || 0;
      let discountPercent = 0;

      if (coupon.discount_type === 'percentage') {
        discountPercent = parseFloat(coupon.discount_value) || 0;
      } else {
        // Converter desconto fixo em percentual
        const discountValue = parseFloat(coupon.discount_value) || 0;
        discountPercent = currentPrice > 0 ? (discountValue / currentPrice) * 100 : 0;
      }

      return { ...coupon, discountPercent };
    });

    // Ordenar por maior desconto
    couponsWithDiscount.sort((a, b) => b.discountPercent - a.discountPercent);
    return couponsWithDiscount[0];
  };

  const bestCoupon = getBestCoupon();
  const couponCode = bestCoupon?.code; // Remover fallback para product.coupon_code

  // Usar price_with_coupon se houver cupom, senão usar current_price
  const displayPrice = bestCoupon && product.price_with_coupon 
    ? product.price_with_coupon 
    : product.current_price;
  
  const currentPrice = formatPrice(displayPrice);

  // Calcular desconto adicional do cupom
  const couponDiscount = bestCoupon && product.price_with_coupon
    ? Math.round(((product.current_price - product.price_with_coupon) / product.current_price) * 100)
    : 0;

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
              onPress={handleFavoritePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Animated.View
                style={{
                  transform: [
                    { scale: heartScaleAnim },
                    { 
                      rotate: heartRotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      })
                    }
                  ]
                }}
              >
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={isGrid ? 20 : 22}
                  color={isFavorite ? colors.error : '#fff'}
                />
              </Animated.View>
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

          {/* Old price - mostrar preço original se houver cupom, senão mostrar old_price */}
          {bestCoupon && product.price_with_coupon ? (
            <Text style={s.oldPrice}>
              R$ {parseFloat(product.current_price).toFixed(2).replace('.', ',')}
            </Text>
          ) : (
            !!product.old_price && product.old_price > product.current_price && (
              <Text style={s.oldPrice}>
                R$ {parseFloat(product.old_price).toFixed(2).replace('.', ',')}
              </Text>
            )
          )}

          {/* Current price ML-style */}
          <View style={s.priceRow}>
            <Text style={s.currencySign}>R$ </Text>
            <Text style={s.priceInt}>{currentPrice.intPart}</Text>
            <Text style={s.priceCent}>{currentPrice.centPart}</Text>
          </View>

          {/* Coupon - badge compacto vermelho */}
          {!!couponCode && (
            <View style={s.couponContainer}>
              <View style={s.couponBadge}>
                <View style={s.couponIconBox}>
                  <Ionicons name="ticket" size={11} color="#fff" />
                </View>
                <View style={s.couponInfo}>
                  <Text style={s.couponCode}>{couponCode}</Text>
                  {couponDiscount > 0 && (
                    <Text style={s.couponDiscount}>-{couponDiscount}%</Text>
                  )}
                </View>
              </View>
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
  couponContainer: {
    marginTop: 8,
  },
  couponBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626', // Vermelho
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    gap: 6,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)',
    } : {
      elevation: 2,
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.35,
      shadowRadius: 3,
    }),
  },
  couponIconBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couponCode: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  couponDiscount: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
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
  couponContainer: {
    marginTop: 6,
  },
  couponBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626', // Vermelho
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 7,
    gap: 5,
    alignSelf: 'flex-start',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)',
    } : {
      elevation: 2,
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
    }),
  },
  couponIconBox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  couponCode: {
    fontSize: 8,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  couponDiscount: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
