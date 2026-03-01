import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useOneSignalStore } from '../../stores/oneSignalStore';
import { useAuthStore } from '../../stores/authStore';

const OneSignalDebug = () => {
  const { 
    isInitialized, 
    hasPermission, 
    userId, 
    isAvailable,
    requestPermission,
    getDeviceState,
    login
  } = useOneSignalStore();
  
  const { user } = useAuthStore();
  const [deviceState, setDeviceState] = useState(null);

  useEffect(() => {
    loadDeviceState();
  }, []);

  const loadDeviceState = async () => {
    const state = await getDeviceState();
    setDeviceState(state);
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    Alert.alert(
      'Permissão de Notificação',
      granted ? 'Permissão concedida!' : 'Permissão negada',
      [{ text: 'OK', onPress: loadDeviceState }]
    );
  };

  const handleReregister = async () => {
    if (user?.id) {
      await login(user.id);
      await loadDeviceState();
      Alert.alert('Sucesso', 'Usuário re-registrado no OneSignal');
    } else {
      Alert.alert('Erro', 'Usuário não autenticado');
    }
  };

  if (!isAvailable) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔔 OneSignal Debug</Text>
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ OneSignal não disponível
          </Text>
          <Text style={styles.infoText}>
            OneSignal requer build nativo. Execute:
          </Text>
          <Text style={styles.codeText}>npx expo prebuild</Text>
          <Text style={styles.codeText}>npx expo run:android</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔔 OneSignal Debug</Text>
      
      <View style={styles.statusBox}>
        <StatusRow label="Inicializado" value={isInitialized} />
        <StatusRow label="Permissão" value={hasPermission} />
        <StatusRow label="User ID" value={userId || 'Não definido'} />
        <StatusRow label="Player ID" value={deviceState?.userId || 'N/A'} />
        <StatusRow label="Push Token" value={deviceState?.pushToken ? '✓' : '✗'} />
        <StatusRow label="Subscribed" value={deviceState?.isSubscribed} />
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleRequestPermission}
      >
        <Text style={styles.buttonText}>Solicitar Permissão</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleReregister}
      >
        <Text style={styles.buttonText}>Re-registrar Usuário</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={loadDeviceState}
      >
        <Text style={styles.buttonText}>Atualizar Status</Text>
      </TouchableOpacity>
    </View>
  );
};

const StatusRow = ({ label, value }) => (
  <View style={styles.statusRow}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>
      {typeof value === 'boolean' ? (value ? '✓' : '✗') : value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statusBox: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#DC2626',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 4,
  },
  codeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#92400E',
    backgroundColor: '#FDE68A',
    padding: 4,
    borderRadius: 4,
    marginTop: 4,
  },
});

export default OneSignalDebug;
