import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';

/**
 * StatsCard - Card de estatísticas animado
 * 
 * @param {array} stats - Array de objetos { icon, value, label, color }
 */
export default function StatsCard({ stats = [] }) {
  const { colors } = useThemeStore();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
          toValue: 1.08,
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

  const s = createStyles(colors);

  if (!stats || stats.length === 0) return null;

  return (
    <Animated.View
      style={[
        s.statsCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {stats.map((stat, index) => (
        <React.Fragment key={index}>
          {index > 0 && <View style={s.statDivider} />}
          <View style={s.statItem}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View
                style={[
                  s.statIconContainer,
                  { backgroundColor: stat.color || colors.primary + '15' },
                ]}
              >
                <Ionicons
                  name={stat.icon}
                  size={20}
                  color={stat.iconColor || colors.primary}
                />
              </View>
            </Animated.View>
            <View style={s.statTextContainer}>
              <Text
                style={[
                  s.statValue,
                  stat.valueColor && { color: stat.valueColor },
                ]}
              >
                {stat.value}
              </Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          </View>
        </React.Fragment>
      ))}
    </Animated.View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }
      : {
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        }),
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
});
