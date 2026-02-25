import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import colors from '../../theme/colors';
import { ERROR_MESSAGES } from '../../utils/constants';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState({ google: false, facebook: false });
  
  const { register, loginWithGoogle, loginWithFacebook } = useAuthStore();

  const validate = () => {
    const newErrors = {};

    if (!name) {
      newErrors.name = ERROR_MESSAGES.REQUIRED_FIELD;
    }

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

    if (!confirmPassword) {
      newErrors.confirmPassword = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Erro', result.error || 'Erro ao criar conta');
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading({ ...socialLoading, google: true });
    const result = await loginWithGoogle();
    setSocialLoading({ ...socialLoading, google: false });

    if (!result.success) {
      Alert.alert('Erro', result.error || 'Erro ao fazer login com Google');
    }
  };

  const handleFacebookLogin = async () => {
    setSocialLoading({ ...socialLoading, facebook: true });
    const result = await loginWithFacebook();
    setSocialLoading({ ...socialLoading, facebook: false });

    if (!result.success) {
      Alert.alert('Erro', result.error || 'Erro ao fazer login com Facebook');
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
        <View style={styles.header}>
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Cadastre-se para começar a economizar</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Nome completo"
            value={name}
            onChangeText={setName}
            placeholder="Seu nome"
            leftIcon="person-outline"
            error={errors.name}
          />

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
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.password}
          />

          <Input
            label="Confirmar senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Digite a senha novamente"
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.confirmPassword}
          />

          <Button
            title="Criar Conta"
            onPress={handleRegister}
            loading={loading}
            style={styles.registerButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Botões de Registro Social */}
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

            <TouchableOpacity
              style={[styles.socialButton, styles.facebookButton]}
              onPress={handleFacebookLogin}
              disabled={socialLoading.facebook || loading}
            >
              {socialLoading.facebook ? (
                <Text style={styles.socialButtonText}>Carregando...</Text>
              ) : (
                <>
                  <Ionicons name="logo-facebook" size={20} color={colors.white} />
                  <Text style={styles.socialButtonText}>Continuar com Facebook</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.loginLink}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.loginLinkText}>
              Já tem uma conta? <Text style={styles.loginLinkBold}>Entrar</Text>
            </Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
  form: {
    width: '100%',
  },
  registerButton: {
    marginTop: 8,
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  loginLinkBold: {
    color: colors.primary,
    fontWeight: '600',
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
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  socialButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
