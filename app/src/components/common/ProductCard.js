import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, Animated, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';
import { PlatformIcon } from '../../utils/platformIcons';

const GRID_GAP = 8;
const GRID_PADDING = 16;

// ── Responsive size helper ────────────────────────────────────────
function getCardSizes(screenWidth) {
  if (screenWidth <= 360) {
    // Small phones (Galaxy A10, SE, etc.)
    return {
      cardWidth: (screenWidth - GRID_PADDING * 2 - GRID_GAP) / 2,
      imageAspectRatio: 1.05,
      titleFontSize: 11,
      titleLineHeight: 15,
      titleMinHeight: 30,
      oldPriceFontSize: 10,
      currencySignFontSize: 12,
      priceIntFontSize: 18,
      priceCentFontSize: 11,
      infoPadding: 8,
      discountBadgeFontSize: 10,
      couponFontSize: 10,
      couponIconSize: 12,
      couponIconBoxSize: 18,
      platformCircleSize: 24,
      platformIconSize: 14,
      favBtnSize: 28,
      favBtnRadius: 14,
      favIconSize: 17,
    };
  } else if (screenWidth >= 414) {
    // Large phones (Plus / Pro Max / XL)
    return {
      cardWidth: (screenWidth - GRID_PADDING * 2 - GRID_GAP) / 2,
      imageAspectRatio: 0.92,
      titleFontSize: 14,
      titleLineHeight: 19,
      titleMinHeight: 38,
      oldPriceFontSize: 12,
      currencySignFontSize: 16,
      priceIntFontSize: 24,
      priceCentFontSize: 14,
      infoPadding: 12,
      discountBadgeFontSize: 12,
      couponFontSize: 13,
      couponIconSize: 14,
      couponIconBoxSize: 22,
      platformCircleSize: 32,
      platformIconSize: 20,
      favBtnSize: 34,
      favBtnRadius: 17,
      favIconSize: 21,
    };
  } else {
    // Medium phones (375–413px – iPhone standard, Pixel 6)
    return {
      cardWidth: (screenWidth - GRID_PADDING * 2 - GRID_GAP) / 2,
      imageAspectRatio: 1,
      titleFontSize: 13,
      titleLineHeight: 17,
      titleMinHeight: 34,
      oldPriceFontSize: 11,
      currencySignFontSize: 15,
      priceIntFontSize: 22,
      priceCentFontSize: 13,
      infoPadding: 10,
      discountBadgeFontSize: 11,
      couponFontSize: 12,
      couponIconSize: 13,
      couponIconBoxSize: 20,
      platformCircleSize: 28,
      platformIconSize: 18,
      favBtnSize: 32,
      favBtnRadius: 16,
      favIconSize: 20,
    };
  }
}

