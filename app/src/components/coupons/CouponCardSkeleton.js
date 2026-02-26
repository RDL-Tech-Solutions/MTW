import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { useThemeStore } from '../../theme/theme';

export default function CouponCardSkeleton() {
  const { colors } = useThemeStore();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const s = createStyles(colors);

  return (
    <View style={s.card}>
      {/* Left Section */}
      <View style={s.leftSection}>
        <Animated.View style={[s.circleSkeleton, { opacity }]} />
      </View>

      {/* Info Section */}
      <View style={s.infoSection}>
        <Animated.View style={[s.titleSkeleton, { opacity }]} />
        <Animated.View style={[s.subtitleSkeleton, { opacity }]} />
        <Animated.View style={[s.badgeSkeleton, { opacity }]} />
        <Animated.View style={[s.expirySkeleton, { opacity }]} />
      </View>

      {/* Action Section */}
      <View style={s.actionContainer}>
        <Animated.View style={[s.buttonSkeleton, { opacity }]} />
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    minHeight: 120,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
    } : {
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
    }),
  },
  leftSection: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  circleSkeleton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
  },
  infoSection: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  titleSkeleton: {
    height: 20,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  subtitleSkeleton: {
    height: 14,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 10,
    width: '90%',
  },
  badgeSkeleton: {
    height: 24,
    backgroundColor: colors.border,
    borderRadius: 6,
    marginBottom: 8,
    width: '50%',
  },
  expirySkeleton: {
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 4,
    width: '40%',
  },
  actionContainer: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
  },
  buttonSkeleton: {
    width: 80,
    height: 36,
    backgroundColor: colors.border,
    borderRadius: 10,
  },
});
