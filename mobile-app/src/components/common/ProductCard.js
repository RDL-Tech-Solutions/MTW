import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, Animated, Platform } from 'react-native';
import { useThemeStore } from '../../theme/theme';
import PlatformBadge from './PlatformBadge';

export default function ProductCard({ product, onPress, index = 0 }) {
  const { colors } = useThemeStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Stagger animation based on index
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50, // 50ms delay per item
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const formatPrice = (price) => {
    return `R$ ${parseFloat(price).toFixed(2).replace('.', ',')}`;
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
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const dynamicStyles = createStyles(colors);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          { scale: scaleAnim },
          { translateY: slideAnim },
        ],
      }}
    >
      <TouchableOpacity
        style={dynamicStyles.card}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Badge de Plataforma */}
        <View style={dynamicStyles.badgeContainer}>
          <PlatformBadge platform={product.platform} size="small" />
        </View>

        {/* Imagem do Produto */}
        <Image
          source={{ uri: product.image_url }}
          style={dynamicStyles.image}
          resizeMode="cover"
        />

        {/* Informações do Produto */}
        <View style={dynamicStyles.info}>
          <Text style={dynamicStyles.title} numberOfLines={2}>
            {product.name}
          </Text>

          {/* Preços */}
          <View style={dynamicStyles.priceContainer}>
            {product.old_price && product.old_price > product.current_price && (
              <Text style={dynamicStyles.oldPrice}>
                {formatPrice(product.old_price)}
              </Text>
            )}
            <Text style={dynamicStyles.currentPrice}>
              {formatPrice(product.current_price)}
            </Text>
          </View>

          {/* Badge de Desconto */}
          {product.discount_percentage > 0 && (
            <View style={dynamicStyles.discountBadge}>
              <Text style={dynamicStyles.discountText}>
                {product.discount_percentage}% OFF
              </Text>
            </View>
          )}

          {/* Cupom (se houver) */}
          {product.coupon_code && (
            <View style={dynamicStyles.couponContainer}>
              <Text style={dynamicStyles.couponIcon}>🎟️</Text>
              <Text style={dynamicStyles.couponCode}>{product.coupon_code}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    } : {
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    }),
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: colors.border,
  },
  info: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  oldPrice: {
    fontSize: 14,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
  },
  discountBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  couponContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  couponIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  couponCode: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
});
