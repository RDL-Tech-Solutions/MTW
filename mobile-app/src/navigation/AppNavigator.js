import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../stores/authStore';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import ProductDetailsScreen from '../screens/product/ProductDetailsScreen';
import CouponDetailsScreen from '../screens/coupon/CouponDetailsScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import { SCREEN_NAMES } from '../utils/constants';
import { ActivityIndicator, View } from 'react-native';
import colors from '../theme/colors';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

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
              options={{
                headerShown: true,
                headerTitle: 'Detalhes do Produto',
                headerStyle: {
                  backgroundColor: colors.white,
                },
                headerTintColor: colors.text,
              }}
            />
            <Stack.Screen 
              name="CouponDetails" 
              component={CouponDetailsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Detalhes do Cupom',
                headerStyle: {
                  backgroundColor: colors.white,
                },
                headerTintColor: colors.text,
              }}
            />
            <Stack.Screen 
              name="EditProfile" 
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
