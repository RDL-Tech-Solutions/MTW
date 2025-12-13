import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../stores/productStore';
import { useThemeStore } from '../../theme/theme';
import Button from '../../components/common/Button';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '../../utils/constants';

export default function ProductDetailsScreen({ route, navigation }) {
  const { colors } = useThemeStore();
  const { product: initialProduct, productId } = route.params || {};
  const { addFavorite, removeFavorite, isFavorite, fetchProductById, fetchCouponById } = useProductStore();
  const [product, setProduct] = useState(initialProduct);
  const [coupon, setCoupon] = useState(null);
  const [loading, setLoading] = useState(!initialProduct && !!productId);
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const [favorite, setFavorite] = useState(initialProduct?.id ? isFavorite(initialProduct.id) : false);
  const [copiedAnimation] = useState(new Animated.Value(0));
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);

  useEffect(() => {
    if (!initialProduct && productId) {
      loadProduct();
    } else if (!initialProduct && !productId) {
      Alert.alert('Erro', 'Produto não encontrado', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } else if (initialProduct) {
      setFavorite(isFavorite(initialProduct.id));
      if (initialProduct.coupon_id) {
        loadCoupon(initialProduct.coupon_id);
      }
    }
  }, []);

  useEffect(() => {
    if (product?.coupon_id && !coupon) {
      loadCoupon(product.coupon_id);
    }
  }, [product]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const result = await fetchProductById(productId);
      if (result.success && result.product) {
        setProduct(result.product);
        setFavorite(isFavorite(result.product.id));
        if (result.product.coupon_id) {
          loadCoupon(result.product.coupon_id);
        }
      } else {
        Alert.alert('Erro', 'Produto não encontrado', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar o produto', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadCoupon = async (couponId) => {
    try {
      setLoadingCoupon(true);
      const result = await fetchCouponById(couponId);
      if (result.success && result.coupon) {
        setCoupon(result.coupon);
      }
    } catch (error) {
      console.error('Erro ao carregar cupom:', error);
    } finally {
      setLoadingCoupon(false);
    }
  };

  if (loading || !product) {
    return (
      <View style={[dynamicStyles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[dynamicStyles.loadingText, { color: colors.textMuted }]}>Carregando produto...</Text>
      </View>
    );
  }

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

  const animateCopied = () => {
    setShowCopiedMessage(true);
    Animated.sequence([
      Animated.timing(copiedAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(copiedAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowCopiedMessage(false);
    });
  };

  const handleBuyNow = async () => {
    try {
      // Se tiver cupom, copiar o código
      if (coupon?.code) {
        await Clipboard.setStringAsync(coupon.code);
        animateCopied();
      }

      // Aguardar um pouco para mostrar a animação antes de redirecionar
      setTimeout(async () => {
        try {
          const url = product.affiliate_link || product.link;
          if (!url) {
            Alert.alert('Erro', 'Link não disponível');
            return;
          }

          const supported = await Linking.canOpenURL(url);
          if (supported) {
            await Linking.openURL(url);
          } else {
            Alert.alert('Erro', 'Não foi possível abrir o link');
          }
        } catch (error) {
          Alert.alert('Erro', 'Não foi possível abrir o link');
        }
      }, coupon?.code ? 500 : 0);
    } catch (error) {
      console.error('Erro ao copiar cupom:', error);
      // Mesmo se falhar ao copiar, tenta abrir o link
      try {
        const url = product.affiliate_link || product.link;
        if (url) {
          const supported = await Linking.canOpenURL(url);
          if (supported) {
            await Linking.openURL(url);
          }
        }
      } catch (linkError) {
        Alert.alert('Erro', 'Não foi possível abrir o link');
      }
    }
  };

  const handleCopyCoupon = async () => {
    if (coupon?.code) {
      try {
        await Clipboard.setStringAsync(coupon.code);
        animateCopied();
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível copiar o código');
      }
    }
  };

  const translateY = copiedAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const opacity = copiedAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Criar estilos dinamicamente com tema
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
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
      top: 20,
      left: 20,
      backgroundColor: colors.error,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      ...(Platform.OS === 'web' ? {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
      } : {
        elevation: 4,
      }),
    },
    discountText: {
      color: colors.white,
      fontSize: 18,
      fontWeight: '700',
    },
    actions: {
      position: 'absolute',
      top: 20,
      right: 20,
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web' ? {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
      } : {
        elevation: 3,
      }),
    },
    content: {
      padding: 20,
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      marginTop: -24,
      ...(Platform.OS === 'web' ? {
        boxShadow: '0 -4px 8px rgba(0, 0, 0, 0.1)',
      } : {
        elevation: 4,
      }),
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
      ...(Platform.OS === 'web' ? {
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
      } : {
        elevation: 4,
      }),
    },
    platformBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      marginBottom: 16,
    },
    platformText: {
      fontSize: 13,
      fontWeight: '700',
    },
    name: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 20,
      lineHeight: 34,
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 24,
      marginBottom: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    oldPriceContainer: {
      alignItems: 'flex-start',
    },
    oldPriceLabel: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 4,
      fontWeight: '500',
    },
    oldPrice: {
      fontSize: 20,
      color: colors.textMuted,
      textDecorationLine: 'line-through',
      fontWeight: '600',
    },
    currentPriceContainer: {
      alignItems: 'flex-start',
    },
    currentPriceLabel: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 4,
      fontWeight: '500',
    },
    currentPrice: {
      fontSize: 36,
      fontWeight: '700',
      color: colors.primary,
    },
    categoryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight + '15',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      alignSelf: 'flex-start',
      marginBottom: 24,
      gap: 8,
    },
    categoryText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    couponSection: {
      marginBottom: 24,
      backgroundColor: colors.successLight,
      borderRadius: 16,
      padding: 16,
      borderWidth: 2,
      borderColor: colors.success,
      ...(Platform.OS === 'web' ? {
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)',
      } : {
        elevation: 2,
      }),
    },
    couponHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    couponSectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.success,
    },
    couponContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      gap: 12,
      ...(Platform.OS === 'web' ? {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      } : {
        elevation: 1,
      }),
    },
    couponContent: {
      flex: 1,
    },
    couponLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    couponCode: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.success,
      marginBottom: 4,
      letterSpacing: 1,
    },
    couponDiscount: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.success,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    description: {
      fontSize: 15,
      color: colors.textLight,
      lineHeight: 24,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 10,
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
    buyButton: {
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 18,
      ...(Platform.OS === 'web' ? {
        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
      } : {
        elevation: 4,
      }),
    },
    buyButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.white,
    },
    copiedMessage: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginLeft: -100,
      marginTop: -50,
      backgroundColor: colors.success,
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      width: 200,
      ...(Platform.OS === 'web' ? {
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
      } : {
        elevation: 8,
      }),
    },
    copiedText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '700',
      marginTop: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '500',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={dynamicStyles.scrollView}>
        {/* Imagem do Produto */}
        <View style={dynamicStyles.imageContainer}>
          <Image 
            source={{ uri: product.image_url || 'https://via.placeholder.com/300' }} 
            style={dynamicStyles.image}
            resizeMode="cover"
          />
          
          {discountPercentage > 0 && (
            <View style={dynamicStyles.discountBadge}>
              <Text style={dynamicStyles.discountText}>-{discountPercentage}%</Text>
            </View>
          )}

          <View style={dynamicStyles.actions}>
            <TouchableOpacity 
              style={dynamicStyles.actionButton}
              onPress={handleFavorite}
            >
              <Ionicons 
                name={favorite ? 'heart' : 'heart-outline'} 
                size={24} 
                color={favorite ? colors.error : colors.white} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={dynamicStyles.actionButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={dynamicStyles.content}>
          {/* Plataforma */}
          <View style={[dynamicStyles.platformBadge, { backgroundColor: PLATFORM_COLORS[product.platform] + '20' }]}>
            <Text style={[dynamicStyles.platformText, { color: PLATFORM_COLORS[product.platform] }]}>
              {PLATFORM_LABELS[product.platform]}
            </Text>
          </View>

          {/* Nome do Produto */}
          <Text style={dynamicStyles.name}>{product.name}</Text>

          {/* Preços */}
          <View style={dynamicStyles.priceContainer}>
            {product.old_price && product.old_price > product.current_price && (
              <View style={dynamicStyles.oldPriceContainer}>
                <Text style={dynamicStyles.oldPriceLabel}>De:</Text>
                <Text style={dynamicStyles.oldPrice}>R$ {product.old_price.toFixed(2)}</Text>
              </View>
            )}
            <View style={dynamicStyles.currentPriceContainer}>
              <Text style={dynamicStyles.currentPriceLabel}>Por apenas:</Text>
              <Text style={dynamicStyles.currentPrice}>R$ {product.current_price.toFixed(2)}</Text>
            </View>
          </View>

          {/* Categoria */}
          {product.category_name && (
            <View style={dynamicStyles.categoryContainer}>
              <Ionicons name="pricetag" size={18} color={colors.primary} />
              <Text style={dynamicStyles.categoryText}>{product.category_name}</Text>
            </View>
          )}

          {/* Cupom */}
          {coupon && coupon.code && (
            <View style={dynamicStyles.couponSection}>
              <View style={dynamicStyles.couponHeader}>
                <Ionicons name="ticket" size={24} color={colors.success} />
                <Text style={dynamicStyles.couponSectionTitle}>Cupom de Desconto</Text>
              </View>
              <TouchableOpacity 
                style={dynamicStyles.couponContainer}
                onPress={handleCopyCoupon}
                activeOpacity={0.8}
              >
                <View style={dynamicStyles.couponContent}>
                  <Text style={dynamicStyles.couponLabel}>Use o código:</Text>
                  <Text style={dynamicStyles.couponCode}>{coupon.code}</Text>
                  {coupon.discount_value && (
                    <Text style={dynamicStyles.couponDiscount}>
                      {coupon.discount_type === 'percentage' 
                        ? `${coupon.discount_value}% OFF` 
                        : `R$ ${coupon.discount_value.toFixed(2)} OFF`}
                    </Text>
                  )}
                </View>
                <Ionicons name="copy-outline" size={24} color={colors.success} />
              </TouchableOpacity>
            </View>
          )}

          {/* Descrição */}
          {product.description && (
            <View style={dynamicStyles.section}>
              <Text style={dynamicStyles.sectionTitle}>Descrição do Produto</Text>
              <Text style={dynamicStyles.description}>{product.description}</Text>
            </View>
          )}

          {/* Informações Adicionais */}
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>Informações</Text>
            
            <View style={dynamicStyles.infoRow}>
              <Ionicons name="eye-outline" size={20} color={colors.textMuted} />
              <Text style={dynamicStyles.infoLabel}>Visualizações:</Text>
              <Text style={dynamicStyles.infoValue}>{product.click_count || 0}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer com Botão */}
      <View style={dynamicStyles.footer}>
        <Button
          title={coupon?.code ? "Comprar Agora" : "Ver Oferta"}
          onPress={handleBuyNow}
          style={dynamicStyles.buyButton}
          textStyle={dynamicStyles.buyButtonText}
          size="large"
        />
      </View>

      {/* Animação de Cupom Copiado */}
      {showCopiedMessage && (
        <Animated.View 
          style={[
            dynamicStyles.copiedMessage,
            {
              opacity,
              transform: [{ translateY }],
            }
          ]}
        >
          <Ionicons name="checkmark-circle" size={32} color={colors.white} />
          <Text style={dynamicStyles.copiedText}>Cupom copiado!</Text>
        </Animated.View>
      )}
    </View>
  );
}

