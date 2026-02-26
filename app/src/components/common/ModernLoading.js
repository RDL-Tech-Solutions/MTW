import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';

/**
 * ModernLoading - Componente de loading moderno e animado
 * 
 * @param {string} icon - Nome do ícone Ionicons
 * @param {string} iconColor - Cor do ícone
 * @param {string} title - Texto principal
 * @param {string} subtitle - Texto secundário
 */
export default function ModernLoading({
  icon = 'apps',
  iconColor,
  title = 'Carregando...',
  subtitle,
}) {
  const { colors } = useThemeStore();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
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

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: -10,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const s = createStyles(colors);

  return (
    <Animated.View
      style={[
        s.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: floatingAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Ionicons name={icon} size={64} color={iconColor || colors.primary} />
      </Animated.View>
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={{ marginTop: 20 }}
      />
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
    </Animated.View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: colors.background,
  },
  title: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
