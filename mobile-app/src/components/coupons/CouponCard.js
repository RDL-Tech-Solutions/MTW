import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Componente de card de cupom baseado no design do Mercado Livre e Shopee
 */
export default function CouponCard({ coupon, onPress }) {
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

  const getPlatformIcon = () => {
    switch (coupon.platform) {
      case 'mercadolivre':
        return '🛒';
      case 'shopee':
        return '🛍️';
      case 'amazon':
        return '📦';
      case 'aliexpress':
        return '🌐';
      default:
        return '🎁';
    }
  };

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

  return (
    <TouchableOpacity
      style={[styles.card, getPlatformStyle()]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header com ícone e plataforma */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{getPlatformIcon()}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.platformName}>
            {coupon.platform === 'mercadolivre' ? 'MERCADO LIVRE' : 
             coupon.platform === 'shopee' ? 'SHOPEE' :
             coupon.platform === 'amazon' ? 'AMAZON' :
             coupon.platform === 'aliexpress' ? 'ALIEXPRESS' : 'CUPOM'}
          </Text>
          {coupon.title && (
            <Text style={styles.couponTitle} numberOfLines={2}>
              {coupon.title}
            </Text>
          )}
        </View>
      </View>

      {/* Valor do desconto */}
      <View style={styles.discountContainer}>
        <Text style={styles.discountValue}>{formatDiscount()}</Text>
      </View>

      {/* Condições */}
      <View style={styles.conditionsContainer}>
        {formatMinPurchase() && (
          <Text style={styles.conditionText}>{formatMinPurchase()}</Text>
        )}
        {formatMaxDiscount() && (
          <Text style={styles.conditionText}>{formatMaxDiscount()}</Text>
        )}
        <Text style={styles.applicabilityText}>{getApplicabilityText()}</Text>
      </View>

      {/* Divisor */}
      <View style={styles.divider} />

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.expiryContainer}>
          <Text style={styles.clockIcon}>🕐</Text>
          <Text style={styles.expiryText}>{formatExpiry() || 'Sem data de expiração'}</Text>
        </View>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>
            {coupon.platform === 'mercadolivre' ? 'Eu quero' : 'Conferir produtos'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  couponTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  discountContainer: {
    marginBottom: 12,
  },
  discountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  conditionsContainer: {
    marginBottom: 12,
  },
  conditionText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  applicabilityText: {
    fontSize: 13,
    color: '#9CA3AF',
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
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D1D5DB',
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
    color: '#6B7280',
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
});

