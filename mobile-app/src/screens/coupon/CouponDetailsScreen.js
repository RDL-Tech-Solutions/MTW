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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../stores/productStore';
import { useThemeStore } from '../../theme/theme';
import Button from '../../components/common/Button';
import { getPlatformIcon, getPlatformColor, getPlatformName } from '../../utils/platformIcons';

export default function CouponDetailsScreen({ route, navigation }) {
  const { coupon: initialCoupon } = route.params || {};
  const { fetchCouponById } = useProductStore();
  const { colors } = useThemeStore();
  const [coupon, setCoupon] = useState(initialCoupon);
  const [loading, setLoading] = useState(!initialCoupon);
  const [codeCopied, setCodeCopied] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!initialCoupon || !initialCoupon?.id) {
      loadCoupon();
    }

    // Entrada animada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Pulse animation para o botão de código
  useEffect(() => {
    if (coupon?.code && !codeCopied) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [coupon, codeCopied]);

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

  const platformColor = coupon ? getPlatformColor(coupon.platform) : colors.primary;
  const PlatformIconComponent = coupon ? getPlatformIcon(coupon.platform, 40) : null;

  const formatDiscount = () => {
    if (!coupon) return '0% OFF';
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value || 0}%`;
    }
    const value = coupon.discount_value || 0;
    return `R$ ${typeof value === 'number' ? value.toFixed(0) : parseFloat(value).toFixed(0)}`;
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
    });
  };

  const handleCopyCode = async () => {
    if (coupon.code) {
      await Clipboard.setStringAsync(coupon.code);
      setCodeCopied(true);

      // Feedback visual
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(pulseAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();

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
        Alert.alert('Erro', 'Não foi possível abrir o link');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o link');
    }
  };

  const handleShare = async () => {
    try {
      const message = `🎁 Cupom de desconto!\\n\\n${coupon.title || 'Cupom'}\\n\\n${formatDiscount()} OFF\\n\\n${coupon.code ? `Código: ${coupon.code}\\n\\n` : ''}${coupon.affiliate_link || coupon.link || ''}`;

      await Share.share({
        message,
        title: coupon.title || 'Cupom de Desconto',
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  const dynamicStyles = createDynamicStyles(colors, platformColor);

  if (loading) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <Text style={dynamicStyles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!coupon) {
    return (
      <View style={dynamicStyles.errorContainer}>
        <Text style={dynamicStyles.errorText}>Cupom não encontrado</Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      {/* Header com gradiente */}
      <LinearGradient
        colors={[platformColor, platformColor + 'CC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={dynamicStyles.headerGradient}
      >
        <TouchableOpacity
          style={dynamicStyles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={dynamicStyles.headerContent}>
          {/* Ícone da plataforma */}
          <View style={dynamicStyles.platformIconLarge}>
            {PlatformIconComponent}
          </View>

          <Text style={dynamicStyles.platformNameLarge}>
            {getPlatformName(coupon.platform)}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Card de desconto principal */}
          <View style={dynamicStyles.discountCard}>
            {coupon.is_exclusive && (
              <View style={dynamicStyles.exclusiveBanner}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={dynamicStyles.exclusiveText}>CUPOM EXCLUSIVO VIP</Text>
              </View>
            )}

            <Text style={dynamicStyles.discountLabel}>ECONOMIZE</Text>
            <Text style={[dynamicStyles.discountValue, { color: platformColor }]}>
              {formatDiscount()}
            </Text>
            <Text style={dynamicStyles.offText}>DE DESCONTO</Text>

            {/* Código do cupom */}
            {coupon.code && (
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[dynamicStyles.codeBox, { borderColor: platformColor }]}
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  <View style={dynamicStyles.codeContent}>
                    <Ionicons
                      name={codeCopied ? "checkmark-circle" : "ticket"}
                      size={24}
                      color={codeCopied ? colors.success : platformColor}
                    />
                    <View style={dynamicStyles.codeTextContainer}>
                      <Text style={dynamicStyles.codeLabel}>
                        {codeCopied ? 'Copiado!' : 'Código do cupom'}
                      </Text>
                      <Text style={[dynamicStyles.codeText, { color: platformColor }]}>
                        {coupon.code}
                      </Text>
                    </View>
                    <Ionicons
                      name={codeCopied ? "checkmark" : "copy-outline"}
                      size={20}
                      color={codeCopied ? colors.success : platformColor}
                    />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Título */}
            {coupon.title && (
              <Text style={dynamicStyles.title}>{coupon.title}</Text>
            )}
          </View>

          {/* Informações */}
          <View style={dynamicStyles.infoSection}>
            {/* Validade */}
            <View style={dynamicStyles.infoCard}>
              <View style={dynamicStyles.infoHeader}>
                <Ionicons name="time-outline" size={24} color={platformColor} />
                <Text style={dynamicStyles.infoTitle}>Validade</Text>
              </View>
              <Text style={dynamicStyles.infoText}>{formatExpiry()}</Text>
            </View>

            {/* Condições */}
            <View style={dynamicStyles.infoCard}>
              <View style={dynamicStyles.infoHeader}>
                <Ionicons name="information-circle-outline" size={24} color={platformColor} />
                <Text style={dynamicStyles.infoTitle}>Condições</Text>
              </View>

              {coupon.min_purchase > 0 && (
                <View style={dynamicStyles.conditionRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={dynamicStyles.conditionText}>
                    Compra mínima de R$ {coupon.min_purchase.toFixed(2)}
                  </Text>
                </View>
              )}

              {coupon.max_discount_value > 0 && (
                <View style={dynamicStyles.conditionRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={dynamicStyles.conditionText}>
                    Desconto máximo de R$ {coupon.max_discount_value.toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={dynamicStyles.conditionRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={dynamicStyles.conditionText}>
                  {coupon.is_general
                    ? 'Válido para todos os produtos'
                    : `Válido para produtos específicos`}
                </Text>
              </View>
            </View>

            {/* Descrição */}
            {coupon.description && (
              <View style={dynamicStyles.infoCard}>
                <View style={dynamicStyles.infoHeader}>
                  <Ionicons name="document-text-outline" size={24} color={platformColor} />
                  <Text style={dynamicStyles.infoTitle}>Descrição</Text>
                </View>
                <Text style={dynamicStyles.description}>{coupon.description}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer fixo com botões */}
      <View style={dynamicStyles.footer}>
        <TouchableOpacity
          style={dynamicStyles.shareButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-social" size={22} color={platformColor} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[dynamicStyles.actionButton, { backgroundColor: platformColor }]}
          onPress={handleOpenLink}
          activeOpacity={0.8}
        >
          <Text style={dynamicStyles.actionButtonText}>
            {coupon.code ? 'Usar cupom agora' : 'Ver oferta'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createDynamicStyles = (colors, platformColor) => StyleSheet.create({
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
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  platformIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
    } : {
      elevation: 4,
    }),
  },
  platformNameLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  discountCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: -20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    } : {
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    }),
  },
  exclusiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 16,
  },
  exclusiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 1,
  },
  discountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 1,
  },
  discountValue: {
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -2,
    marginBottom: 4,
  },
  offText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
    letterSpacing: 1,
  },
  codeBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  codeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  codeTextContainer: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  infoCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  infoText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  conditionText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
    } : {
      elevation: 8,
    }),
  },
  shareButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
