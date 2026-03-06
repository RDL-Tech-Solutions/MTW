import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
  StatusBar,
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

  // Animações
  const headerAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Animações de entrada
    Animated.parallel([
      Animated.spring(headerAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
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

    // Animação de pulso para o avatar
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

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

  const headerTranslateY = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  return (
    <View style={dynamicStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Modern Header */}
      <Animated.View
        style={[
          dynamicStyles.header,
          {
            opacity: headerAnim,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <View style={dynamicStyles.headerContent}>
          <Animated.View
            style={[
              dynamicStyles.avatarLarge,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={dynamicStyles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </Animated.View>
          
          <View style={dynamicStyles.userInfo}>
            <Text style={dynamicStyles.userName}>{user?.name || 'Usuário'}</Text>
            <Text style={dynamicStyles.userEmail}>{user?.email || ''}</Text>
          </View>

          <TouchableOpacity
            style={dynamicStyles.editButton}
            onPress={() => navigation.navigate(SCREEN_NAMES.EDIT_PROFILE)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={[dynamicStyles.content, { opacity: fadeAnim }]}
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
            icon="document-text-outline"
            iconColor={colors.info}
            title="Termos de Uso"
            subtitle="Condições de utilização"
            onPress={() => navigation.navigate(SCREEN_NAMES.TERMS)}
          />

          <MenuCard
            icon="shield-checkmark-outline"
            iconColor={colors.success}
            title="Política de Privacidade"
            subtitle="Como protegemos seus dados"
            onPress={() => navigation.navigate(SCREEN_NAMES.PRIVACY_POLICY)}
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
        <Animated.View
          style={[
            dynamicStyles.footer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={dynamicStyles.footerText}>PreçoCerto © 2026</Text>
          <Text style={dynamicStyles.footerSubtext}>
            Feito com ❤️ para você economizar
          </Text>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 12,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...(Platform.OS === 'web' ? {} : {
      elevation: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
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
    fontWeight: '800',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 2,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
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
