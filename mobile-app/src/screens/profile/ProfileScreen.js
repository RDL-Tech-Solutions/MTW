import React from 'react';
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
import { useThemeStore } from '../../theme/theme';
import GradientHeader from '../../components/common/GradientHeader';
import MenuCard from '../../components/common/MenuCard';
import { SCREEN_NAMES } from '../../utils/constants';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const { colors } = useThemeStore();

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: logout
        },
      ]
    );
  };

  const dynamicStyles = createStyles(colors);

  return (
    <View style={dynamicStyles.container}>
      {/* Gradient Header with avatar */}
      <GradientHeader
        title={user?.name || 'Usuário'}
        subtitle={user?.email || ''}
        gradientColors={colors.gradients.primary}
        height={160}
        leftComponent={
          <View style={dynamicStyles.avatarLarge}>
            <Text style={dynamicStyles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        }
        rightComponent={
          <TouchableOpacity
            style={dynamicStyles.editButton}
            onPress={() => navigation.navigate(SCREEN_NAMES.EDIT_PROFILE)}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={dynamicStyles.content}
        contentContainerStyle={dynamicStyles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Conta Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>CONTA</Text>

          <MenuCard
            icon="person-outline"
            iconColor={colors.iconColors.account}
            title="Editar Perfil"
            subtitle="Nome, email e senha"
            onPress={() => navigation.navigate(SCREEN_NAMES.EDIT_PROFILE)}
          />

          <MenuCard
            icon="settings-outline"
            iconColor={colors.iconColors.settings}
            title="Configurações"
            subtitle="Notificações e preferências"
            onPress={() => navigation.navigate(SCREEN_NAMES.SETTINGS)}
          />

          <MenuCard
            icon="heart-outline"
            iconColor={colors.error}
            title="Favoritos"
            subtitle="Produtos que você salvou"
            onPress={() => navigation.navigate(SCREEN_NAMES.FAVORITES)}
          />
        </View>

        {/* Sobre Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>SOBRE</Text>

          <MenuCard
            icon="information-circle-outline"
            iconColor={colors.iconColors.about}
            title="Sobre o App"
            subtitle="Versão 1.0.0"
            onPress={() => navigation.navigate(SCREEN_NAMES.ABOUT)}
          />

          <MenuCard
            icon="help-circle-outline"
            iconColor={colors.info}
            title="Ajuda e Suporte"
            subtitle="Central de ajuda"
            onPress={() => {
              // TODO: Implementar ajuda
              Alert.alert('Em breve', 'Central de ajuda em desenvolvimento');
            }}
          />
        </View>

        {/* Danger Zone */}
        <View style={dynamicStyles.section}>
          <MenuCard
            icon="log-out-outline"
            title="Sair da Conta"
            subtitle="Desconectar do aplicativo"
            onPress={handleLogout}
            danger
          />
        </View>

        {/* Footer */}
        <View style={dynamicStyles.footer}>
          <Text style={dynamicStyles.footerText}>PreçoCerto © 2024</Text>
          <Text style={dynamicStyles.footerSubtext}>
            Feito com ❤️ para você economizar
          </Text>
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
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    } : {
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    }),
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    } : {
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    }),
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
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
