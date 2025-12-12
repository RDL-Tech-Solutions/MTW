import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../stores/productStore';
import Button from '../../components/common/Button';
import colors from '../../theme/colors';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '../../utils/constants';

export default function ProductDetailsScreen({ route, navigation }) {
  const { product } = route.params;
  const { addFavorite, removeFavorite, isFavorite } = useProductStore();
  const [favorite, setFavorite] = useState(isFavorite(product.id));

  const discountPercentage = product.discount_percentage || 
    Math.round(((product.old_price - product.current_price) / product.old_price) * 100);

  const handleFavorite = async () => {
    if (favorite) {
      await removeFavorite(product.id);
      setFavorite(false);
    } else {
      await addFavorite(product.id);
      setFavorite(true);
    }
  };

  const handleOpenLink = async () => {
    try {
      const supported = await Linking.canOpenURL(product.affiliate_link);
      if (supported) {
        await Linking.openURL(product.affiliate_link);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o link');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o link');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Confira essa oferta incrível!\n\n${product.name}\n\nDe R$ ${product.old_price?.toFixed(2)} por R$ ${product.current_price.toFixed(2)}\n\n${product.affiliate_link}`,
        title: product.name,
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: product.image_url }} 
            style={styles.image}
            resizeMode="cover"
          />
          
          {discountPercentage > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discountPercentage}%</Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleFavorite}
            >
              <Ionicons 
                name={favorite ? 'heart' : 'heart-outline'} 
                size={24} 
                color={favorite ? colors.error : colors.white} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.platformBadge, { backgroundColor: PLATFORM_COLORS[product.platform] + '20' }]}>
            <Text style={[styles.platformText, { color: PLATFORM_COLORS[product.platform] }]}>
              {PLATFORM_LABELS[product.platform]}
            </Text>
          </View>

          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.priceContainer}>
            {product.old_price && (
              <View>
                <Text style={styles.oldPriceLabel}>De:</Text>
                <Text style={styles.oldPrice}>R$ {product.old_price.toFixed(2)}</Text>
              </View>
            )}
            <View>
              <Text style={styles.currentPriceLabel}>Por:</Text>
              <Text style={styles.currentPrice}>R$ {product.current_price.toFixed(2)}</Text>
            </View>
          </View>

          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Descrição</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações</Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="pricetag-outline" size={20} color={colors.textMuted} />
              <Text style={styles.infoLabel}>Categoria:</Text>
              <Text style={styles.infoValue}>{product.category_name || 'Geral'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="eye-outline" size={20} color={colors.textMuted} />
              <Text style={styles.infoLabel}>Visualizações:</Text>
              <Text style={styles.infoValue}>{product.click_count || 0}</Text>
            </View>

            {product.coupon_code && (
              <View style={styles.couponContainer}>
                <Ionicons name="ticket-outline" size={20} color={colors.success} />
                <View style={styles.couponContent}>
                  <Text style={styles.couponLabel}>Cupom disponível:</Text>
                  <Text style={styles.couponCode}>{product.coupon_code}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Ver Oferta"
          onPress={handleOpenLink}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
    backgroundColor: colors.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  discountText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  platformBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  platformText: {
    fontSize: 12,
    fontWeight: '600',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    lineHeight: 32,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 24,
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  oldPriceLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  oldPrice: {
    fontSize: 18,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  currentPriceLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  couponContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  couponContent: {
    flex: 1,
  },
  couponLabel: {
    fontSize: 12,
    color: colors.success,
    marginBottom: 2,
  },
  couponCode: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  button: {
    width: '100%',
  },
});
