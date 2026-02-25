import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '../../stores/notificationStore';
import { useThemeStore } from '../../theme/theme';
import GradientHeader from '../../components/common/GradientHeader';
import MenuCard from '../../components/common/MenuCard';
import { SCREEN_NAMES } from '../../utils/constants';

export default function SettingsScreen({ navigation }) {
  const { preferences, updatePreferences } = useNotificationStore();
  const { colors, isDark, toggleTheme } = useThemeStore();

  const handleToggle = async (key) => {
    try {
      await updatePreferences({ [key]: !preferences[key] });
    } catch (error) {
      console.error('Erro ao atualizar preferência:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a preferência');
    }
  };

  const dynamicStyles = createStyles(colors);

  const SettingToggle = ({ icon, iconColor, title, subtitle, value, onToggle }) => (
    <MenuCard
      icon={icon}
      iconColor={iconColor}
      title={title}
      subtitle={subtitle}
      rightComponent={
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary + '60' }}
          thumbColor={value ? colors.primary : colors.textMuted}
          ios_backgroundColor={colors.border}
        />
      }
      showArrow={false}
      onPress={onToggle}
    />
  );

  return (
    <View style={dynamicStyles.container}>
      {/* Gradient Header */}
      <GradientHeader
        title="Configurações"
        subtitle="Personalize sua experiência"
        gradientColors={colors.gradients.purple}
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={dynamicStyles.content}
        contentContainerStyle={dynamicStyles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Notificações Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>NOTIFICAÇÕES</Text>

          <SettingToggle
            icon="notifications"
            iconColor={colors.iconColors.notifications}
            title="Notificações Push"
            subtitle="Receber alertas de novas ofertas"
            value={preferences?.enable_push || false}
            onToggle={() => handleToggle('enable_push')}
          />

          <SettingToggle
            icon="mail"
            iconColor={colors.info}
            title="E-mail"
            subtitle="Receber ofertas por e-mail"
            value={preferences?.enable_email || false}
            onToggle={() => handleToggle('enable_email')}
          />

          <MenuCard
            icon="filter"
            iconColor={colors.iconColors.notifications}
            title="Configurações de Notificação"
            subtitle="Filtros e preferências detalhadas"
            onPress={() => navigation.navigate(SCREEN_NAMES.NOTIFICATION_SETTINGS)}
          />
        </View>

        {/* Aparência Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>APARÊNCIA</Text>

          <SettingToggle
            icon="moon"
            iconColor={colors.iconColors.appearance}
            title="Modo Escuro"
            subtitle="Alterar tema do aplicativo"
            value={isDark}
            onToggle={toggleTheme}
          />
        </View>

        {/* Produtos Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>PRODUTOS</Text>

          <MenuCard
            icon="filter-outline"
            iconColor={colors.iconColors.products}
            title="Filtros da Home"
            subtitle="Personalizar produtos exibidos"
            onPress={() => navigation.navigate(SCREEN_NAMES.HOME_FILTERS)}
          />

          <SettingToggle
            icon="pricetag"
            iconColor={colors.warning}
            title="Apenas com Desconto"
            subtitle="Mostrar só produtos em promoção"
            value={preferences?.home_filters?.min_discount > 0 || false}
            onToggle={() => {
              const currentMin = preferences?.home_filters?.min_discount || 0;
              updatePreferences({
                home_filters: {
                  ...preferences?.home_filters,
                  min_discount: currentMin > 0 ? 0 : 10
                }
              });
            }}
          />
        </View>

        {/* Conta Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>CONTA</Text>

          <MenuCard
            icon="person-circle"
            iconColor={colors.iconColors.account}
            title="Perfil"
            subtitle="Ver e editar perfil"
            onPress={() => navigation.navigate(SCREEN_NAMES.PROFILE)}
          />

          <MenuCard
            icon="shield-checkmark"
            iconColor={colors.success}
            title="Privacidade"
            subtitle="Configurações de privacidade"
            onPress={() => {
              Alert.alert('Em Breve', 'Configurações de privacidade em desenvolvimento');
            }}
          />
        </View>

        {/* Sobre Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>SOBRE</Text>

          <MenuCard
            icon="information-circle"
            iconColor={colors.iconColors.about}
            title="Sobre o App"
            subtitle="Versão e informações"
            onPress={() => navigation.navigate(SCREEN_NAMES.ABOUT)}
          />

          <MenuCard
            icon="document-text"
            iconColor={colors.textMuted}
            title="Termos de Uso"
            subtitle="Política de privacidade"
            onPress={() => {
              Alert.alert('Em Breve', 'Termos de uso em desenvolvimento');
            }}
          />
        </View>

        {/* Footer Info */}
        <View style={dynamicStyles.footer}>
          <View style={[dynamicStyles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="shield-checkmark" size={32} color={colors.success} />
            <Text style={[dynamicStyles.infoTitle, { color: colors.text }]}>
              Seus dados estão seguros
            </Text>
            <Text style={[dynamicStyles.infoText, { color: colors.textMuted }]}>
              Utilizamos criptografia de ponta a ponta para proteger suas informações
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  footer: {
    marginTop: 24,
    paddingVertical: 20,
  },
  infoCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    } : {
      elevation: 3,
    }),
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
