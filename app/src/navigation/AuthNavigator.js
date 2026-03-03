import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import AuthChoiceScreen from '../screens/onboarding/AuthChoiceScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import { SCREEN_NAMES } from '../utils/constants';
import StorageService from '../services/storage';

const Stack = createStackNavigator();

export default function AuthNavigator({ route }) {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    checkInitialRoute();
  }, []);

  const checkInitialRoute = async () => {
    const completed = await StorageService.getOnboardingCompleted();
    setInitialRoute(completed ? 'AuthChoice' : 'Onboarding');
  };

  if (!initialRoute) {
    return null;
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="AuthChoice" component={AuthChoiceScreen} />
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
