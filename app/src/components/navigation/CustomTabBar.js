import { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';

const TabBarButton = ({ focused, onPress, iconName, badge }) => {
  const { colors } = useThemeStore();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: -6,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused, scaleAnim, translateYAnim]);

  const color = focused ? colors.primary : colors.textMuted;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabButton}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
          },
        ]}
      >
        <View style={[
          styles.iconWrapper,
          focused && { backgroundColor: colors.primary + '15' },
        ]}>
          <Ionicons
            name={iconName}
            size={focused ? 28 : 24}
            color={color}
          />
          {badge && (
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
            </View>
          )}
        </View>
      </Animated.View>
      
      {/* Active indicator */}
      {focused && (
        <View
          style={[
            styles.activeIndicator,
            { backgroundColor: colors.primary },
          ]}
        />
      )}
    </TouchableOpacity>
  );
};

export default function CustomTabBar({ state, descriptors, navigation }) {
  const { colors } = useThemeStore();

  const getIconName = (routeName, focused) => {
    const icons = {
      Home: focused ? 'home' : 'home-outline',
      Favorites: focused ? 'heart' : 'heart-outline',
      Coupons: focused ? 'ticket' : 'ticket-outline',
      Categories: focused ? 'grid' : 'grid-outline',
      Profile: focused ? 'menu' : 'menu-outline',
    };
    return icons[routeName] || 'ellipse-outline';
  };

  const hasBadge = (routeName) => {
    return routeName === 'Coupons'; // Exemplo: mostrar badge em Cupons
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabBarButton
              key={route.key}
              focused={isFocused}
              onPress={onPress}
              iconName={getIconName(route.name, isFocused)}
              badge={hasBadge(route.name)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    } : {
      elevation: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
    }),
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
    } : {
      elevation: 4,
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
    }),
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 8,
    width: 32,
    height: 4,
    borderRadius: 2,
  },
});
