import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import colors from '../../theme/colors';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../utils/constants';

export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = ERROR_MESSAGES.REQUIRED_FIELD;
    }

    if (!email.trim()) {
      newErrors.email = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = ERROR_MESSAGES.INVALID_EMAIL;
    }

    if (password) {
      if (password.length < 6) {
        newErrors.password = ERROR_MESSAGES.PASSWORD_TOO_SHORT;
      }
      
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'As senhas não coincidem';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    
    const updates = {
      name: name.trim(),
      email: email.trim(),
    };

    if (password) {
      updates.password = password;
    }

    const result = await updateUser(updates);
    setLoading(false);

    if (result.success) {
      Alert.alert('Sucesso', SUCCESS_MESSAGES.PROFILE_UPDATED, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert('Erro', result.error || 'Erro ao atualizar perfil');
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
          <Text style={styles.title}>Editar Perfil</Text>
          <Text style={styles.subtitle}>Atualize suas informações pessoais</Text>
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

          <View style={styles.divider}>
            <Text style={styles.dividerText}>Alterar senha (opcional)</Text>
          </View>

          <Input
            label="Nova senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Deixe em branco para não alterar"
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.password}
          />

          {password && (
            <Input
              label="Confirmar nova senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Digite a senha novamente"
              secureTextEntry
              leftIcon="lock-closed-outline"
              error={errors.confirmPassword}
            />
          )}

          <Button
            title="Salvar Alterações"
            onPress={handleSave}
            loading={loading}
            style={styles.saveButton}
          />
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
  divider: {
    marginVertical: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  saveButton: {
    marginTop: 8,
  },
});

