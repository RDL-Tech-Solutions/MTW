import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Platform, Dimensions } from 'react-native';
import { useThemeStore } from '../../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const GRID_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

export default function ProductCardSkeleton() {
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
    <View style={[s.card, { width: CARD_WIDTH }]}>
      {/* Image skeleton */}
      <Animated.View style={[s.imageSkeleton, { opacity }]} />

      {/* Info skeleton */}
      <View style={s.info}>
        <Animated.View style={[s.titleSkeleton, { opacity }]} />
        <Animated.View style={[s.titleSkeletonShort, { opacity }]} />
        <Animated.View style={[s.priceSkeleton, { opacity }]} />
        <Animated.View style={[s.badgeSkeleton, { opacity }]} />
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: GRID_GAP,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    } : {
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
    }),
  },
  imageSkeleton: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.border,
  },
  info: {
    padding: 10,
  },
  titleSkeleton: {
    height: 14,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 6,
  },
  titleSkeletonShort: {
    height: 14,
    width: '70%',
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 10,
  },
  priceSkeleton: {
    height: 20,
    width: '50%',
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 8,
  },
  badgeSkeleton: {
    height: 24,
    width: '60%',
    backgroundColor: colors.border,
    borderRadius: 6,
  },
});
