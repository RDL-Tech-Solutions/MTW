import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';
import { getPlatformIcon, getPlatformColor, getPlatformName } from '../../utils/platformIcons';

/**
 * Componente de card de cupom profissional com animações
 */
export default function CouponCard({ coupon, onPress, index = 0 }) {
  const { colors } = useThemeStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
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

  const platformColor = getPlatformColor(coupon.platform);
  const PlatformIconComponent = getPlatformIcon(coupon.platform, 28);

  const formatDiscount = () => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    }
    return `R$ ${coupon.discount_value}`;
  };

  const formatExpiry = () => {
    if (!coupon.valid_until) return null;

    const date = new Date(coupon.valid_until);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '⚠️ Expirado';
    if (diffDays === 0) return '🔥 Expira hoje';
    if (diffDays === 1) return '⏰ Expira amanhã';
    if (diffDays <= 3) return `⚡ ${diffDays} dias restantes`;
    if (diffDays <= 7) return `${diffDays} dias`;

    return null;
  };

  const expiryText = formatExpiry();
  const isExpiringSoon = expiryText && expiryText.includes('⚡');
  const isExpiringToday = expiryText && expiryText.includes('🔥');

  const dynamicStyles = createDynamicStyles(colors, platformColor);

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
        style={[
          dynamicStyles.card,
          coupon.is_out_of_stock && dynamicStyles.outOfStockCard
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={coupon.is_out_of_stock}
      >
        {/* Gradient Overlay - Subtle */}
        <LinearGradient
          colors={coupon.is_exclusive
            ? ['rgba(255, 215, 0, 0.08)', 'transparent']
            : ['transparent', 'transparent']
          }
          style={StyleSheet.absoluteFill}
        />

        {/* Conteúdo */}
        <View style={dynamicStyles.content}>
          {/* Seção Esquerda - Desconto */}
          <View style={dynamicStyles.discountSection}>
            <View style={[dynamicStyles.discountCircle, { backgroundColor: platformColor + '15' }]}>
              <Text style={[dynamicStyles.discountValue, { color: platformColor }]}>
                {formatDiscount()}
              </Text>
              <Text style={[dynamicStyles.offText, { color: platformColor }]}>OFF</Text>
            </View>

            {/* Badges */}
            <View style={dynamicStyles.badgesContainer}>
              {coupon.is_exclusive && !coupon.is_out_of_stock && (
                <View style={dynamicStyles.exclusiveBadge}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={dynamicStyles.exclusiveText}>VIP</Text>
                </View>
              )}
              {expiryText && (
                <View style={[
                  dynamicStyles.expiryBadge,
                  (isExpiringSoon || isExpiringToday) && dynamicStyles.expiryUrgent
                ]}>
                  <Text style={[
                    dynamicStyles.expiryText,
                    (isExpiringSoon || isExpiringToday) && dynamicStyles.expiryTextUrgent
                  ]}>
                    {expiryText}
                  </Text>
                </View>
              )}
              {coupon.is_out_of_stock && (
                <View style={dynamicStyles.outOfStockBadge}>
                  <Text style={dynamicStyles.outOfStockText}>Esgotado</Text>
                </View>
              )}
            </View>
          </View>

          {/* Divisor vertical com tracejado */}
          <View style={dynamicStyles.dividerContainer}>
            <View style={[dynamicStyles.divider, { backgroundColor: colors.border }]} />
          </View>

          {/* Seção Direita - Informações */}
          <View style={dynamicStyles.infoSection}>
            {/* Header com plataforma */}
            <View style={dynamicStyles.platformHeader}>
              <View style={[dynamicStyles.platformIcon, { backgroundColor: platformColor + '15' }]}>
                {PlatformIconComponent}
              </View>
              <Text style={[dynamicStyles.platformName, { color: colors.textMuted }]}>
                {getPlatformName(coupon.platform)}
              </Text>
            </View>

            {/* Título */}
            {coupon.title && (
              <Text style={[dynamicStyles.title, { color: colors.text }]} numberOfLines={2}>
                {coupon.title}
              </Text>
            )}

            {/* Condições */}
            <View style={dynamicStyles.conditions}>
              {coupon.min_purchase > 0 && (
                <View style={dynamicStyles.conditionItem}>
                  <Ionicons name="cash-outline" size={14} color={colors.textMuted} />
                  <Text style={[dynamicStyles.conditionText, { color: colors.textMuted }]}>
                    Mín. R$ {coupon.min_purchase.toFixed(0)}
                  </Text>
                </View>
              )}
              {coupon.code && (
                <View style={dynamicStyles.conditionItem}>
                  <Ionicons name="ticket-outline" size={14} color={platformColor} />
                  <Text style={[dynamicStyles.codeText, { color: platformColor }]}>
                    {coupon.code}
                  </Text>
                </View>
              )}
            </View>

            {/* Botão de ação */}
            <TouchableOpacity
              style={[
                dynamicStyles.actionButton,
                { backgroundColor: platformColor },
                coupon.is_out_of_stock && dynamicStyles.actionButtonDisabled
              ]}
              disabled={coupon.is_out_of_stock}
            >
              <Text style={dynamicStyles.actionButtonText}>
                {coupon.is_out_of_stock ? 'Indisponível' : 'Ver oferta'}
              </Text>
              {!coupon.is_out_of_stock && (
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const createDynamicStyles = (colors, platformColor) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    } : {
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    }),
  },
  outOfStockCard: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    minHeight: 140,
  },
  discountSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
  },
  discountCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  discountValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  offText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: -4,
  },
  badgesContainer: {
    alignItems: 'center',
    gap: 6,
  },
  exclusiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  exclusiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFD700',
  },
  expiryBadge: {
    backgroundColor: colors.infoLight || '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  expiryUrgent: {
    backgroundColor: '#FEF3C7',
  },
  expiryText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#3B82F6',
  },
  expiryTextUrgent: {
    color: '#92400E',
  },
  outOfStockBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  outOfStockText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  dividerContainer: {
    width: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  divider: {
    width: 1,
    height: '100%',
    opacity: 0.3,
  },
  infoSection: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: 'space-between',
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  platformIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformName: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 8,
  },
  conditions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonDisabled: {
    backgroundColor: colors.border,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
