import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking } from 'react-native';
import PlatformBadge from './PlatformBadge';

export default function ProductCard({ product, onPress }) {
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

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Badge de Plataforma */}
      <View style={styles.badgeContainer}>
        <PlatformBadge platform={product.platform} size="small" />
      </View>

      {/* Imagem do Produto */}
      <Image
        source={{ uri: product.image_url }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Informações do Produto */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Preços */}
        <View style={styles.priceContainer}>
          {product.old_price && product.old_price > product.current_price && (
            <Text style={styles.oldPrice}>
              {formatPrice(product.old_price)}
            </Text>
          )}
          <Text style={styles.currentPrice}>
            {formatPrice(product.current_price)}
          </Text>
        </View>

        {/* Badge de Desconto */}
        {product.discount_percentage > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {product.discount_percentage}% OFF
            </Text>
          </View>
        )}

        {/* Cupom (se houver) */}
        {product.coupon_code && (
          <View style={styles.couponContainer}>
            <Text style={styles.couponIcon}>🎟️</Text>
            <Text style={styles.couponCode}>{product.coupon_code}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
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
    backgroundColor: '#F3F4F6',
  },
  info: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
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
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
  },
  discountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  couponContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  couponIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  couponCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
});
