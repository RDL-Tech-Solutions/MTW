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

export default function ProductDetailsScreen({ route, navigation }) {
  const { colors } = useThemeStore();
  const { product: initialProduct, productId } = route.params || {};
  const { addFavorite, removeFavorite, isFavorite, fetchProductById, fetchCouponById } = useProductStore();
  const [product, setProduct] = useState(initialProduct);
  const [coupon, setCoupon] = useState(null);
  const [loading, setLoading] = useState(!initialProduct && !!productId);
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const [favorite, setFavorite] = useState(initialProduct?.id ? isFavorite(initialProduct.id) : false);
  const [codeCopied, setCodeCopied] = useState(false);
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
      if (initialProduct.coupon_id) {
        loadCoupon(initialProduct.coupon_id);
      }
    }

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
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
      if (coupon?.code) {
        await Clipboard.setStringAsync(coupon.code);
        animateCopied();
      }

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
        setCodeCopied(true);
        animateCopied();
        setTimeout(() => setCodeCopied(false), 2000);
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
            {coupon && coupon.code && (
              <View style={s.couponCard}>
                <View style={s.couponHeader}>
                  <Ionicons name="ticket" size={20} color={colors.success} />
                  <Text style={s.couponTitle}>Cupom disponível</Text>
                </View>
                <TouchableOpacity
                  style={s.couponCodeRow}
                  onPress={handleCopyCoupon}
                  activeOpacity={0.8}
                >
                  <View style={s.couponCodeBox}>
                    <Text style={s.couponCodeText}>{coupon.code}</Text>
                  </View>
                  <View style={[s.couponCopyBtn, codeCopied && { backgroundColor: colors.success }]}>
                    <Ionicons
                      name={codeCopied ? 'checkmark' : 'copy-outline'}
                      size={18}
                      color="#fff"
                    />
                    <Text style={s.couponCopyText}>
                      {codeCopied ? 'Copiado' : 'Copiar'}
                    </Text>
                  </View>
                </TouchableOpacity>
                {coupon.discount_value && (
                  <Text style={s.couponDiscount}>
                    {coupon.discount_type === 'percentage'
                      ? `${coupon.discount_value}% OFF`
                      : `R$ ${coupon.discount_value.toFixed(2)} OFF`}
                  </Text>
                )}
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
            {coupon?.code ? 'Comprar agora' : 'Ver oferta'}
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
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },

  // ── Image Section ──
  imageSection: {
    backgroundColor: '#fff',
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
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
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
    borderBottomColor: '#E5E7EB',
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
    backgroundColor: colors.success + '08',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.success + '25',
  },
  couponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  couponTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  couponCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  couponCodeBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.success + '30',
    borderStyle: 'dashed',
  },
  couponCodeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  couponCopyBtn: {
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  couponCopyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  couponDiscount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
    marginTop: 8,
  },

  // ── Sections ──
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
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
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
