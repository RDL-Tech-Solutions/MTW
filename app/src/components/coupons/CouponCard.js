import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Clipboard, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';
import { getPlatformIcon, getPlatformColor } from '../../utils/platformIcons';

/**
 * Enhanced ML-style coupon card with "ticket" visual and copy action
 */
export default function CouponCard({ coupon, onPress, index = 0 }) {
  const { colors } = useThemeStore();
  const [copied, setCopied] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Não renderizar cupons esgotados
  if (coupon.is_out_of_stock) {
    return null;
  }

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: Math.min(index * 40, 400),
      useNativeDriver: true,
    }).start();
  }, [index]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  const handleCopy = () => {
    if (coupon.code) {
      Clipboard.setString(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      onPress();
    }
  };

  const platformColor = getPlatformColor(coupon.platform);
  const PlatformIconComponent = getPlatformIcon(coupon.platform, 36);

  const formatDiscount = () => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    }
    return `R$${coupon.discount_value} OFF`;
  };

  const formatExpiry = () => {
    if (!coupon.valid_until) return null;
    const date = new Date(coupon.valid_until);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Expirado', urgent: true };
    if (diffDays === 0) return { text: 'Expira hoje', urgent: true };
    if (diffDays === 1) return { text: 'Expira amanhã', urgent: true };
    if (diffDays <= 3) return { text: `${diffDays} dias restantes`, urgent: true };

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return { text: `Vence ${day}/${month}`, urgent: false };
  };

  const expiry = formatExpiry();
  const s = createStyles(colors, platformColor);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[s.card, coupon.is_out_of_stock && s.outOfStockCard]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        disabled={coupon.is_out_of_stock}
      >
        {/* Left Section: Icon & Dotted Separator */}
        <View style={s.leftSection}>
          <View style={[s.platformIconWrapper, { backgroundColor: platformColor }]}>
            {PlatformIconComponent}
          </View>
          {/* Vertical Dotted Line */}
          <View style={s.dottedLineContainer}>
            {[...Array(6)].map((_, i) => (
              <View key={i} style={[s.dot, { backgroundColor: colors.border }]} />
            ))}
          </View>
          {/* Circle Cutouts */}
          <View style={[s.circleCutout, s.cutoutTop, { backgroundColor: colors.background }]} />
          <View style={[s.circleCutout, s.cutoutBottom, { backgroundColor: colors.background }]} />
        </View>

        {/* Center: Info */}
        <View style={s.infoSection}>
          <Text style={s.discountTitle} numberOfLines={1}>
            {formatDiscount()}
            {coupon.is_exclusive && <Text style={s.exclusiveTag}> ★ VIP</Text>}
          </Text>

          {coupon.title && (
            <Text style={s.subtitle} numberOfLines={1}>
              {coupon.title}
            </Text>
          )}

          <View style={s.conditionsRow}>
            {coupon.min_purchase > 0 && (
              <Text style={s.conditionText}>
                Mín. R${coupon.min_purchase.toFixed(0)}
              </Text>
            )}
            {coupon.code && (
              <View style={[s.codeBadge, { backgroundColor: platformColor + '10' }]}>
                <Text style={[s.codeText, { color: platformColor }]}>{coupon.code}</Text>
              </View>
            )}
          </View>

          <View style={s.bottomRow}>
            {expiry && (
              <Text style={[s.expiryText, expiry.urgent && { color: colors.warning }]}>
                {expiry.text}
              </Text>
            )}
            {coupon.is_out_of_stock && (
              <Text style={s.outOfStockText}>Esgotado</Text>
            )}
          </View>
        </View>

        {/* Right: Action button */}
        <View style={s.actionContainer}>
          {coupon.code ? (
            <TouchableOpacity
              style={[
                s.actionButton,
                { backgroundColor: coupon.is_out_of_stock ? colors.border : (copied ? colors.success : platformColor) }
              ]}
              onPress={coupon.is_out_of_stock ? null : handleCopy}
              disabled={coupon.is_out_of_stock}
            >
              <Text style={[s.actionButtonText, coupon.is_out_of_stock && { color: colors.textMuted }]}>
                {coupon.is_out_of_stock ? 'Esgotado' : (copied ? 'Copiado!' : 'Pegar')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                s.actionButton,
                { borderColor: coupon.is_out_of_stock ? colors.border : platformColor, borderWidth: 1, backgroundColor: 'transparent' }
              ]}
              onPress={coupon.is_out_of_stock ? null : onPress}
              disabled={coupon.is_out_of_stock}
            >
              <Text style={[s.actionButtonText, { color: coupon.is_out_of_stock ? colors.textMuted : platformColor }]}>
                {coupon.is_out_of_stock ? 'Esgotado' : 'Ver'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (colors, platformColor) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    minHeight: 130,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
    } : {
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    }),
  },
  outOfStockCard: {
    opacity: 0.5,
  },
  leftSection: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderRightWidth: 0,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  platformIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    } : {
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    }),
  },
  dottedLineContainer: {
    position: 'absolute',
    right: 0,
    top: 20,
    bottom: 20,
    justifyContent: 'space-between',
    width: 3,
    zIndex: 1,
  },
  dot: {
    width: 3,
    height: 8,
    borderRadius: 2,
  },
  circleCutout: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    right: -12,
    zIndex: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cutoutTop: {
    top: -12,
  },
  cutoutBottom: {
    bottom: -12,
  },
  infoSection: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  discountTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  exclusiveTag: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFB800',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
    fontWeight: '500',
    lineHeight: 18,
  },
  conditionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  conditionText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  codeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: platformColor + '30',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expiryText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  outOfStockText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.error,
    letterSpacing: 0.3,
  },
  actionContainer: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    } : {
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    }),
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
