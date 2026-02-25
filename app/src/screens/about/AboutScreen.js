import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';
import Logo from '../../components/common/Logo';
import { SCREEN_NAMES } from '../../utils/constants';

export default function AboutScreen({ navigation }) {
  const { colors } = useThemeStore();
  const s = createStyles(colors);

  const contactInfo = [
    {
      icon: 'mail-outline',
      label: 'Email',
      value: 'contato@mtwpromo.com',
      action: () => {
        const { Linking } = require('react-native');
        Linking.openURL('mailto:contato@mtwpromo.com').catch(() => { });
      },
    },
    {
      icon: 'globe-outline',
      label: 'Website',
      value: 'www.mtwpromo.com',
      action: () => {
        const { Linking } = require('react-native');
        Linking.openURL('https://www.mtwpromo.com').catch(() => { });
      },
    },
    {
      icon: 'logo-instagram',
      label: 'Instagram',
      value: '@mtwpromo',
      action: () => {
        const { Linking } = require('react-native');
        Linking.openURL('https://instagram.com/mtwpromo').catch(() => { });
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
      <StatusBar barStyle="dark-content" />
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerBarTitle}>Sobre o App</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Logo/Header */}
        <View style={s.header}>
          <View style={s.logoContainer}>
            <Logo width={100} height={100} color={colors.primary} />
          </View>
          <Text style={s.appName}>PreçoCerto</Text>
          <Text style={s.tagline}>As melhores ofertas em um só lugar</Text>
        </View>

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
          <Text style={s.versionDate}>Lançado em 2025</Text>
        </View>

        {/* Contato */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Contato</Text>
          {contactInfo.map((item, index) => (
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
          <Text style={s.creditsSubtext}>© 2025 Todos os direitos reservados</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight + 12,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerBarTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  content: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 160, height: 160, borderRadius: 80, backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  appName: { fontSize: 32, fontWeight: '700', color: colors.text, marginBottom: 8 },
  tagline: { fontSize: 16, color: colors.textMuted, textAlign: 'center' },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  description: { fontSize: 16, color: colors.textMuted, lineHeight: 24 },
  versionText: { fontSize: 20, fontWeight: '600', color: colors.primary, marginBottom: 4 },
  versionDate: { fontSize: 14, color: colors.textMuted },
  contactItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  contactInfo: { flex: 1, marginLeft: 16 },
  contactLabel: { fontSize: 14, color: colors.textMuted, marginBottom: 4 },
  contactValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  legalItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  legalText: { fontSize: 16, color: colors.text },
  creditsText: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  creditsSubtext: { fontSize: 14, color: colors.textMuted },
});
