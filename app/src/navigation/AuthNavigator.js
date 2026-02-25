import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import { SCREEN_NAMES } from '../utils/constants';

const Stack = createStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name={SCREEN_NAMES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={SCREEN_NAMES.REGISTER} component={RegisterScreen} />
      <Stack.Screen 
        name={SCREEN_NAMES.FORGOT_PASSWORD} 
        component={ForgotPasswordScreen}
        options={{
          headerShown: true,
          headerTitle: 'Recuperar Senha',
        }}
      />
    </Stack.Navigator>
  );
}
