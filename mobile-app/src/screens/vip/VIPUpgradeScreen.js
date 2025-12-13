import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import colors from '../../theme/colors';
import Button from '../../components/common/Button';

export default function VIPUpgradeScreen({ navigation }) {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const benefits = [
    {
      icon: 'star',
      title: 'Ofertas Exclusivas',
      description: 'Acesso a produtos e cupons exclusivos para membros VIP',
    },
    {
      icon: 'flash',
      title: 'Notificações Prioritárias',
      description: 'Seja o primeiro a saber sobre novas promoções',
    },
    {
      icon: 'gift',
      title: 'Cupons Premium',
      description: 'Descontos maiores e cupons especiais',
    },
    {
      icon: 'shield-checkmark',
      title: 'Suporte Prioritário',
      description: 'Atendimento preferencial da equipe',
    },
  ];

  const handleUpgrade = async () => {
    Alert.alert(
      'Tornar-se VIP',
      'Deseja realmente se tornar um membro VIP?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setLoading(true);
            try {
              // Aqui você pode integrar com um sistema de pagamento
              // Por enquanto, apenas simula a atualização
              const result = await updateUser({ is_vip: true });
              if (result.success) {
                Alert.alert(
                  'Parabéns!',
                  'Você agora é um membro VIP!',
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              } else {
                Alert.alert('Erro', result.error || 'Não foi possível atualizar para VIP');
              }
            } catch (error) {
              Alert.alert('Erro', 'Ocorreu um erro ao processar sua solicitação');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (user?.is_vip) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.vipContainer}>
          <View style={styles.vipIconContainer}>
            <Ionicons name="star" size={64} color="#FFD700" />
          </View>
          <Text style={styles.vipTitle}>Você já é VIP!</Text>
          <Text style={styles.vipDescription}>
            Aproveite todos os benefícios exclusivos disponíveis para você.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="star" size={48} color="#FFD700" />
        </View>
        <Text style={styles.title}>Torne-se VIP</Text>
        <Text style={styles.subtitle}>
          Desbloqueie ofertas exclusivas e benefícios especiais
        </Text>
      </View>

      {/* Benefícios */}
      <View style={styles.benefitsSection}>
        <Text style={styles.sectionTitle}>Benefícios VIP</Text>
        {benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Ionicons name={benefit.icon} size={28} color={colors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitDescription}>{benefit.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Preço */}
      <View style={styles.priceSection}>
        <Text style={styles.priceLabel}>Valor</Text>
        <Text style={styles.price}>Grátis</Text>
        <Text style={styles.priceNote}>
          Entre em contato para mais informações sobre planos VIP
        </Text>
      </View>

      {/* Botão */}
      <Button
        title="Tornar-se VIP"
        onPress={handleUpgrade}
        loading={loading}
        style={styles.upgradeButton}
      />

      {/* Info */}
      <Text style={styles.infoText}>
        Ao se tornar VIP, você terá acesso imediato a todos os benefícios listados acima.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFD70015',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  benefitsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  benefitCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    } : {
      elevation: 2,
    }),
  },
  benefitIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  priceSection: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    } : {
      elevation: 2,
    }),
  },
  priceLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },
  price: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  priceNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  upgradeButton: {
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  vipContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  vipIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFD70015',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  vipTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  vipDescription: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
});

