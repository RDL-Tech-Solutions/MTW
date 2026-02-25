import React from 'react';
import { Platform, StatusBar } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/home/HomeScreen';
import CategoriesScreen from '../screens/categories/CategoriesScreen';
import FavoritesScreen from '../screens/favorites/FavoritesScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import CouponsScreen from '../screens/coupons/CouponsScreen';
import { SCREEN_NAMES } from '../utils/constants';
import { useThemeStore } from '../theme/theme';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { colors } = useThemeStore();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === SCREEN_NAMES.HOME) {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === SCREEN_NAMES.FAVORITES) {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === SCREEN_NAMES.COUPONS) {
            iconName = focused ? 'ticket' : 'ticket-outline';
          } else if (route.name === SCREEN_NAMES.CATEGORIES) {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === SCREEN_NAMES.PROFILE) {
            iconName = focused ? 'menu' : 'menu-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 6,
          elevation: 8,
          ...(Platform.OS === 'web' ? {
            boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
          } : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
      })}
    >
      <Tab.Screen
        name={SCREEN_NAMES.HOME}
        component={HomeScreen}
        options={{ tabBarLabel: 'Início' }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.FAVORITES}
        component={FavoritesScreen}
        options={{ tabBarLabel: 'Favoritos' }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.COUPONS}
        component={CouponsScreen}
        options={{ tabBarLabel: 'Cupons' }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.CATEGORIES}
        component={CategoriesScreen}
        options={{ tabBarLabel: 'Categorias' }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.PROFILE}
        component={ProfileScreen}
        options={{ tabBarLabel: 'Mais' }}
      />
    </Tab.Navigator>
  );
}
