import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/home/HomeScreen';
import CategoriesScreen from '../screens/categories/CategoriesScreen';
import FavoritesScreen from '../screens/favorites/FavoritesScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { SCREEN_NAMES } from '../utils/constants';
import colors from '../theme/colors';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === SCREEN_NAMES.HOME) {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === SCREEN_NAMES.CATEGORIES) {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === SCREEN_NAMES.FAVORITES) {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === SCREEN_NAMES.PROFILE) {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name={SCREEN_NAMES.HOME} 
        component={HomeScreen}
        options={{ tabBarLabel: 'Início' }}
      />
      <Tab.Screen 
        name={SCREEN_NAMES.CATEGORIES} 
        component={CategoriesScreen}
        options={{ tabBarLabel: 'Categorias' }}
      />
      <Tab.Screen 
        name={SCREEN_NAMES.FAVORITES} 
        component={FavoritesScreen}
        options={{ tabBarLabel: 'Favoritos' }}
      />
      <Tab.Screen 
        name={SCREEN_NAMES.PROFILE} 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}
