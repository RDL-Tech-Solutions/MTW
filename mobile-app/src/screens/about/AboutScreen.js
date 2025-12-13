import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../theme/colors';

export default function AboutScreen() {
  const openLink = (url) => {
    Linking.openURL(url).catch((err) => console.error('Erro ao abrir link:', err));
  };

  const contactInfo = [
    {
      icon: 'mail-outline',
      label: 'Email',
      value: 'contato@mtwpromo.com',
      action: () => openLink('mailto:contato@mtwpromo.com'),
    },
    {
      icon: 'globe-outline',
      label: 'Website',
      value: 'www.mtwpromo.com',
      action: () => openLink('https://www.mtwpromo.com'),
    },
    {
      icon: 'logo-instagram',
      label: 'Instagram',
      value: '@mtwpromo',
      action: () => openLink('https://instagram.com/mtwpromo'),
    },
  ];

  const legalLinks = [
    { title: 'Termos de Uso', url: 'https://www.mtwpromo.com/terms' },
    { title: 'Política de Privacidade', url: 'https://www.mtwpromo.com/privacy' },
    { title: 'Política de Cookies', url: 'https://www.mtwpromo.com/cookies' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Logo/Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="flash" size={64} color={colors.primary} />
        </View>
        <Text style={styles.appName}>MTW Promo</Text>
        <Text style={styles.tagline}>As melhores ofertas em um só lugar</Text>
      </View>

      {/* Sobre */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sobre o App</Text>
        <Text style={styles.description}>
          MTW Promo é a plataforma completa para encontrar as melhores ofertas e cupons
          de desconto das principais lojas online. Economize tempo e dinheiro com
          promoções exclusivas atualizadas diariamente.
        </Text>
      </View>

      {/* Versão */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Versão</Text>
        <Text style={styles.versionText}>1.0.0</Text>
        <Text style={styles.versionDate}>Lançado em 2024</Text>
      </View>

      {/* Contato */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contato</Text>
        {contactInfo.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.contactItem}
            onPress={item.action}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon} size={24} color={colors.primary} />
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>{item.label}</Text>
              <Text style={styles.contactValue}>{item.value}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Legal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        {legalLinks.map((link, index) => (
          <TouchableOpacity
            key={index}
            style={styles.legalItem}
            onPress={() => openLink(link.url)}
            activeOpacity={0.7}
          >
            <Text style={styles.legalText}>{link.title}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Créditos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Desenvolvido por</Text>
        <Text style={styles.creditsText}>RDL Tech Solutions</Text>
        <Text style={styles.creditsSubtext}>© 2024 Todos os direitos reservados</Text>
      </View>
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
    marginTop: 20,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
  },
  versionText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  versionDate: {
    fontSize: 14,
    color: colors.textMuted,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    } : {
      elevation: 2,
    }),
  },
  contactInfo: {
    flex: 1,
    marginLeft: 16,
  },
  contactLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    } : {
      elevation: 2,
    }),
  },
  legalText: {
    fontSize: 16,
    color: colors.text,
  },
  creditsText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  creditsSubtext: {
    fontSize: 14,
    color: colors.textMuted,
  },
});

