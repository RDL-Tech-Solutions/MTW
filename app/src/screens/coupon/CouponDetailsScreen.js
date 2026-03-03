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
import api from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CouponDetailsScreen({ route, navigation }) {
  const { coupon: initialCoupon } = route.params || {};
  const { fetchCouponById, checkLinkedProductsCount } = useProductStore();
  const { colors } = useThemeStore();
  const [coupon, setCoupon] = useState(initialCoupon);
  const [loading, setLoading] = useState(!initialCoupon);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkedProductsCount, setLinkedProductsCount] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!initialCoupon || !initialCoupon?.id) {
      loadCoupon();
    } else {
      checkProducts(initialCoupon);
      // Registrar visualização silenciosamente
      api.post(`/coupons/${initialCoupon.id}/view`).catch(e => console.log('Erro ao registrar view:', e.message));
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
      // DEBUG: Log para verificar o que chegou do backend
      console.log('🔍 Cupom recebido do backend:', {
        code: result.coupon.code,
        is_general: result.coupon.is_general,
        tipo_is_general: typeof result.coupon.is_general,
        applicable_products: result.coupon.applicable_products
      });

      setCoupon(result.coupon);
      checkProducts(result.coupon);
      // Registrar visualização silenciosamente
      api.post(`/coupons/${result.coupon.id}/view`).catch(e => console.log('Erro ao registrar view:', e.message));
    } else {
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do cupom');
      navigation.goBack();
    }
  };

  const checkProducts = async (couponData) => {
    if (!couponData || !couponData.id) return;
    setLoadingProducts(true);
    try {
      const result = await checkLinkedProductsCount(couponData.id);
      if (result.success) {
        setLinkedProductsCount(result.total);
      }
    } catch (e) {
      console.log('Error checking linked products count:', e);
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
  const hasProducts = linkedProductsCount > 0;

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

            {coupon.max_discount_value > 0 && (
              <View style={s.conditionRow}>
                <Ionicons name="trending-down-outline" size={16} color="#9CA3AF" />
                <Text style={s.conditionText}>Desconto máximo: {formatPrice(coupon.max_discount_value)}</Text>
              </View>
            )}

            {coupon.description && (
              <View style={s.conditionRow}>
                <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
                <Text style={s.conditionText}>{coupon.description}</Text>
              </View>
            )}

            {/* CORREÇÃO: Indicador de aplicabilidade do cupom */}
            <View style={s.conditionRow}>
              <Ionicons
                name={coupon.is_general === false ? "pricetag-outline" : "globe-outline"}
                size={16}
                color="#9CA3AF"
              />
              <Text style={s.conditionText}>
                {/* DEBUG: Mostrar valor real */}
                {console.log('🎯 Renderizando aplicabilidade:', {
                  is_general: coupon.is_general,
                  tipo: typeof coupon.is_general,
                  resultado: coupon.is_general === false ? 'ESPECÍFICO' : 'GERAL'
                })}
                {coupon.is_general === false
                  ? 'Válido para produtos selecionados'
                  : `Válido para todos os produtos ${coupon.platform !== 'general' ? `da ${getPlatformName(coupon.platform)}` : ''}`}
              </Text>
            </View>
          </View>

          {/* ── Code + Copy Section ── */}
          {coupon.code ? (
            <View style={s.codeCard}>
              <Text style={s.codeLabel}>CÓDIGO DO CUPOM</Text>

              <View style={s.codeBox}>
                <View style={s.codeTextContainer}>
                  <Ionicons name="ticket-outline" size={20} color={coupon.is_out_of_stock ? '#9CA3AF' : platformColor} />
                  <Text style={[s.codeText, coupon.is_out_of_stock && { textDecorationLine: 'line-through', color: '#9CA3AF' }]}>{coupon.code}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  s.copyButton,
                  coupon.is_out_of_stock ? { backgroundColor: '#E5E7EB' } : (codeCopied && s.copyButtonSuccess)
                ]}
                onPress={coupon.is_out_of_stock ? null : handleCopyCode}
                activeOpacity={0.8}
                disabled={coupon.is_out_of_stock}
              >
                <Ionicons
                  name={coupon.is_out_of_stock ? 'close-circle-outline' : (codeCopied ? 'checkmark-circle' : 'copy-outline')}
                  size={20}
                  color={coupon.is_out_of_stock ? '#9CA3AF' : '#fff'}
                />
                <Text style={[s.copyButtonText, coupon.is_out_of_stock && { color: '#9CA3AF' }]}>
                  {coupon.is_out_of_stock ? 'Esgotado' : (codeCopied ? 'Código Copiado!' : 'Copiar Código')}
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
            <View style={[s.productsSection, { padding: 16 }]}>
              <TouchableOpacity
                style={[s.viewProductsBtn, { borderColor: platformColor, backgroundColor: platformColor, marginBottom: 0, marginTop: 0 }]}
                onPress={() => navigation.navigate(SCREEN_NAMES.LINKED_PRODUCTS, { couponId: coupon.id, platformColor })}
                activeOpacity={0.8}
              >
                <Ionicons name="bag-handle-outline" size={20} color="#fff" />
                <Text style={[s.viewProductsBtnText, { color: '#fff' }]}>
                  Ver {linkedProductsCount} produto{linkedProductsCount !== 1 ? 's' : ''} com este cupom
                </Text>
              </TouchableOpacity>
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
    backgroundColor: colors.card,
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
    color: colors.text,
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
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
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
    color: colors.textMuted,
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
    color: colors.textMuted,
    lineHeight: 19,
  },

  // Code Card
  codeCard: {
    backgroundColor: colors.card,
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
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
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
    color: colors.text,
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
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
  },
  noCodeText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
    flex: 1,
  },

  // Products Section
  productsLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  productsSection: {
    backgroundColor: colors.card,
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
    color: colors.text,
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
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    gap: 12,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
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
    color: colors.text,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
