import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';
import Logo from '../../components/common/Logo';
import ModernHeader from '../../components/common/ModernHeader';
import { SCREEN_NAMES } from '../../utils/constants';

export default function AboutScreen({ navigation }) {
  const { colors } = useThemeStore();
  const s = createStyles(colors);

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const socialInfo = [
    {
      icon: 'logo-instagram',
      label: 'Instagram',
      value: '@ofertasprecocerto',
      action: () => {
        const { Linking } = require('react-native');
        Linking.openURL('https://www.instagram.com/ofertasprecocerto').catch(() => { });
      },
    },
    {
      icon: 'logo-tiktok',
      label: 'TikTok',
      value: '@vprecocerto',
      action: () => {
        const { Linking } = require('react-native');
        Linking.openURL('https://www.tiktok.com/@vprecocerto').catch(() => { });
      },
    },
  ];

  const legalLinks = [
    { title: 'Termos de Uso', icon: 'document-text-outline', screen: SCREEN_NAMES.TERMS },
    { title: 'Política de Privacidade', icon: 'shield-checkmark-outline', screen: SCREEN_NAMES.PRIVACY_POLICY },
    { title: 'Política de Cookies', icon: 'finger-print-outline', screen: SCREEN_NAMES.COOKIE_POLICY },
  ];

  return (
    <View style={s.container}>
      <ModernHeader
        title="Sobre o App"
        subtitle="Conheça o PreçoCerto"
        icon="information-circle"
        showBack
        onBack={() => navigation.goBack()}
      />

      <Animated.ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
      >
        {/* Logo/Header */}
        <Animated.View
          style={[
            s.header,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={s.logoContainer}>
            <Logo width={140} height={140} color={colors.primary} />
          </View>
          <Text style={s.appName}>PreçoCerto</Text>
          <Text style={s.tagline}>As melhores ofertas em um só lugar</Text>
        </Animated.View>

        {/* Sobre */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sobre o App</Text>
          <Text style={s.description}>
            PreçoCerto é a plataforma completa para encontrar as melhores ofertas e cupons
            de desconto das principais lojas online. Economize tempo e dinheiro com
            promoções exclusivas atualizadas diariamente.
          </Text>
        </View>

        {/* Versão */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Versão</Text>
          <Text style={s.versionText}>1.0.0</Text>
          <Text style={s.versionDate}>Lançado em 2026</Text>
        </View>

        {/* Social */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Social</Text>
          {socialInfo.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={s.contactItem}
              onPress={item.action}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon} size={24} color={colors.primary} />
              <View style={s.contactInfo}>
                <Text style={s.contactLabel}>{item.label}</Text>
                <Text style={s.contactValue}>{item.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Legal */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Legal</Text>
          {legalLinks.map((link, index) => (
            <TouchableOpacity
              key={index}
              style={s.legalItem}
              onPress={() => navigation.navigate(link.screen)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name={link.icon} size={20} color={colors.primary} />
                <Text style={s.legalText}>{link.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Créditos */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Desenvolvido por</Text>
          <Text style={s.creditsText}>RDL Tech Solutions</Text>
          <Text style={s.creditsSubtext}>© 2026 Todos os direitos reservados</Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 200, height: 200, borderRadius: 100, backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center', marginBottom: -20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    } : {
      elevation: 6,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    }),
  },
  appName: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 8, letterSpacing: 0.5 },
  tagline: { fontSize: 16, color: colors.textMuted, textAlign: 'center', fontWeight: '500' },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16, letterSpacing: 0.3 },
  description: { fontSize: 16, color: colors.textMuted, lineHeight: 24 },
  versionText: { fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  versionDate: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  contactItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    } : {
      elevation: 2,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
    }),
  },
  contactInfo: { flex: 1, marginLeft: 16 },
  contactLabel: { fontSize: 14, color: colors.textMuted, marginBottom: 4, fontWeight: '500' },
  contactValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  legalItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    } : {
      elevation: 2,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
    }),
  },
  legalText: { fontSize: 16, color: colors.text, fontWeight: '500' },
  creditsText: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  creditsSubtext: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
});
