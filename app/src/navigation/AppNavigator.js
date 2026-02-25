import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../stores/authStore';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import ProductDetailsScreen from '../screens/product/ProductDetailsScreen';
import CouponDetailsScreen from '../screens/coupon/CouponDetailsScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';
import HomeFiltersScreen from '../screens/settings/HomeFiltersScreen';
import AboutScreen from '../screens/about/AboutScreen';
import { SCREEN_NAMES } from '../utils/constants';
import { ActivityIndicator, View } from 'react-native';
import { useThemeStore } from '../theme/theme';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const { colors } = useThemeStore();

  useEffect(() => {
    initialize();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name={SCREEN_NAMES.PRODUCT_DETAILS}
              component={ProductDetailsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name={SCREEN_NAMES.COUPON_DETAILS}
              component={CouponDetailsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name={SCREEN_NAMES.EDIT_PROFILE}
              component={EditProfileScreen}
              options={{
                headerShown: true,
                headerTitle: 'Editar Perfil',
                headerStyle: {
                  backgroundColor: colors.white,
                },
                headerTintColor: colors.text,
              }}
            />
            <Stack.Screen
              name={SCREEN_NAMES.SETTINGS}
              component={SettingsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Configurações',
                headerStyle: {
                  backgroundColor: colors.card,
                },
                headerTintColor: colors.text,
              }}
            />
            <Stack.Screen
              name={SCREEN_NAMES.NOTIFICATION_SETTINGS}
              component={NotificationSettingsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Notificações',
                headerStyle: {
                  backgroundColor: colors.card,
                },
                headerTintColor: colors.text,
              }}
            />
            <Stack.Screen
              name={SCREEN_NAMES.HOME_FILTERS}
              component={HomeFiltersScreen}
              options={{
                headerShown: true,
                headerTitle: 'Filtros da Tela Inicial',
                headerStyle: {
                  backgroundColor: colors.card,
                },
                headerTintColor: colors.text,
              }}
            />
            <Stack.Screen
              name={SCREEN_NAMES.ABOUT}
              component={AboutScreen}
              options={{
                headerShown: true,
                headerTitle: 'Sobre',
                headerStyle: {
                  backgroundColor: colors.card,
                },
                headerTintColor: colors.text,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
