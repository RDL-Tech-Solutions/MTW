import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useGoogleAuth } from '../../services/authSocial';
import Logo from '../../components/common/Logo';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import colors from '../../theme/colors';
import { SCREEN_NAMES, ERROR_MESSAGES } from '../../utils/constants';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState({ google: false });

  const { login, loginWithGoogle } = useAuthStore();

  // Google Auth Hook
  const [request, response, promptAsync] = useGoogleAuth();

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Processar resposta do Google Auth
  useEffect(() => {
    if (response) {
      handleGoogleResponse(response);
    }
  }, [response]);

  const validate = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = ERROR_MESSAGES.INVALID_EMAIL;
    }

    if (!password) {
      newErrors.password = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (password.length < 6) {
      newErrors.password = ERROR_MESSAGES.PASSWORD_TOO_SHORT;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Erro', result.error || ERROR_MESSAGES.INVALID_CREDENTIALS);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setSocialLoading({ ...socialLoading, google: true });
      await promptAsync();
    } catch (error) {
      console.error('Erro ao iniciar Google Auth:', error);
      Alert.alert('Erro', 'Erro ao iniciar autenticação com Google');
      setSocialLoading({ ...socialLoading, google: false });
    }
  };

  const handleGoogleResponse = async (googleResponse) => {
    try {
      const result = await loginWithGoogle(googleResponse);
      
      if (!result.success) {
        // Só mostrar erro se não foi cancelamento
        if (result.error !== 'Autenticação cancelada') {
          Alert.alert('Erro', result.error || 'Erro ao fazer login com Google');
        }
      }
    } catch (error) {
      console.error('Erro no handleGoogleResponse:', error);
      Alert.alert('Erro', 'Erro inesperado ao fazer login com Google');
    } finally {
      setSocialLoading({ ...socialLoading, google: false });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <Logo width={220} height={220} style={styles.logo} />
          <Text style={styles.title}>PreçoCerto</Text>
          <Text style={styles.subtitle}>As melhores ofertas em um só lugar</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.form,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            error={errors.email}
          />

          <Input
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.password}
          />

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate(SCREEN_NAMES.FORGOT_PASSWORD)}
          >
            <Text style={styles.forgotPasswordText}>Esqueceu sua senha?</Text>
          </TouchableOpacity>

          <Button
            title="Entrar"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Botão de Login Social */}
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={[styles.socialButton, styles.googleButton]}
              onPress={handleGoogleLogin}
              disabled={socialLoading.google || loading}
            >
              {socialLoading.google ? (
                <Text style={styles.socialButtonText}>Carregando...</Text>
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color={colors.white} />
                  <Text style={styles.socialButtonText}>Continuar com Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Button
            title="Criar nova conta"
            onPress={() => navigation.navigate(SCREEN_NAMES.REGISTER)}
            variant="outline"
          />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    marginBottom: -30,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  loginButton: {
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.textMuted,
    fontSize: 14,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  socialContainer: {
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 12,
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  socialButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
