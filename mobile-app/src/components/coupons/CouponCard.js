import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';
import { getPlatformIcon, getPlatformColor, getPlatformName } from '../../utils/platformIcons';

/**
 * Componente de card de cupom baseado no design do Mercado Livre e Shopee
 */
export default function CouponCard({ coupon, onPress }) {
  const { colors } = useThemeStore();
  const getPlatformStyle = () => {
    switch (coupon.platform) {
      case 'mercadolivre':
        return styles.meliCard;
      case 'shopee':
        return styles.shopeeCard;
      case 'amazon':
        return styles.amazonCard;
      case 'aliexpress':
        return styles.aliCard;
      default:
        return styles.defaultCard;
    }
  };

  // Usar ícone oficial da plataforma
  const PlatformIconComponent = getPlatformIcon(coupon.platform, 24);

  const formatDiscount = () => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    }
    return `R$ ${coupon.discount_value} OFF`;
  };

  const formatMinPurchase = () => {
    if (coupon.min_purchase > 0) {
      return `Compra mínima: R$ ${coupon.min_purchase.toFixed(2)}`;
    }
    return null;
  };

  const formatMaxDiscount = () => {
    if (coupon.max_discount_value > 0) {
      return `Limite máximo: R$ ${coupon.max_discount_value.toFixed(2)}`;
    }
    return null;
  };

  const formatExpiry = () => {
    if (coupon.valid_until) {
      const date = new Date(coupon.valid_until);
      const today = new Date();
      const diffTime = date - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'Vence hoje';
      } else if (diffDays === 1) {
        return 'Vence amanhã';
      } else if (diffDays <= 7) {
        return `Vence em ${diffDays} dias`;
      } else {
        const day = date.getDate();
        const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        return `Vence em ${day} de ${monthNames[date.getMonth()]}`;
      }
    }
    return null;
  };

  const getApplicabilityText = () => {
    if (coupon.is_general) {
      return 'Válido para todos os produtos';
    }
    return `Em produtos selecionados${coupon.applicable_products?.length ? ` (${coupon.applicable_products.length})` : ''}`;
  };

  const cardStyles = StyleSheet.create({
    card: {
      backgroundColor: coupon.is_exclusive ? '#FFF9E6' : colors.card,
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
      marginHorizontal: 16,
      borderWidth: coupon.is_exclusive ? 2 : 0,
      borderColor: coupon.is_exclusive ? '#FFD700' : 'transparent',
      ...(Platform.OS === 'web' ? {
        boxShadow: coupon.is_exclusive 
          ? '0 4px 12px rgba(255, 215, 0, 0.3)' 
          : '0 2px 4px rgba(0, 0, 0, 0.1)',
      } : {
        elevation: coupon.is_exclusive ? 6 : 3,
      }),
    },
  });

  return (
    <TouchableOpacity
      style={[cardStyles.card, getPlatformStyle(), coupon.is_out_of_stock && styles.outOfStockCard]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={coupon.is_out_of_stock}
    >
      {/* Badge de Esgotado */}
      {coupon.is_out_of_stock && (
        <View style={styles.outOfStockBadge}>
          <Ionicons name="close-circle" size={16} color="#FFFFFF" />
          <Text style={styles.outOfStockText}>ESGOTADO</Text>
        </View>
      )}

      {/* Badge de Exclusivo */}
      {coupon.is_exclusive && !coupon.is_out_of_stock && (
        <View style={styles.exclusiveBadge}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.exclusiveText}>EXCLUSIVO</Text>
        </View>
      )}

      {/* Header com ícone e plataforma */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          {PlatformIconComponent}
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.platformName, { color: colors.textMuted }]}>
            {getPlatformName(coupon.platform).toUpperCase()}
          </Text>
          {coupon.title && (
            <Text style={[styles.couponTitle, { color: colors.text }]} numberOfLines={2}>
              {coupon.title}
            </Text>
          )}
        </View>
      </View>

      {/* Valor do desconto */}
      <View style={styles.discountContainer}>
        <Text style={[styles.discountValue, { color: colors.text }]}>{formatDiscount()}</Text>
      </View>

      {/* Condições */}
      <View style={styles.conditionsContainer}>
        {formatMinPurchase() && (
          <Text style={[styles.conditionText, { color: colors.textMuted }]}>{formatMinPurchase()}</Text>
        )}
        {formatMaxDiscount() && (
          <Text style={[styles.conditionText, { color: colors.textMuted }]}>{formatMaxDiscount()}</Text>
        )}
        <Text style={[styles.applicabilityText, { color: colors.textLight }]}>{getApplicabilityText()}</Text>
      </View>

      {/* Divisor */}
      <View style={[styles.divider, { backgroundColor: colors.border, borderColor: colors.borderDark }]} />

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.expiryContainer}>
          <Text style={styles.clockIcon}>🕐</Text>
          <Text style={[styles.expiryText, { color: colors.textMuted }]}>{formatExpiry() || 'Sem data de expiração'}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.actionButton, coupon.is_out_of_stock && styles.actionButtonDisabled]}
          disabled={coupon.is_out_of_stock}
        >
          <Text style={[styles.actionButtonText, coupon.is_out_of_stock && styles.actionButtonTextDisabled]}>
            {coupon.is_out_of_stock 
              ? 'Esgotado' 
              : coupon.platform === 'mercadolivre' 
                ? 'Eu quero' 
                : 'Conferir produtos'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outOfStockCard: {
    opacity: 0.6,
  },
  outOfStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    gap: 4,
  },
  outOfStockText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  exclusiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    gap: 4,
  },
  exclusiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  meliCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFE600', // Amarelo Mercado Livre
  },
  shopeeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EE4D2D', // Laranja Shopee
  },
  amazonCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9900', // Laranja Amazon
  },
  aliCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6A00', // Laranja AliExpress
  },
  defaultCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1', // Indigo padrão
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  platformName: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  couponTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  discountContainer: {
    marginBottom: 12,
  },
  discountValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  conditionsContainer: {
    marginBottom: 12,
  },
  conditionText: {
    fontSize: 14,
    marginBottom: 4,
  },
  applicabilityText: {
    fontSize: 13,
    marginBottom: 8,
  },
  limitBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  limitText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clockIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  expiryText: {
    fontSize: 12,
  },
  actionButton: {
    backgroundColor: '#EE4D2D', // Cor padrão (Shopee/Mercado Livre)
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  actionButtonTextDisabled: {
    color: '#FFFFFF',
  },
});

