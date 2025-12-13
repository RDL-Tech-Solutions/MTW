import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../stores/productStore';
import Button from '../../components/common/Button';
import colors from '../../theme/colors';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '../../utils/constants';

export default function CouponDetailsScreen({ route, navigation }) {
  const { coupon: initialCoupon } = route.params;
  const { fetchCouponById } = useProductStore();
  const [coupon, setCoupon] = useState(initialCoupon);
  const [loading, setLoading] = useState(!initialCoupon);

  useEffect(() => {
    if (!initialCoupon && initialCoupon?.id) {
      loadCoupon();
    }
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
    }
  };

  const formatDiscount = () => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    }
    return `R$ ${coupon.discount_value.toFixed(2)} OFF`;
  };

  const formatExpiry = () => {
    if (!coupon.valid_until) return 'Sem data de expiração';
    
    const date = new Date(coupon.valid_until);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expirado';
    if (diffDays === 0) return 'Vence hoje';
    if (diffDays === 1) return 'Vence amanhã';
    if (diffDays <= 7) return `Vence em ${diffDays} dias`;
    
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const handleCopyCode = async () => {
    if (coupon.code) {
      await Clipboard.setStringAsync(coupon.code);
      Alert.alert('Sucesso', 'Código copiado para a área de transferência!');
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
        Alert.alert('Erro', 'Não foi possível abrir o link');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o link');
    }
  };

  const handleShare = async () => {
    try {
      const message = `🎁 Cupom de desconto!\n\n${coupon.title || 'Cupom'}\n\n${formatDiscount()}\n\n${coupon.code ? `Código: ${coupon.code}\n\n` : ''}${coupon.affiliate_link || coupon.link || ''}`;
      
      await Share.share({
        message,
        title: coupon.title || 'Cupom de Desconto',
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!coupon) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Cupom não encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header com plataforma */}
        <View style={[
          styles.header,
          { backgroundColor: PLATFORM_COLORS[coupon.platform] + '20' }
        ]}>
          <View style={styles.platformContainer}>
            <Text style={styles.platformLabel}>
              {PLATFORM_LABELS[coupon.platform] || 'Cupom'}
            </Text>
          </View>
          
          {coupon.title && (
            <Text style={styles.title}>{coupon.title}</Text>
          )}
        </View>

        {/* Valor do desconto */}
        <View style={styles.discountContainer}>
          <Text style={styles.discountValue}>{formatDiscount()}</Text>
          {coupon.code && (
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Código:</Text>
              <TouchableOpacity 
                style={styles.codeBox}
                onPress={handleCopyCode}
              >
                <Text style={styles.codeText}>{coupon.code}</Text>
                <Ionicons name="copy-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Condições */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Condições</Text>
          
          {coupon.min_purchase > 0 && (
            <View style={styles.conditionRow}>
              <Ionicons name="cash-outline" size={20} color={colors.textMuted} />
              <Text style={styles.conditionText}>
                Compra mínima: R$ {coupon.min_purchase.toFixed(2)}
              </Text>
            </View>
          )}

          {coupon.max_discount_value > 0 && (
            <View style={styles.conditionRow}>
              <Ionicons name="trophy-outline" size={20} color={colors.textMuted} />
              <Text style={styles.conditionText}>
                Desconto máximo: R$ {coupon.max_discount_value.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.conditionRow}>
            <Ionicons name="apps-outline" size={20} color={colors.textMuted} />
            <Text style={styles.conditionText}>
              {coupon.is_general 
                ? 'Válido para todos os produtos' 
                : `Válido para produtos selecionados${coupon.applicable_products?.length ? ` (${coupon.applicable_products.length})` : ''}`}
            </Text>
          </View>
        </View>

        {/* Validade */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Validade</Text>
          <View style={styles.conditionRow}>
            <Ionicons name="time-outline" size={20} color={colors.textMuted} />
            <Text style={styles.conditionText}>{formatExpiry()}</Text>
          </View>
        </View>

        {/* Descrição */}
        {coupon.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descrição</Text>
            <Text style={styles.description}>{coupon.description}</Text>
          </View>
        )}

        {/* Produtos aplicáveis */}
        {!coupon.is_general && coupon.applicable_products && coupon.applicable_products.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Produtos Aplicáveis ({coupon.applicable_products.length})
            </Text>
            <Text style={styles.description}>
              Este cupom pode ser usado em produtos específicos da plataforma.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer com ações */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={20} color={colors.primary} />
          <Text style={styles.shareButtonText}>Compartilhar</Text>
        </TouchableOpacity>
        
        <Button
          title={coupon.code ? "Usar Código" : "Ver Oferta"}
          onPress={handleOpenLink}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
  },
  header: {
    padding: 24,
    paddingTop: 32,
  },
  platformContainer: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  platformLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  discountContainer: {
    backgroundColor: colors.white,
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  discountValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 16,
  },
  codeContainer: {
    width: '100%',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: 8,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 2,
  },
  section: {
    backgroundColor: colors.white,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  conditionText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 22,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  actionButton: {
    flex: 1,
  },
});

