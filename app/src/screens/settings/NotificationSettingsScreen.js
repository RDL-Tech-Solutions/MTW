import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOneSignalStore } from '../../stores/oneSignalStore';
import { useAuthStore } from '../../stores/authStore';

export default function NotificationSettingsScreen({ navigation }) {
  const {
    isInitialized,
    hasPermission,
    isAvailable,
    userId,
    requestPermission,
    getDeviceState,
    login,
  } = useOneSignalStore();
  
  const { user } = useAuthStore();
  const [deviceState, setDeviceState] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDeviceState();
  }, []);

  const loadDeviceState = async () => {
    try {
      const state = await getDeviceState();
      setDeviceState(state);
    } catch (error) {
      console.error('Erro ao carregar estado do dispositivo:', error);
    }
  };

  const handleRequestPermission = async () => {
    try {
      setLoading(true);
      const granted = await requestPermission();
      
      if (granted) {
        Alert.alert(
          'Sucesso!',
          'Permissão de notificações concedida. Você receberá notificações sobre novos produtos e cupons.',
          [{ text: 'OK' }]
        );
        
        // Recarregar estado
        await loadDeviceState();
        
        // Se usuário está logado, fazer login no OneSignal
        if (user?.id) {
          await login(user.id);
        }
      } else {
        Alert.alert(
          'Permissão Negada',
          'Você negou a permissão de notificações. Para ativar, vá em Configurações do dispositivo.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir Configurações', onPress: openSettings },
          ]
        );
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      Alert.alert('Erro', 'Não foi possível solicitar permissão de notificações.');
    } finally {
      setLoading(false);
    }
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const handleTestNotification = () => {
    Alert.alert(
      'Testar Notificação',
      'Para testar notificações, use o painel admin ou o endpoint /api/notifications/test-push',
      [{ text: 'OK' }]
    );
  };

  const renderStatusItem = (label, value, icon, color) => (
    <View style={styles.statusItem}>
      <View style={styles.statusLeft}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statusLabel}>{label}</Text>
      </View>
      <Text style={[styles.statusValue, { color }]}>{value}</Text>
    </View>
  );

  if (!isAvailable) {
    return (
      <View style={styles.container}>
        <View style={styles.unavailableContainer}>
          <Ionicons name="warning-outline" size={64} color="#F59E0B" />
          <Text style={styles.unavailableTitle}>OneSignal Não Disponível</Text>
          <Text style={styles.unavailableText}>
            OneSignal requer um build nativo. Você está usando Expo Go.
          </Text>
          <Text style={styles.unavailableSteps}>
            Para usar notificações push:
          </Text>
          <Text style={styles.unavailableStep}>1. Execute: npx expo prebuild</Text>
          <Text style={styles.unavailableStep}>2. Execute: npx expo run:android</Text>
          <Text style={styles.unavailableStep}>3. OneSignal funcionará no build nativo</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status das Notificações</Text>
          
          {renderStatusItem(
            'OneSignal Inicializado',
            isInitialized ? 'Sim' : 'Não',
            isInitialized ? 'checkmark-circle' : 'close-circle',
            isInitialized ? '#10B981' : '#EF4444'
          )}
          
          {renderStatusItem(
            'Permissão Concedida',
            hasPermission ? 'Sim' : 'Não',
            hasPermission ? 'checkmark-circle' : 'close-circle',
            hasPermission ? '#10B981' : '#EF4444'
          )}
          
          {renderStatusItem(
            'Usuário Registrado',
            userId ? 'Sim' : 'Não',
            userId ? 'checkmark-circle' : 'close-circle',
            userId ? '#10B981' : '#EF4444'
          )}
        </View>

        {/* Informações do Dispositivo */}
        {deviceState && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações do Dispositivo</Text>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Player ID:</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {deviceState.userId || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Push Token:</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {deviceState.pushToken ? 'Configurado' : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Notificações Habilitadas:</Text>
              <Text style={styles.infoValue}>
                {deviceState.isPushDisabled === false ? 'Sim' : 'Não'}
              </Text>
            </View>
          </View>
        )}

        {/* Ações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações</Text>
          
          {!hasPermission && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleRequestPermission}
              disabled={loading}
            >
              <Ionicons name="notifications" size={20} color="#FFF" />
              <Text style={styles.buttonText}>
                {loading ? 'Solicitando...' : 'Ativar Notificações'}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={loadDeviceState}
          >
            <Ionicons name="refresh" size={20} color="#DC2626" />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Atualizar Status
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={openSettings}
          >
            <Ionicons name="settings" size={20} color="#DC2626" />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Abrir Configurações do Sistema
            </Text>
          </TouchableOpacity>
          
          {hasPermission && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleTestNotification}
            >
              <Ionicons name="flask" size={20} color="#DC2626" />
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Testar Notificação
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Ajuda */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Precisa de Ajuda?</Text>
          <Text style={styles.helpText}>
            Se as notificações não estão funcionando:
          </Text>
          <Text style={styles.helpStep}>
            • Verifique se você concedeu permissão nas configurações do dispositivo
          </Text>
          <Text style={styles.helpStep}>
            • Certifique-se de estar usando um build nativo (não Expo Go)
          </Text>
          <Text style={styles.helpStep}>
            • Verifique sua conexão com a internet
          </Text>
          <Text style={styles.helpStep}>
            • Tente fazer logout e login novamente
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusLabel: {
    fontSize: 16,
    color: '#374151',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#DC2626',
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButtonText: {
    color: '#DC2626',
  },
  helpText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  helpStep: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    paddingLeft: 8,
  },
  unavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  unavailableTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  unavailableText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  unavailableSteps: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  unavailableStep: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
