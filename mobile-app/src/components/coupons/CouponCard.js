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
  const PlatformIconComponent = getPlatformIcon(coupon.platform, 24);

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
          <View style={[s.platformCircle, { backgroundColor: platformColor + '15' }]}>
            {PlatformIconComponent}
          </View>
          {/* Vertical Dotted Line */}
          <View style={s.dottedLineContainer}>
            {[...Array(6)].map((_, i) => (
              <View key={i} style={[s.dot, { backgroundColor: colors.border }]} />
            ))}
          </View>
          {/* Circle Cutouts */}
          <View style={[s.circleCutout, s.cutoutTop, { backgroundColor: '#EBEBEB' }]} />
          <View style={[s.circleCutout, s.cutoutBottom, { backgroundColor: '#EBEBEB' }]} />
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
              style={[s.actionButton, { backgroundColor: copied ? colors.success : platformColor }]}
              onPress={handleCopy}
            >
              <Text style={s.actionButtonText}>
                {copied ? 'Copiado!' : 'Pegar'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.actionButton, { borderColor: platformColor, borderWidth: 1, backgroundColor: 'transparent' }]}
              onPress={onPress}
            >
              <Text style={[s.actionButtonText, { color: platformColor }]}>Ver</Text>
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
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    height: 100, // Fixed height for ticket look
    overflow: 'hidden',
    borderWidth: 1, // Subtle border
    borderColor: colors.border,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
    } : {
      elevation: 2,
    }),
  },
  outOfStockCard: {
    opacity: 0.6,
  },
  leftSection: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderRightWidth: 0,
  },
  platformCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dottedLineContainer: {
    position: 'absolute',
    right: 0,
    top: 10,
    bottom: 10,
    justifyContent: 'space-between',
    width: 1,
    zIndex: 1,
  },
  dot: {
    width: 1,
    height: 4,
    borderRadius: 1,
  },
  circleCutout: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    right: -8,
    zIndex: 3,
    borderWidth: 1, // Optional: verify if border looks good on cutout
    borderColor: 'transparent', // Usually handled by parent background, but here we hardcoded #EBEBEB to match screen bg
  },
  cutoutTop: {
    top: -8,
  },
  cutoutBottom: {
    bottom: -8,
  },
  infoSection: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16, // Extra padding because of cutouts
    justifyContent: 'center',
  },
  discountTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  exclusiveTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFB800',
  },
  subtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 6,
  },
  conditionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  conditionText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expiryText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.error,
  },
  actionContainer: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
