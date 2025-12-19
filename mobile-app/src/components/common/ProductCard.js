import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';
import { PLATFORM_LABELS } from '../../utils/constants';

export default function ProductCard({ product, onPress, onFavoritePress, isFavorite }) {
  const { colors } = useThemeStore();
  const discountPercentage = product.discount_percentage || 
    Math.round(((product.old_price - product.current_price) / product.old_price) * 100);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 16,
      ...(Platform.OS === 'web' ? {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      } : {
        elevation: 3,
      }),
    },
    imageContainer: {
      position: 'relative',
      width: '100%',
      height: 200,
    },
    image: {
      width: '100%',
      height: '100%',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    discountBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
      backgroundColor: colors.error,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    discountText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: '700',
    },
    favoriteButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      padding: 12,
    },
    platform: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    name: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      lineHeight: 20,
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    oldPrice: {
      fontSize: 12,
      color: colors.textMuted,
      textDecorationLine: 'line-through',
    },
    currentPrice: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
    },
  });

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: product.image_url || 'https://via.placeholder.com/300' }} 
          style={styles.image}
          resizeMode="cover"
          onError={(error) => {
            console.log('Erro ao carregar imagem:', error);
          }}
        />
        {discountPercentage > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercentage}%</Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={onFavoritePress}
        >
          <Ionicons 
            name={isFavorite ? 'heart' : 'heart-outline'} 
            size={24} 
            color={isFavorite ? colors.error : colors.white} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.platform}>{PLATFORM_LABELS[product.platform]}</Text>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        
        <View style={styles.priceContainer}>
          {product.old_price && (
            <Text style={styles.oldPrice}>R$ {product.old_price.toFixed(2)}</Text>
          )}
          <Text style={styles.currentPrice}>
            R$ {(product.final_price || product.current_price).toFixed(2)}
          </Text>
          {product.final_price && product.final_price < product.current_price && (
            <View style={{ marginLeft: 4 }}>
              <Text style={[styles.oldPrice, { fontSize: 10 }]}>
                Cupom aplicado
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
