import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import permissionsService from '../../services/permissionsService';

export default function PermissionsScreen({ navigation }) {
  const [permissions, setPermissions] = useState({
    notifications: false,
    storage: false,
    all: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      setLoading(true);
      await permissionsService.checkAllPermissions();
      const status = permissionsService.getPermissionsStatus();
      setPermissions(status);
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestNotifications = async () => {
    try {
      const granted = await permissionsService.requestNotificationPermission();
      
      if (granted) {
        Alert.alert(
          '✅ Permissão Concedida',
          'Você receberá notificações de promoções e cupons!'
        );
      } else {
        Alert.alert(
          '⚠️ Permissão Negada',
          'Você não receberá notificações. Ative nas configurações do sistema se mudar de ideia.',
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Abrir Configurações',
              onPress: () => permissionsService.openAppSettings(),
            },
          ]
        );
      }
      
      await checkPermissions();
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
    }
  };

  const requestAllPermissions = async () => {
    try {
      const status = await permissionsService.requestAllPermissions();
      
      if (status.all) {
        Alert.alert(
          '✅ Permissões Concedidas',
          'Todas as permissões foram concedidas com sucesso!'
        );
      } else {
        Alert.alert(
          '⚠️ Algumas Permissões Negadas',
          'Algumas permissões foram negadas. O app pode não funcionar corretamente.',
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Abrir Configurações',
              onPress: () => permissionsService.openAppSettings(),
            },
          ]
        );
      }
      
      await checkPermissions();
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
    }
  };

  const PermissionItem = ({ icon, title, description, granted, onPress, showToggle = false }) => (
    <TouchableOpacity
      style={styles.permissionItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.permissionIcon}>
        <Ionicons
          name={icon}
          size={24}
          color={granted ? '#10B981' : '#EF4444'}
        />
      </View>
      
      <View style={styles.permissionContent}>
        <Text style={styles.permissionTitle}>{title}</Text>
        <Text style={styles.permissionDescription}>{description}</Text>
      </View>

      {showToggle ? (
        <Switch
          value={granted}
          onValueChange={onPress}
          trackColor={{ false: '#D1D5DB', true: '#10B981' }}
          thumbColor={granted ? '#FFFFFF' : '#F3F4F6'}
        />
      ) : (
        <View style={[styles.statusBadge, granted ? styles.statusGranted : styles.statusDenied]}>
          <Text style={[styles.statusText, granted ? styles.statusTextGranted : styles.statusTextDenied]}>
            {granted ? 'Ativa' : 'Inativa'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Verificando permissões...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={48} color="#DC2626" />
          <Text style={styles.headerTitle}>Permissões do App</Text>
          <Text style={styles.headerDescription}>
            Gerencie as permissões necessárias para o funcionamento completo do app
          </Text>
        </View>

        {/* Status Geral */}
        <View style={[styles.statusCard, permissions.all ? styles.statusCardSuccess : styles.statusCardWarning]}>
          <Ionicons
            name={permissions.all ? 'checkmark-circle' : 'alert-circle'}
            size={24}
            color={permissions.all ? '#10B981' : '#F59E0B'}
          />
          <Text style={styles.statusCardText}>
            {permissions.all
              ? 'Todas as permissões estão ativas'
              : 'Algumas permissões precisam ser ativadas'}
          </Text>
        </View>

        {/* Lista de Permissões */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissões Necessárias</Text>

          <PermissionItem
            icon="notifications"
            title="Notificações"
            description="Receber alertas de promoções, cupons e ofertas"
            granted={permissions.notifications}
            onPress={requestNotifications}
            showToggle={true}
          />

          {Platform.OS === 'android' && Platform.Version < 33 && (
            <PermissionItem
              icon="folder"
              title="Armazenamento"
              description="Salvar imagens e dados do app"
              granted={permissions.storage}
              onPress={() => {
                Alert.alert(
                  'Permissão de Armazenamento',
                  'Esta permissão é necessária para salvar dados. Ative nas configurações do sistema.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Abrir Configurações',
                      onPress: () => permissionsService.openAppSettings(),
                    },
                  ]
                );
              }}
            />
          )}
        </View>

        {/* Informações Adicionais */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              As permissões são necessárias para que você receba notificações de promoções e o app funcione corretamente.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="lock-closed" size={20} color="#10B981" />
            <Text style={styles.infoText}>
              Suas informações estão seguras. Não compartilhamos seus dados com terceiros.
            </Text>
          </View>
        </View>

        {/* Botão de Ação */}
        {!permissions.all && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={requestAllPermissions}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Ativar Todas as Permissões</Text>
          </TouchableOpacity>
        )}

        {/* Botão Configurações do Sistema */}
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => permissionsService.openAppSettings()}
          activeOpacity={0.8}
        >
          <Ionicons name="settings" size={20} color="#6B7280" />
          <Text style={styles.settingsButtonText}>Abrir Configurações do Sistema</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  headerDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  statusCardSuccess: {
    backgroundColor: '#D1FAE5',
  },
  statusCardWarning: {
    backgroundColor: '#FEF3C7',
  },
  statusCardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  section: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  permissionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusGranted: {
    backgroundColor: '#D1FAE5',
  },
  statusDenied: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextGranted: {
    color: '#10B981',
  },
  statusTextDenied: {
    color: '#EF4444',
  },
  infoSection: {
    padding: 16,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  bottomSpacer: {
    height: 32,
  },
});
