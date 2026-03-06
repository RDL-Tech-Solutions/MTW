import React, { useState, useEffect, useRef } from 'react';
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
  StatusBar,
  Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../stores/productStore';
import { useThemeStore } from '../../theme/theme';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '../../utils/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 360;
const isMediumScreen = SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 400;

export default function ProductDetailsScreen({ route, navigation }) {
  const { colors } = useThemeStore();
  const { product: initialProduct, productId } = route.params || {};
  const { addFavorite, removeFavorite, isFavorite, fetchProductById, registerClick } = useProductStore();
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(!initialProduct && !!productId);
  const [favorite, setFavorite] = useState(initialProduct?.id ? isFavorite(initialProduct.id) : false);
  const [copiedCouponId, setCopiedCouponId] = useState(null);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const copiedAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (!initialProduct && productId) {
      loadProduct();
    } else if (!initialProduct && !productId) {
      Alert.alert('Erro', 'Produto não encontrado', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } else if (initialProduct) {
      setFavorite(isFavorite(initialProduct.id));
      // Registrar visualização do produto
      registerClick(initialProduct.id);
    }

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const result = await fetchProductById(productId);
      if (result.success && result.product) {
        setProduct(result.product);
        setFavorite(isFavorite(result.product.id));
        // Registrar visualização do produto
        registerClick(result.product.id);
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

  const s = createStyles(colors);

  if (loading || !product) {
    return (
      <View style={s.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Carregando produto...</Text>
      </View>
    );
  }

  const discountPercentage = product.discount_percentage ||
    (product.old_price && product.old_price > 0
      ? Math.round(((product.old_price - (product.final_price || product.current_price)) / product.old_price) * 100)
      : 0);

  const platformColor = PLATFORM_COLORS[product.platform] || colors.primary;

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
        toValue: 1, duration: 300, useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(copiedAnimation, {
        toValue: 0, duration: 300, useNativeDriver: true,
      }),
    ]).start(() => {
      setShowCopiedMessage(false);
    });
  };

  const handleBuyNow = async () => {
    try {
      // Selecionar o melhor cupom (maior desconto)
      const availableCoupons = product?.coupons?.filter(c => !c.is_out_of_stock) || [];
      
      let bestCoupon = null;
      if (availableCoupons.length > 0) {
        const couponsWithDiscount = availableCoupons.map(coupon => {
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
        bestCoupon = couponsWithDiscount[0];
      }

      // Copiar o melhor cupom se existir
      if (bestCoupon?.code) {
        await Clipboard.setStringAsync(bestCoupon.code);
        animateCopied();
      }

      // Aguardar um pouco para o usuário ver a mensagem de copiado
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
      }, bestCoupon?.code ? 500 : 0);
    } catch (error) {
      console.error('Erro ao redirecionar com cupom:', error);
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

  const handleCopyCoupon = async (couponToCopy) => {
    if (couponToCopy?.code) {
      try {
        await Clipboard.setStringAsync(couponToCopy.code);
        setCopiedCouponId(couponToCopy.id);
        animateCopied();
        setTimeout(() => setCopiedCouponId(null), 2000);
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível copiar o código');
      }
    }
  };

  const translateY = copiedAnimation.interpolate({
    inputRange: [0, 1], outputRange: [50, 0],
  });
  const toastOpacity = copiedAnimation.interpolate({
    inputRange: [0, 1], outputRange: [0, 1],
  });

  // ── Price formatting ──
  const finalPrice = product.final_price || product.current_price;
  const priceInt = Math.floor(finalPrice);
  const priceCents = ((finalPrice - priceInt) * 100).toFixed(0).padStart(2, '0');
  
  // ── Filter out out-of-stock coupons and sort by best discount ──
  const availableCoupons = product?.coupons?.filter(c => !c.is_out_of_stock) || [];
  
  // Ordenar cupons por melhor desconto
  const sortedCoupons = [...availableCoupons].sort((a, b) => {
    const currentPrice = parseFloat(product.current_price) || 0;
    
    const getDiscountPercent = (coupon) => {
      if (coupon.discount_type === 'percentage') {
        return parseFloat(coupon.discount_value) || 0;
      } else {
        const discountValue = parseFloat(coupon.discount_value) || 0;
        return currentPrice > 0 ? (discountValue / currentPrice) * 100 : 0;
      }
    };
    
    return getDiscountPercent(b) - getDiscountPercent(a);
  });

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Image Section ── */}
          <View style={s.imageSection}>
            {/* Nav bar overlaid on image */}
            <View style={s.imageNav}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={s.navBtn}>
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </TouchableOpacity>
              <View style={s.navRight}>
                <TouchableOpacity onPress={handleFavorite} style={s.navBtn}>
                  <Ionicons
                    name={favorite ? 'heart' : 'heart-outline'}
                    size={22}
                    color={favorite ? colors.error : colors.text}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={s.navBtn}>
                  <Ionicons name="share-social-outline" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <Image
              source={{ uri: product.image_url || 'https://via.placeholder.com/300' }}
              style={s.productImage}
              resizeMode="contain"
            />

            {/* Discount badge */}
            {discountPercentage > 0 && (
              <View style={s.discountBadge}>
                <Text style={s.discountBadgeText}>{discountPercentage}% OFF</Text>
              </View>
            )}
          </View>

          {/* ── Main Content ── */}
          <View style={s.contentCard}>
            {/* Platform */}
            <View style={[s.platformTag, { backgroundColor: platformColor + '15' }]}>
              <Text style={[s.platformTagText, { color: platformColor }]}>
                {PLATFORM_LABELS[product.platform]}
              </Text>
            </View>

            {/* Title */}
            <Text style={s.title}>{product.name}</Text>

            {/* ── Price Block ── */}
            <View style={s.priceBlock}>
              {product.old_price && product.old_price > finalPrice && (
                <Text style={s.oldPrice}>R$ {product.old_price.toFixed(2)}</Text>
              )}
              <View style={s.currentPriceRow}>
                <Text style={s.currencySymbol}>R$</Text>
                <Text style={s.priceInteger}>{priceInt}</Text>
                <Text style={s.priceCents}>{priceCents}</Text>
              </View>
              {product.final_price && product.final_price < product.current_price && (
                <Text style={s.priceWithoutCoupon}>
                  Sem cupom: R$ {product.current_price.toFixed(2)}
                </Text>
              )}
              {discountPercentage > 0 && (
                <View style={s.savingsBadge}>
                  <Ionicons name="trending-down" size={14} color={colors.success} />
                  <Text style={s.savingsText}>Você economiza {discountPercentage}%</Text>
                </View>
              )}
            </View>

            {/* Category */}
            {product.category_name && (
              <View style={s.categoryRow}>
                <Ionicons name="pricetag-outline" size={16} color={colors.textMuted} />
                <Text style={s.categoryText}>{product.category_name}</Text>
              </View>
            )}

            {/* ── Coupon Section ── */}
            {sortedCoupons.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionTitleRow}>
                  <View style={s.sectionTitleContainer}>
                    <Ionicons name="gift" size={20} color={colors.primary} />
                    <Text style={s.sectionTitle}>
                      {sortedCoupons.length > 1 ? `${sortedCoupons.length} Cupons disponíveis` : 'Cupom disponível'}
                    </Text>
                  </View>
                  {sortedCoupons.length > 1 && (
                    <View style={s.bestBadge}>
                      <Ionicons name="trophy" size={12} color="#FFD700" />
                      <Text style={s.bestBadgeText}>Melhor</Text>
                    </View>
                  )}
                </View>
                {sortedCoupons.map((c, index) => {
                  const isBest = index === 0 && sortedCoupons.length > 1;
                  const discountPercent = c.discount_type === 'percentage' 
                    ? parseFloat(c.discount_value) 
                    : ((parseFloat(c.discount_value) / parseFloat(product.current_price)) * 100);
                  
                  return (
                    <View key={c.id} style={[s.couponCard, isBest && s.bestCouponCard]}>
                      {isBest && (
                        <View style={s.bestCouponHeader}>
                          <View style={s.crownBadge}>
                            <Ionicons name="trophy" size={16} color="#FFD700" />
                            <Text style={s.crownText}>MELHOR OFERTA</Text>
                          </View>
                          <View style={s.savingsBadgeSmall}>
                            <Text style={s.savingsTextSmall}>Economize {discountPercent.toFixed(0)}%</Text>
                          </View>
                        </View>
                      )}
                      
                      <View style={s.couponContent}>
                        <View style={s.couponLeft}>
                          <View style={s.couponIconContainer}>
                            <Ionicons name="ticket" size={32} color={isBest ? '#FFD700' : colors.primary} />
                          </View>
                          <View style={s.couponInfo}>
                            <Text style={s.couponTitle} numberOfLines={1}>
                              {c.title || 'Desconto especial'}
                            </Text>
                            <View style={s.discountRow}>
                              <Text style={[s.discountValue, isBest && s.discountValueBest]}>
                                {c.discount_type === 'percentage'
                                  ? `${c.discount_value}%`
                                  : `R$ ${parseFloat(c.discount_value).toFixed(2)}`}
                              </Text>
                              <Text style={s.discountLabel}>OFF</Text>
                            </View>
                          </View>
                        </View>
                        
                        <TouchableOpacity
                          style={[s.couponCodeContainer, isBest && s.couponCodeContainerBest]}
                          onPress={() => handleCopyCoupon(c)}
                          activeOpacity={0.7}
                        >
                          <View style={s.dashedBorder}>
                            <Text style={[s.couponCode, isBest && s.couponCodeBest]}>{c.code}</Text>
                            <View style={[s.copyButton, copiedCouponId === c.id && s.copyButtonSuccess]}>
                              <Ionicons
                                name={copiedCouponId === c.id ? 'checkmark-circle' : 'copy'}
                                size={16}
                                color={copiedCouponId === c.id ? colors.success : (isBest ? '#FFD700' : colors.primary)}
                              />
                              <Text style={[s.copyButtonText, copiedCouponId === c.id && s.copyButtonTextSuccess]}>
                                {copiedCouponId === c.id ? 'Copiado!' : 'Copiar'}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </View>
                      
                      {!isBest && index > 0 && (
                        <View style={s.alternativeBadge}>
                          <Ionicons name="information-circle" size={12} color={colors.textMuted} />
                          <Text style={s.alternativeText}>Opção alternativa</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Description ── */}
            {product.description && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Sobre este produto</Text>
                <Text style={s.descriptionText}>{product.description}</Text>
              </View>
            )}

            {/* ── Info ── */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Detalhes</Text>
              <View style={s.infoGrid}>
                <View style={s.infoItem}>
                  <Ionicons name="eye-outline" size={18} color={colors.textMuted} />
                  <Text style={s.infoLabel}>Visualizações</Text>
                  <Text style={s.infoValue}>{product.click_count || 0}</Text>
                </View>
                <View style={s.infoItem}>
                  <Ionicons name="storefront-outline" size={18} color={colors.textMuted} />
                  <Text style={s.infoLabel}>Loja</Text>
                  <Text style={s.infoValue}>{PLATFORM_LABELS[product.platform]}</Text>
                </View>
              </View>
            </View>

          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Fixed Footer ── */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.buyButton, { backgroundColor: colors.primary }]}
          onPress={handleBuyNow}
          activeOpacity={0.9}
        >
          <Text style={s.buyButtonText}>
            {sortedCoupons.length > 0 ? 'Copiar cupom e comprar' : 'Ver oferta'}
          </Text>
          <Ionicons name="arrow-forward-circle" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Copied Toast ── */}
      {showCopiedMessage && (
        <Animated.View
          style={[
            s.copiedToast,
            { opacity: toastOpacity, transform: [{ translateY }] },
          ]}
        >
          <Ionicons name="checkmark-circle" size={28} color="#fff" />
          <Text style={s.copiedToastText}>Cupom copiado!</Text>
        </Animated.View>
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
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
  },

  // ── Image Section ──
  imageSection: {
    backgroundColor: colors.card,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
  },
  imageNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRight: {
    flexDirection: 'row',
    gap: 8,
  },
  productImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: 'transparent',
  },
  discountBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Content Card ──
  contentCard: {
    backgroundColor: colors.card,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  platformTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 10,
  },
  platformTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 24,
    marginBottom: 16,
  },

  // ── Price Block ──
  priceBlock: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  oldPrice: {
    fontSize: 14,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  currentPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginTop: 4,
    marginRight: 2,
  },
  priceInteger: {
    fontSize: 32,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 36,
  },
  priceCents: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginTop: 4,
  },
  priceWithoutCoupon: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  savingsText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },

  // ── Category ──
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // ── Coupon ──
  couponCard: {
    backgroundColor: colors.card,
    borderRadius: isSmallScreen ? 12 : 16,
    padding: isSmallScreen ? 12 : 16,
    marginBottom: isSmallScreen ? 12 : 16,
    borderWidth: 2,
    borderColor: colors.border,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    } : {
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    }),
  },
  bestCouponCard: {
    borderWidth: 3,
    borderColor: '#FFD700',
    backgroundColor: '#FFFEF5',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 24px rgba(255, 215, 0, 0.25)',
    } : {
      elevation: 8,
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
    }),
  },
  bestCouponHeader: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isSmallScreen ? 'flex-start' : 'center',
    gap: isSmallScreen ? 8 : 0,
    marginBottom: isSmallScreen ? 12 : 16,
    paddingBottom: isSmallScreen ? 10 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFD70030',
  },
  crownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallScreen ? 4 : 6,
    backgroundColor: '#FFD700',
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 5 : 6,
    borderRadius: 20,
  },
  crownText: {
    fontSize: isSmallScreen ? 10 : 11,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.8,
  },
  savingsBadgeSmall: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: isSmallScreen ? 8 : 10,
    paddingVertical: isSmallScreen ? 4 : 5,
    borderRadius: 12,
  },
  savingsTextSmall: {
    fontSize: isSmallScreen ? 10 : 11,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.3,
  },
  couponContent: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isSmallScreen ? 'stretch' : 'center',
    gap: isSmallScreen ? 12 : 12,
  },
  couponLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallScreen ? 10 : 12,
  },
  couponIconContainer: {
    width: isSmallScreen ? 48 : 56,
    height: isSmallScreen ? 48 : 56,
    borderRadius: isSmallScreen ? 24 : 28,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponInfo: {
    flex: 1,
  },
  couponTitle: {
    fontSize: isSmallScreen ? 12 : 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  discountValue: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  discountValueBest: {
    color: '#FFD700',
  },
  discountLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  couponCodeContainer: {
    minWidth: isSmallScreen ? '100%' : 100,
    alignSelf: isSmallScreen ? 'stretch' : 'auto',
  },
  couponCodeContainerBest: {
    // Estilo especial para o melhor cupom
  },
  dashedBorder: {
    borderWidth: 2,
    borderColor: colors.primary + '40',
    borderStyle: 'dashed',
    borderRadius: isSmallScreen ? 10 : 12,
    padding: isSmallScreen ? 8 : 10,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  couponCode: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: isSmallScreen ? 1 : 1.5,
    marginBottom: isSmallScreen ? 6 : 8,
    textAlign: 'center',
  },
  couponCodeBest: {
    color: '#B8860B',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: isSmallScreen ? 5 : 6,
    paddingHorizontal: isSmallScreen ? 8 : 10,
    borderRadius: 8,
    backgroundColor: colors.primary + '15',
  },
  copyButtonSuccess: {
    backgroundColor: colors.success + '20',
  },
  copyButtonText: {
    fontSize: isSmallScreen ? 10 : 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  copyButtonTextSuccess: {
    color: colors.success,
  },
  alternativeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  alternativeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },

  // ── Sections ──
  section: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD70050',
  },
  bestBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B8860B',
    letterSpacing: 0.3,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 22,
  },

  // ── Info Grid ──
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  buyButton: {
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
    } : {
      elevation: 4,
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    }),
  },
  buyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Copied Toast ──
  copiedToast: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
    } : {
      elevation: 8,
    }),
  },
  copiedToastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
