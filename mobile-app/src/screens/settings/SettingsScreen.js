import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../theme/theme';
import { SCREEN_NAMES } from '../../utils/constants';

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme, colors } = useThemeStore();

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const MenuItem = ({ icon, title, subtitle, onPress, rightComponent, showArrow = true }) => (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name={icon} size={24} color={colors.primary} />
        </View>
        <View style={styles.menuItemText}>
          <Text style={[styles.menuItemTitle, { color: colors.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent || (showArrow && <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />)}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Notificações */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Notificações</Text>
        <MenuItem
          icon="notifications-outline"
          title="Configurar Notificações"
          subtitle="Categorias, palavras-chave e produtos"
          onPress={() => navigation.navigate(SCREEN_NAMES.NOTIFICATION_SETTINGS)}
        />
      </View>

      {/* Aparência */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Aparência</Text>
        <View style={[styles.menuItem, { backgroundColor: colors.card }]}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name={isDark ? "moon" : "moon-outline"} size={24} color={colors.primary} />
            </View>
            <View style={styles.menuItemText}>
              <Text style={[styles.menuItemTitle, { color: colors.text }]}>Modo Escuro</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>
                {isDark ? 'Ativado' : 'Desativado'}
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* Produtos */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Produtos</Text>
        <MenuItem
          icon="filter-outline"
          title="Filtros da Tela Inicial"
          subtitle="Escolha quais produtos aparecer"
          onPress={() => navigation.navigate(SCREEN_NAMES.HOME_FILTERS)}
        />
      </View>

      {/* Conta */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Conta</Text>
        <MenuItem
          icon="person-outline"
          title="Editar Perfil"
          subtitle="Nome, email e senha"
          onPress={() => navigation.navigate(SCREEN_NAMES.EDIT_PROFILE)}
        />
        {!user?.is_vip && (
          <MenuItem
            icon="star-outline"
            title="Tornar-se VIP"
            subtitle="Acesso a ofertas exclusivas"
            onPress={() => navigation.navigate(SCREEN_NAMES.VIP_UPGRADE)}
          />
        )}
        {user?.is_vip && (
          <View style={[styles.vipBadge, { backgroundColor: '#FFD70015' }]}>
            <Ionicons name="star" size={20} color="#FFD700" />
            <Text style={styles.vipText}>Você é VIP!</Text>
          </View>
        )}
      </View>

      {/* Sobre */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Sobre</Text>
        <MenuItem
          icon="information-circle-outline"
          title="Sobre o App"
          subtitle="Versão, termos e privacidade"
          onPress={() => navigation.navigate(SCREEN_NAMES.ABOUT)}
        />
        <MenuItem
          icon="help-circle-outline"
          title="Ajuda e Suporte"
          subtitle="FAQ e contato"
          onPress={() => Alert.alert('Suporte', 'Entre em contato: suporte@mtwpromo.com')}
        />
      </View>

      {/* Sair */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.card, borderColor: colors.error + '30' }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={24} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>

      {/* Versão */}
      <Text style={[styles.version, { color: colors.textMuted }]}>Versão 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    } : {
      elevation: 2,
    }),
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 14,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  vipText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
    marginBottom: 16,
  },
});