export default function ProductCard({ product, onPress, onFavoritePress, isFavorite, index = 0, isGrid = false }) {
  const { colors } = useThemeStore();
  const { width: screenWidth } = useWindowDimensions();
  const sizes = getCardSizes(screenWidth);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScaleAnim = useRef(new Animated.Value(1)).current;
  const heartRotateAnim = useRef(new Animated.Value(0)).current;
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const [couponCodeWidth, setCouponCodeWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

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

  const discount = product.discount_percentage ||
    (product.old_price && product.old_price > product.current_price
      ? Math.round(((product.old_price - product.current_price) / product.old_price) * 100)
      : 0);

  const getBestCoupon = () => {
    if (!product.coupons || product.coupons.length === 0) return null;
    const activeCoupons = product.coupons.filter(c => !c.is_out_of_stock);
    if (activeCoupons.length === 0) return null;

    const couponsWithDiscount = activeCoupons.map(coupon => {
      const currentPrice = parseFloat(product.current_price) || 0;
      let discountPercent = 0;
      if (coupon.discount_type === 'percentage') {
        discountPercent = parseFloat(coupon.discount_value) || 0;
      } else {
        const discountValue = parseFloat(coupon.discount_value) || 0;
        discountPercent = currentPrice > 0 ? (discountValue / currentPrice) * 100 : 0;
      }
      return { ...coupon, discountPercent };
    });

    couponsWithDiscount.sort((a, b) => b.discountPercent - a.discountPercent);
    return couponsWithDiscount[0];
  };

  const bestCoupon = getBestCoupon();
  const couponCode = bestCoupon?.code;

  useEffect(() => {
    const threshold = 5;
    if (couponCode && containerWidth > 0 && couponCodeWidth > (containerWidth - threshold)) {
      const scrollDistance = couponCodeWidth - containerWidth + 30;
      Animated.loop(
        Animated.sequence([
          Animated.delay(1500),
          Animated.timing(scrollAnim, {
            toValue: -scrollDistance,
            duration: Math.max(scrollDistance * 40, 2000),
            useNativeDriver: true,
          }),
          Animated.delay(1500),
          Animated.timing(scrollAnim, {
            toValue: 0,
            duration: Math.max(scrollDistance * 40, 2000),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scrollAnim.setValue(0);
    }
  }, [couponCode, couponCodeWidth, containerWidth]);

  const displayPrice = bestCoupon && product.price_with_coupon
    ? product.price_with_coupon
    : product.current_price;

  const currentPrice = formatPrice(displayPrice);

  const couponDiscount = bestCoupon && product.price_with_coupon
    ? Math.round(((product.current_price - product.price_with_coupon) / product.current_price) * 100)
    : 0;

  const s = isGrid ? gridStyles(colors, sizes) : listStyles(colors);

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        isGrid && { width: sizes.cardWidth },
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

          {/* Discount badge */}
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
                  size={sizes.favIconSize}
                  color={isFavorite ? colors.error : '#fff'}
                />
              </Animated.View>
            </TouchableOpacity>
          )}

          {/* Platform logo */}
          <View style={s.platformLogoContainer}>
            <PlatformIcon platform={product.platform} size={sizes.platformIconSize} />
          </View>
        </View>

        {/* Info */}
        <View style={s.info}>
          <Text style={s.title} numberOfLines={2}>
            {product.name}
          </Text>

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

          <View style={s.priceRow}>
            <Text style={s.currencySign}>R$ </Text>
            <Text style={s.priceInt}>{currentPrice.intPart}</Text>
            <Text style={s.priceCent}>{currentPrice.centPart}</Text>
          </View>

          {!!couponCode && (
            <View style={s.couponContainer}>
              <View style={s.couponBadge}>
                <View style={s.couponIconBox}>
                  <Ionicons name="ticket" size={sizes.couponIconSize} color="#fff" />
                </View>
                <View
                  style={s.couponInfo}
                  onLayout={(e) => {
                    const width = e.nativeEvent.layout.width;
                    setContainerWidth(width);
                  }}
                >
                  <View style={s.couponCodeContainer}>
                    <Animated.View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        transform: [{ translateX: scrollAnim }]
                      }}
                      onLayout={(e) => {
                        const width = e.nativeEvent.layout.width;
                        setCouponCodeWidth(width);
                      }}
                    >
                      <Text style={s.couponCode} numberOfLines={1}>
                        {couponCode}
                      </Text>
                      {couponDiscount > 0 && (
                        <Text style={s.couponDiscount}> -{couponDiscount}%</Text>
                      )}
                    </Animated.View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── GRID (2-column Responsive) ─────────────────────────────────
const gridStyles = (colors, sizes) => StyleSheet.create({
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
    aspectRatio: sizes.imageAspectRatio,
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
    top: 7,
    left: 7,
    backgroundColor: colors.error,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    } : {
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    }),
  },
  discountBadgeText: {
    fontSize: sizes.discountBadgeFontSize,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: sizes.favBtnSize,
    height: sizes.favBtnSize,
    borderRadius: sizes.favBtnRadius,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
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
    bottom: 7,
    left: 7,
    width: sizes.platformCircleSize,
    height: sizes.platformCircleSize,
    borderRadius: sizes.platformCircleSize / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    } : {
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    }),
  },
  info: {
    padding: sizes.infoPadding,
  },
  title: {
    fontSize: sizes.titleFontSize,
    fontWeight: '500',
    color: colors.text,
    lineHeight: sizes.titleLineHeight,
    marginBottom: 6,
    minHeight: sizes.titleMinHeight,
  },
  oldPrice: {
    fontSize: sizes.oldPriceFontSize,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginBottom: 2,
    fontWeight: '400',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  currencySign: {
    fontSize: sizes.currencySignFontSize,
    fontWeight: '500',
    color: colors.text,
    marginTop: 2,
  },
  priceInt: {
    fontSize: sizes.priceIntFontSize,
    fontWeight: '700',
    color: colors.text,
    lineHeight: sizes.priceIntFontSize + 4,
    letterSpacing: -0.5,
  },
  priceCent: {
    fontSize: sizes.priceCentFontSize,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  discountText: {
    fontSize: sizes.discountBadgeFontSize,
    fontWeight: '700',
    color: colors.success,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  couponContainer: {
    marginTop: 6,
  },
  couponBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 7,
    gap: 5,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 6px rgba(220,38,38,0.35)',
    } : {
      elevation: 2,
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.35,
      shadowRadius: 3,
    }),
  },
  couponIconBox: {
    width: sizes.couponIconBoxSize,
    height: sizes.couponIconBoxSize,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  couponCodeContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  couponCode: {
    fontSize: sizes.couponFontSize,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  couponDiscount: {
    fontSize: sizes.couponFontSize,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
  },
});

// ─── LIST (full-width, legacy fallback) ─────────────────────────
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
    backgroundColor: '#DC2626',
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 7,
    gap: 5,
    alignSelf: 'flex-start',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(220,38,38,0.3)',
    } : {
      elevation: 2,
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
    }),
  },
  couponIconBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  couponCodeContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  couponCode: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  couponDiscount: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
