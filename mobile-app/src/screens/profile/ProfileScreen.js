import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../theme/theme';
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

  const MenuItem = ({ icon, title, subtitle, onPress, danger }) => (
    <TouchableOpacity 
      style={dynamicStyles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[dynamicStyles.menuIconContainer, danger && dynamicStyles.menuIconDanger]}>
        <Ionicons 
          name={icon} 
          size={24} 
          color={danger ? colors.error : colors.primary} 
        />
      </View>
      <View style={dynamicStyles.menuContent}>
        <Text style={[dynamicStyles.menuTitle, danger && dynamicStyles.menuTitleDanger]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={dynamicStyles.menuSubtitle}>{subtitle}</Text>
        )}
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color={colors.textMuted} 
      />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.avatarContainer}>
          <Text style={dynamicStyles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={dynamicStyles.name}>{user?.name || 'Usuário'}</Text>
        <Text style={dynamicStyles.email}>{user?.email || ''}</Text>
        
        {user?.is_vip && (
          <View style={dynamicStyles.vipBadge}>
            <Ionicons name="star" size={16} color={colors.warning} />
            <Text style={dynamicStyles.vipText}>VIP</Text>
          </View>
        )}
      </View>

      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>Conta</Text>
        
        <MenuItem
          icon="person-outline"
          title="Editar Perfil"
          subtitle="Nome, email e senha"
          onPress={() => navigation.navigate(SCREEN_NAMES.EDIT_PROFILE)}
        />
        <MenuItem
          icon="settings-outline"
          title="Configurações"
          subtitle="Notificações e preferências"
          onPress={() => navigation.navigate(SCREEN_NAMES.SETTINGS)}
        />
        
        {!user?.is_vip && (
          <MenuItem
            icon="star-outline"
            title="Seja VIP"
            subtitle="Acesso a ofertas exclusivas"
            onPress={() => navigation.navigate(SCREEN_NAMES.VIP_UPGRADE)}
          />
        )}
      </View>

      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>Sobre</Text>
        
        <MenuItem
          icon="information-circle-outline"
          title="Sobre o App"
          subtitle="Versão 1.0.0"
          onPress={() => navigation.navigate(SCREEN_NAMES.ABOUT)}
        />
      </View>

      <View style={dynamicStyles.section}>
        <MenuItem
          icon="log-out-outline"
          title="Sair"
          onPress={handleLogout}
          danger
        />
      </View>

      <View style={dynamicStyles.footer}>
        <Text style={dynamicStyles.footerText}>PreçoCerto © 2024</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 32,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: colors.textMuted,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    gap: 4,
  },
  vipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
  },
  section: {
    marginTop: 24,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIconDanger: {
    backgroundColor: colors.errorLight,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  menuTitleDanger: {
    color: colors.error,
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    padding: 24,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
