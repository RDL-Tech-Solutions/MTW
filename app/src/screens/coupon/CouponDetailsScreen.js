import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Share,
  Animated,
  Platform,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../stores/productStore';
import { useThemeStore } from '../../theme/theme';
import { PlatformIcon, getPlatformColor, getPlatformName } from '../../utils/platformIcons';
import { SCREEN_NAMES } from '../../utils/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CouponDetailsScreen({ route, navigation }) {
  const { coupon: initialCoupon } = route.params || {};
  const { fetchCouponById, fetchProductById } = useProductStore();
  const { colors } = useThemeStore();
  const [coupon, setCoupon] = useState(initialCoupon);
  const [loading, setLoading] = useState(!initialCoupon);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkedProducts, setLinkedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showProducts, setShowProducts] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!initialCoupon || !initialCoupon?.id) {
      loadCoupon();
    } else {
      loadLinkedProducts(initialCoupon);
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadCoupon = async () => {
    if (!initialCoupon?.id) return;
    setLoading(true);
    const result = await fetchCouponById(initialCoupon.id);
    setLoading(false);
    if (result.success) {
      setCoupon(result.coupon);
      loadLinkedProducts(result.coupon);
    } else {
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do cupom');
      navigation.goBack();
    }
  };

  const loadLinkedProducts = async (couponData) => {
    if (!couponData) return;

    // Check if coupon has applicable_products (array of product IDs)
    const productIds = couponData.applicable_products;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      setLoadingProducts(false);
      return;
    }

    setLoadingProducts(true);
    try {
      const results = await Promise.allSettled(
        productIds.slice(0, 10).map(id => fetchProductById(id))
      );
      const products = results
        .filter(r => r.status === 'fulfilled' && r.value.success)
        .map(r => r.value.product);
      setLinkedProducts(products);
    } catch (e) {
      console.log('Error loading linked products:', e);
    }
    setLoadingProducts(false);
  };

  const platformColor = coupon ? getPlatformColor(coupon.platform) : colors.primary;

  const handleCopyCode = async () => {
    if (coupon.code) {
      await Clipboard.setStringAsync(coupon.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    }
  };

  const handleOpenLink = async () => {
    try {
      const url = coupon.affiliate_link || coupon.link;
      if (!url) {
        Alert.alert('Erro', 'Link não disponível');
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o link');
    }
  };

  const handleShare = async () => {
    try {
      const message = `🎁 ${coupon.title || 'Cupom de Desconto'}\n\n${coupon.code ? `Código: ${coupon.code}\n` : ''}${coupon.affiliate_link || coupon.link || ''}`;
      await Share.share({ message });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  const handleProductPress = (product) => {
    navigation.navigate(SCREEN_NAMES.PRODUCT_DETAILS, { product });
  };

  const formatDiscount = () => {
    if (!coupon) return '';
    if (coupon.discount_type === 'percentage') return `${coupon.discount_value}%`;
    return `R$${coupon.discount_value}`;
  };

  const getExpiryInfo = () => {
    if (!coupon.valid_until) return { text: 'Sem prazo definido', urgent: false, icon: 'time-outline' };
    const date = new Date(coupon.valid_until);
    const today = new Date();
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Expirado', urgent: true, icon: 'close-circle-outline' };
    if (diffDays === 0) return { text: 'Vence hoje!', urgent: true, icon: 'alert-circle-outline' };
    if (diffDays === 1) return { text: 'Vence amanhã!', urgent: true, icon: 'alert-circle-outline' };
    if (diffDays <= 3) return { text: `${diffDays} dias restantes`, urgent: true, icon: 'timer-outline' };
    return { text: `Válido até ${date.toLocaleDateString('pt-BR')}`, urgent: false, icon: 'calendar-outline' };
  };

  const formatPrice = (price) => {
    const num = parseFloat(price);
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  };

  // ── Loading state ──────────────────────────────────────
  if (loading || !coupon) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textMuted, fontSize: 14 }}>Carregando detalhes...</Text>
      </View>
    );
  }

  const expiry = getExpiryInfo();
  const hasProducts = linkedProducts.length > 0;

  // ── Mini Product Card for linked products ──
  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={s.productCard}
      onPress={() => handleProductPress(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.image_url }}
        style={s.productImage}
        resizeMode="contain"
      />
      <View style={s.productInfo}>
        <Text style={s.productName} numberOfLines={2}>{item.name}</Text>
        <View style={s.productPriceRow}>
          {item.old_price > item.current_price && (
            <Text style={s.productOldPrice}>
              {formatPrice(item.old_price)}
            </Text>
          )}
          <Text style={s.productPrice}>{formatPrice(item.current_price)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
    </TouchableOpacity>
  );

  const s = createStyles(colors, platformColor);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={platformColor} />

      {/* ── Header ── */}
      <LinearGradient
        colors={[platformColor, darkenColor(platformColor)]}
        style={s.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={s.headerNav}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Cupom de Desconto</Text>
          <TouchableOpacity onPress={handleShare} style={s.headerBtn}>
            <Ionicons name="share-social-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Hero discount */}
        <View style={s.heroSection}>
          <View style={s.discountBadge}>
            <Text style={s.discountValue}>{formatDiscount()}</Text>
            <Text style={s.discountLabel}>OFF</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Main Card ── */}
          <View style={s.mainCard}>
            {/* Platform + Title */}
            <View style={s.platformRow}>
              <PlatformIcon platform={coupon.platform} size={28} />
              <Text style={s.platformName}>{getPlatformName(coupon.platform)}</Text>
              {coupon.is_exclusive && (
                <View style={s.exclusiveBadge}>
                  <Ionicons name="star" size={10} color="#B45309" />
                  <Text style={s.exclusiveText}>VIP</Text>
                </View>
              )}
            </View>

            {coupon.title && (
              <Text style={s.couponTitle}>{coupon.title}</Text>
            )}

            {/* Validity Row */}
            <View style={[s.validityRow, expiry.urgent && s.validityRowUrgent]}>
              <Ionicons name={expiry.icon} size={16} color={expiry.urgent ? '#DC2626' : '#6B7280'} />
              <Text style={[s.validityText, expiry.urgent && s.validityTextUrgent]}>
                {expiry.text}
              </Text>
            </View>

            {/* Conditions */}
            {coupon.min_purchase > 0 && (
              <View style={s.conditionRow}>
                <Ionicons name="wallet-outline" size={16} color="#9CA3AF" />
                <Text style={s.conditionText}>Compra mínima: {formatPrice(coupon.min_purchase)}</Text>
              </View>
            )}

            {coupon.description && (
              <View style={s.conditionRow}>
                <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
                <Text style={s.conditionText}>{coupon.description}</Text>
              </View>
            )}
          </View>

          {/* ── Code + Copy Section ── */}
          {coupon.code ? (
            <View style={s.codeCard}>
              <Text style={s.codeLabel}>CÓDIGO DO CUPOM</Text>

              <View style={s.codeBox}>
                <View style={s.codeTextContainer}>
                  <Ionicons name="ticket-outline" size={20} color={platformColor} />
                  <Text style={s.codeText}>{coupon.code}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[s.copyButton, codeCopied && s.copyButtonSuccess]}
                onPress={handleCopyCode}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={codeCopied ? 'checkmark-circle' : 'copy-outline'}
                  size={20}
                  color="#fff"
                />
                <Text style={s.copyButtonText}>
                  {codeCopied ? 'Código Copiado!' : 'Copiar Código'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.codeCard}>
              <View style={s.noCodeBox}>
                <Ionicons name="link-outline" size={22} color={platformColor} />
                <Text style={s.noCodeText}>Cupom aplicado automaticamente pelo link</Text>
              </View>
            </View>
          )}

          {/* ── Linked Products Section ── */}
          {loadingProducts ? (
            <View style={s.productsLoadingContainer}>
              <ActivityIndicator size="small" color={platformColor} />
            </View>
          ) : hasProducts ? (
            <View style={s.productsSection}>
              <TouchableOpacity
                style={s.productsHeader}
                onPress={() => setShowProducts(!showProducts)}
                activeOpacity={0.7}
              >
                <View style={s.productsHeaderLeft}>
                  <Ionicons name="bag-handle-outline" size={20} color={platformColor} />
                  <Text style={s.productsTitle}>Produtos com este cupom</Text>
                </View>
                <View style={s.productsCountBadge}>
                  <Text style={[s.productsCountText, { color: platformColor }]}>
                    {linkedProducts.length}
                  </Text>
                </View>
                <Ionicons
                  name={showProducts ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>

              {showProducts && (
                <View style={s.productsList}>
                  {linkedProducts.map((product) => (
                    <View key={product.id}>
                      {renderProductItem({ item: product })}
                    </View>
                  ))}
                </View>
              )}

              {!showProducts && (
                <TouchableOpacity
                  style={[s.viewProductsBtn, { borderColor: platformColor }]}
                  onPress={() => setShowProducts(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="grid-outline" size={18} color={platformColor} />
                  <Text style={[s.viewProductsBtnText, { color: platformColor }]}>
                    Ver {linkedProducts.length} {linkedProducts.length === 1 ? 'produto' : 'produtos'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

        </Animated.View>
      </ScrollView>

      {/* ── Fixed Footer ── */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.footerBtn, { backgroundColor: platformColor }]}
          onPress={handleOpenLink}
          activeOpacity={0.85}
        >
          <Text style={s.footerBtnText}>Ir para a loja</Text>
          <Ionicons name="arrow-forward-circle" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Helper ────────────────────────────────────────────────
const darkenColor = (hex) => {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - 35);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - 35);
    const b = Math.max(0, (num & 0x0000FF) - 35);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  } catch {
    return '#333';
  }
};

// ── Styles ────────────────────────────────────────────────
const createStyles = (colors, platformColor) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F1F3',
  },

  // Header
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight + 12,
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  discountValue: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 56,
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  discountLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
  },

  // Scroll
  scrollContent: {
    paddingTop: 0,
    paddingHorizontal: 16,
    paddingBottom: 110,
  },

  // Main Card
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: -16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    } : {
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    }),
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  platformName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    flex: 1,
  },
  exclusiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  exclusiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  couponTitle: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 12,
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  validityRowUrgent: {
    backgroundColor: '#FEF2F2',
  },
  validityText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  validityTextUrgent: {
    color: '#DC2626',
    fontWeight: '600',
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
  },
  conditionText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },

  // Code Card
  codeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    } : {
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    }),
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  codeBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 16,
  },
  codeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: platformColor,
    borderRadius: 14,
    height: 52,
    gap: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 4px 14px ${platformColor}44`,
    } : {
      elevation: 3,
      shadowColor: platformColor,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    }),
  },
  copyButtonSuccess: {
    backgroundColor: '#16A34A',
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  noCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  noCodeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },

  // Products Section
  productsLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  productsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 12,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    } : {
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    }),
  },
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  productsHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  productsCountBadge: {
    backgroundColor: platformColor + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  productsCountText: {
    fontSize: 12,
    fontWeight: '800',
  },
  viewProductsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  viewProductsBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  productsList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  // Product mini-card
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    gap: 12,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    lineHeight: 18,
    marginBottom: 4,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productOldPrice: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
    } : {
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    }),
  },
  footerBtn: {
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  footerBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
