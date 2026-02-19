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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../stores/productStore';
import { useThemeStore } from '../../theme/theme';
import { getPlatformIcon, getPlatformColor, getPlatformName } from '../../utils/platformIcons';

const { width } = Dimensions.get('window');

export default function CouponDetailsScreen({ route, navigation }) {
  const { coupon: initialCoupon } = route.params || {};
  const { fetchCouponById } = useProductStore();
  const { colors } = useThemeStore();
  const [coupon, setCoupon] = useState(initialCoupon);
  const [loading, setLoading] = useState(!initialCoupon);
  const [codeCopied, setCodeCopied] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (!initialCoupon || !initialCoupon?.id) {
      loadCoupon();
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
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
    } else {
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do cupom');
      navigation.goBack();
    }
  };

  const platformColor = coupon ? getPlatformColor(coupon.platform) : colors.primary;
  const PlatformIconComponent = coupon ? getPlatformIcon(coupon.platform, 48) : null;

  const handleCopyCode = async () => {
    if (coupon.code) {
      await Clipboard.setStringAsync(coupon.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleOpenLink = async () => {
    try {
      const url = coupon.affiliate_link || coupon.link;
      if (!url) {
        Alert.alert('Erro', 'Link não disponível');
        return;
      }
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url); // Try rendering anyway or handle error
      }
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

  const formatDiscount = () => {
    if (!coupon) return '';
    if (coupon.discount_type === 'percentage') return `${coupon.discount_value}% OFF`;
    return `R$ ${coupon.discount_value} OFF`;
  };

  const getExpiryText = () => {
    if (!coupon.valid_until) return 'Válido por tempo indeterminado';
    const date = new Date(coupon.valid_until);
    const today = new Date();
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expirado';
    if (diffDays === 0) return 'Vence hoje!';
    if (diffDays === 1) return 'Vence amanhã!';
    return `Válido até ${date.toLocaleDateString('pt-BR')}`;
  };

  if (loading || !coupon) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor={platformColor} />
        <Text style={{ marginTop: 20, color: colors.textMuted }}>Carregando detalhes...</Text>
      </View>
    );
  }

  const s = createStyles(colors, platformColor);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={platformColor} />

      {/* Background Gradient Header */}
      <LinearGradient
        colors={[platformColor, platformColor + 'CC']}
        style={s.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={s.headerNav}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Detalhes do Cupom</Text>
          <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
            <Ionicons name="share-social-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Main Ticket Card */}
          <View style={s.ticketContainer}>
            {/* Top Section: Store & Discount */}
            <View style={s.ticketTop}>
              <View style={s.storeBadge}>
                {PlatformIconComponent}
              </View>
              <Text style={s.storeName}>{getPlatformName(coupon.platform)}</Text>

              <Text style={s.discountText}>{formatDiscount()}</Text>
              <Text style={s.couponTitle}>{coupon.title}</Text>

              {coupon.is_exclusive && (
                <View style={s.exclusiveTag}>
                  <Ionicons name="star" size={12} color="#854D0E" />
                  <Text style={s.exclusiveText}>CUPOM EXCLUSIVO</Text>
                </View>
              )}
            </View>

            {/* Dotted Divider with Cutouts */}
            <View style={s.dividerContainer}>
              <View style={s.circleLeft} />
              <View style={s.dottedLine}>
                {[...Array(15)].map((_, i) => (
                  <View key={i} style={s.dot} />
                ))}
              </View>
              <View style={s.circleRight} />
            </View>

            {/* Bottom Section: Code & Action */}
            <View style={s.ticketBottom}>
              <Text style={s.sectionLabel}>CÓDIGO DO CUPOM</Text>

              {coupon.code ? (
                <TouchableOpacity
                  style={[s.codeContainer, codeCopied && s.codeContainerCopied]}
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  <Text style={s.codeText}>{coupon.code}</Text>
                  <View style={[s.copyBtn, codeCopied && s.copyBtnSuccess]}>
                    <Ionicons
                      name={codeCopied ? "checkmark" : "copy-outline"}
                      size={18}
                      color={codeCopied ? "#fff" : platformColor}
                    />
                    <Text style={[s.copyBtnText, codeCopied && { color: '#fff' }]}>
                      {codeCopied ? 'COPIADO' : 'COPIAR'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={s.noCodeContainer}>
                  <Text style={s.noCodeText}>Não é necessário código</Text>
                  <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
                </View>
              )}

              <Text style={s.validityText}>{getExpiryText()}</Text>
            </View>
          </View>

          {/* Rules / Description Section */}
          <View style={s.rulesContainer}>
            <Text style={s.rulesTitle}>Regras & Detalhes</Text>

            {coupon.min_purchase > 0 && (
              <View style={s.ruleRow}>
                <Ionicons name="wallet-outline" size={20} color={colors.textLight} />
                <Text style={s.ruleText}>Mínimo de compra: R$ {coupon.min_purchase.toFixed(2)}</Text>
              </View>
            )}

            {coupon.description ? (
              <View style={s.ruleRow}>
                <Ionicons name="document-text-outline" size={20} color={colors.textLight} />
                <Text style={s.ruleText}>{coupon.description}</Text>
              </View>
            ) : (
              <View style={s.ruleRow}>
                <Ionicons name="pricetag-outline" size={20} color={colors.textLight} />
                <Text style={s.ruleText}>Válido para produtos selecionados no link.</Text>
              </View>
            )}
          </View>

        </Animated.View>
      </ScrollView>

      {/* Fixed Footer */}
      <View style={s.footer}>
        <TouchableOpacity
          style={s.footerBtn}
          onPress={handleOpenLink}
          activeOpacity={0.9}
        >
          <Text style={s.footerBtnText}>Ir para a loja</Text>
          <Ionicons name="arrow-forward-circle" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors, platformColor) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerGradient: {
    height: 180,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    paddingHorizontal: 20,
  },
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  shareBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  ticketContainer: {
    marginTop: -80, // Overlap header
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    } : {
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
    }),
  },
  ticketTop: {
    padding: 24,
    alignItems: 'center',
  },
  storeBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  discountText: {
    fontSize: 32,
    fontWeight: '800',
    color: platformColor,
    marginBottom: 8,
    textAlign: 'center',
  },
  couponTitle: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  exclusiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  exclusiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#854D0E',
  },
  dividerContainer: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#fff',
  },
  circleLeft: {
    position: 'absolute',
    left: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6', // Match screen bg
  },
  circleRight: {
    position: 'absolute',
    right: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6', // Match screen bg
  },
  dottedLine: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 30,
    overflow: 'hidden',
  },
  dot: {
    width: 8,
    height: 2,
    backgroundColor: '#E5E7EB',
    borderRadius: 1,
  },
  ticketBottom: {
    padding: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: platformColor + '10', // 10% opacity
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: platformColor + '30',
    padding: 6,
    paddingLeft: 16,
    width: '100%',
    marginBottom: 16,
  },
  codeContainerCopied: {
    borderColor: colors.success,
    backgroundColor: colors.success + '10',
  },
  codeText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: platformColor + '20',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  copyBtnSuccess: {
    backgroundColor: colors.success,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: platformColor,
  },
  noCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
  },
  noCodeText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  validityText: {
    fontSize: 12,
    color: colors.textLight,
  },
  rulesContainer: {
    marginTop: 20,
    paddingHorizontal: 10,
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerBtn: {
    backgroundColor: platformColor,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: platformColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  footerBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
