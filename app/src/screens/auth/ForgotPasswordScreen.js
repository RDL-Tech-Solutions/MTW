import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import colors from '../../theme/colors';
import { ERROR_MESSAGES } from '../../utils/constants';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: email, 2: code verification, 3: new password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { forgotPassword, verifyResetCode, resetPasswordWithCode } = useAuthStore();

  const validateEmail = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = ERROR_MESSAGES.INVALID_EMAIL;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCode = () => {
    const newErrors = {};

    if (!code) {
      newErrors.code = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (code.length !== 6) {
      newErrors.code = 'O código deve ter 6 dígitos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors = {};

    if (!newPassword) {
      newErrors.newPassword = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (newPassword.length < 6) {
      newErrors.newPassword = ERROR_MESSAGES.PASSWORD_TOO_SHORT;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendCode = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      setStep(2);
      Alert.alert(
        'Código Enviado',
        'Verifique seu email e digite o código de 6 dígitos recebido.'
      );
    } else {
      Alert.alert('Erro', result.error || 'Não foi possível enviar o código.');
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      Alert.alert('Código Reenviado', 'Um novo código foi enviado para seu email.');
    } else {
      Alert.alert('Erro', result.error || 'Não foi possível reenviar o código.');
    }
  };

  const handleVerifyCode = async () => {
    if (!validateCode()) return;

    setLoading(true);
    const result = await verifyResetCode(email, code);
    setLoading(false);

    if (result.success) {
      setStep(3);
      Alert.alert(
        'Código Verificado',
        'Agora você pode definir sua nova senha.'
      );
    } else {
      Alert.alert('Erro', result.error || 'Código inválido ou expirado.');
    }
  };

  const handleResetPassword = async () => {
    if (!validatePassword()) return;

    setLoading(true);
    const result = await resetPasswordWithCode(email, code, newPassword);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        'Senha Redefinida',
        'Sua senha foi alterada com sucesso!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert('Erro', result.error || 'Não foi possível redefinir a senha.');
    }
  };

  if (step === 1) {
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
            <Text style={styles.title}>Esqueceu sua senha?</Text>
            <Text style={styles.subtitle}>
              Digite seu email e enviaremos um código de verificação
            </Text>
          </View>

          <View style={styles.form}>
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

            <Button
              title="Enviar Código"
              onPress={handleSendCode}
              loading={loading}
              style={styles.submitButton}
            />

            <Button
              title="Voltar ao Login"
              onPress={() => navigation.goBack()}
              variant="outline"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (step === 2) {
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
            <Text style={styles.title}>Digite o Código</Text>
            <Text style={styles.subtitle}>
              Enviamos um código de 6 dígitos para {email}
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Código de Verificação"
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              leftIcon="key-outline"
              error={errors.code}
              autoFocus
            />

            <Button
              title="Verificar Código"
              onPress={handleVerifyCode}
              loading={loading}
              style={styles.submitButton}
            />

            <Button
              title="Reenviar Código"
              onPress={handleResendCode}
              variant="outline"
              style={styles.resendButton}
            />

            <Button
              title="Voltar"
              onPress={() => setStep(1)}
              variant="text"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (step === 3) {
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
            <Text style={styles.title}>Nova Senha</Text>
            <Text style={styles.subtitle}>
              Defina uma nova senha para sua conta
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Nova Senha"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              leftIcon="lock-closed-outline"
              error={errors.newPassword}
              autoFocus
            />

            <Input
              label="Confirmar Nova Senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Digite a senha novamente"
              secureTextEntry
              leftIcon="lock-closed-outline"
              error={errors.confirmPassword}
            />

            <Button
              title="Redefinir Senha"
              onPress={handleResetPassword}
              loading={loading}
              style={styles.submitButton}
            />

            <Button
              title="Voltar"
              onPress={() => setStep(2)}
              variant="text"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return null;
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
    lineHeight: 24,
  },
  form: {
    width: '100%',
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  resendButton: {
    marginBottom: 8,
  },
});
