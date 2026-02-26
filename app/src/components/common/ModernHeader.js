import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';

/**
 * ModernHeader - Componente de header moderno e animado
 * 
 * @param {string} title - Título principal
 * @param {string} subtitle - Subtítulo opcional
 * @param {string} icon - Nome do ícone Ionicons
 * @param {boolean} showBack - Mostrar botão voltar
 * @param {function} onBack - Callback do botão voltar
 * @param {node} children - Conteúdo adicional (search bar, etc)
 * @param {node} statsCard - Card de estatísticas opcional
 */
export default function ModernHeader({
  title,
  subtitle,
  icon = 'apps',
  showBack = false,
  onBack,
  children,
  statsCard,
}) {
  const { colors } = useThemeStore();
  
  // Animações
  const headerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animação de entrada
    Animated.spring(headerAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Animação de pulso contínua
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const headerTranslateY = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  const s = createStyles(colors);

  return (
    <Animated.View
      style={[
        s.headerBar,
        {
          opacity: headerAnim,
          transform: [{ translateY: headerTranslateY }],
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <View style={s.headerContent}>
        {showBack && (
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Ionicons name={icon} size={28} color="#fff" />
        </Animated.View>
        
        <View style={s.headerTextContainer}>
          <Text style={s.headerTitle}>{title}</Text>
          {subtitle && <Text style={s.headerSubtitle}>{subtitle}</Text>}
        </View>
      </View>

      {children}

      {statsCard}
    </Animated.View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  headerBar: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 12,
    paddingBottom: 16,
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
    marginBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 2,
  },
});
