import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
  Alert,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotificationStore } from '../../stores/notificationStore';
import { useThemeStore } from '../../theme/theme';
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

  const s = createStyles(colors, isDark);

  // ── Section header ────────────────────────────────────────
  const SectionLabel = ({ label }) => (
    <Text style={s.sectionLabel}>{label}</Text>
  );

  // ── Toggle row ────────────────────────────────────────────
  const ToggleRow = ({ icon, iconBg, title, subtitle, value, onToggle, isLast }) => (
    <TouchableOpacity style={[s.row, !isLast && s.rowBorder]} onPress={onToggle} activeOpacity={0.7}>
      <View style={[s.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <View style={s.rowContent}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle ? <Text style={s.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary + '60' }}
        thumbColor={value ? colors.primary : colors.card}
        ios_backgroundColor={colors.border}
      />
    </TouchableOpacity>
  );

  // ── Nav row (arrow) ───────────────────────────────────────
  const NavRow = ({ icon, iconBg, title, subtitle, onPress, isLast, badge }) => (
    <TouchableOpacity style={[s.row, !isLast && s.rowBorder]} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <View style={s.rowContent}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle ? <Text style={s.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={[s.badge, { backgroundColor: badge.bg }]}>
          <Text style={[s.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Gradient Header */}
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Configurações</Text>
          <Text style={s.headerSubtitle}>Personalize sua experiência</Text>
        </View>
        <View style={s.headerIcon}>
          <Ionicons name="settings-outline" size={28} color="rgba(255,255,255,0.3)" />
        </View>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Notificações ─────────────────────────────────── */}
        <SectionLabel label="NOTIFICAÇÕES" />
        <View style={s.card}>
          <ToggleRow
            icon="notifications"
            iconBg="#3B82F6"
            title="Notificações Push"
            subtitle="Alertas de novas ofertas"
            value={preferences?.push_enabled || false}
            onToggle={() => handleToggle('push_enabled')}
          />
          <NavRow
            icon="options"
            iconBg="#0EA5E9"
            title="Configurar Notificações"
            subtitle="Ativar e gerenciar notificações push"
            onPress={() => navigation.navigate(SCREEN_NAMES.NOTIFICATION_SETTINGS)}
            isLast
          />
        </View>

        {/* ── Aparência ─────────────────────────────────────── */}
        <SectionLabel label="APARÊNCIA" />
        <View style={s.card}>
          <ToggleRow
            icon="moon"
            iconBg="#8B5CF6"
            title="Modo Escuro"
            subtitle={isDark ? 'Ativado' : 'Desativado'}
            value={isDark}
            onToggle={toggleTheme}
            isLast
          />
        </View>

        {/* ── Conta ─────────────────────────────────────────── */}
        <SectionLabel label="CONTA" />
        <View style={s.card}>
          <NavRow
            icon="person-circle"
            iconBg="#F59E0B"
            title="Perfil"
            subtitle="Ver e editar informações"
            onPress={() => navigation.navigate(SCREEN_NAMES.PROFILE)}
            isLast
          />
        </View>

        {/* ── Sobre ─────────────────────────────────────────── */}
        <SectionLabel label="SOBRE" />
        <View style={s.card}>
          <NavRow
            icon="information-circle"
            iconBg="#6B7280"
            title="Sobre o App"
            subtitle="Versão e informações"
            onPress={() => navigation.navigate(SCREEN_NAMES.ABOUT)}
          />
          <NavRow
            icon="document-text"
            iconBg="#3B82F6"
            title="Termos de Uso"
            subtitle="Condições de utilização"
            onPress={() => navigation.navigate(SCREEN_NAMES.TERMS)}
          />
          <NavRow
            icon="shield-checkmark"
            iconBg="#10B981"
            title="Política de Privacidade"
            subtitle="Como protegemos seus dados"
            onPress={() => navigation.navigate(SCREEN_NAMES.PRIVACY_POLICY)}
          />
          <NavRow
            icon="finger-print"
            iconBg="#F59E0B"
            title="Política de Cookies"
            subtitle="Uso de cookies no app"
            onPress={() => navigation.navigate(SCREEN_NAMES.COOKIE_POLICY)}
            isLast
          />
        </View>



        {/* Footer */}
        <View style={s.footer}>
          <Ionicons name="shield-checkmark" size={28} color={colors.success} />
          <Text style={s.footerTitle}>Seus dados estão seguros</Text>
          <Text style={s.footerText}>
            Utilizamos criptografia de ponta a ponta para proteger suas informações
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight + 12,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  headerIcon: {
    width: 40,
    alignItems: 'center',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 20,
  },

  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    } : {
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.06,
      shadowRadius: 4,
    }),
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 14,
    minHeight: 60,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 1,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Footer
  footer: {
    marginTop: 32,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
  },
  footerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
});
