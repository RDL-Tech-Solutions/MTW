import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

/**
 * Serviço de Gerenciamento de Permissões
 * Solicita e gerencia todas as permissões necessárias do app
 */

class PermissionsService {
  constructor() {
    this.permissionsStatus = {
      notifications: false,
      storage: false,
      camera: false,
      all: false,
    };
  }

  /**
   * Solicitar todas as permissões necessárias
   */
  async requestAllPermissions() {
    console.log('📱 Solicitando todas as permissões necessárias...');

    try {
      if (Platform.OS === 'android') {
        await this.requestAndroidPermissions();
      } else if (Platform.OS === 'ios') {
        await this.requestIOSPermissions();
      }

      console.log('✅ Permissões solicitadas com sucesso');
      return this.permissionsStatus;
    } catch (error) {
      console.error('❌ Erro ao solicitar permissões:', error);
      return this.permissionsStatus;
    }
  }

  /**
   * Solicitar permissões no Android
   */
  async requestAndroidPermissions() {
    const apiLevel = Platform.Version;
    console.log(`📱 Android API Level: ${apiLevel}`);

    const permissions = [];

    // 1. Notificações (Android 13+)
    if (apiLevel >= 33) {
      permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    // 2. Armazenamento (Android 12 e inferior)
    if (apiLevel < 33) {
      permissions.push(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
    }

    // 3. Câmera (se necessário para futuras features)
    // permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);

    if (permissions.length === 0) {
      console.log('✅ Nenhuma permissão adicional necessária');
      this.permissionsStatus.all = true;
      return;
    }

    try {
      console.log('🔐 Solicitando permissões:', permissions);
      
      const results = await PermissionsAndroid.requestMultiple(permissions);
      
      console.log('📊 Resultados das permissões:', results);

      // Processar resultados
      if (apiLevel >= 33) {
        this.permissionsStatus.notifications = 
          results['android.permission.POST_NOTIFICATIONS'] === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        this.permissionsStatus.notifications = true; // Não precisa em versões antigas
      }

      if (apiLevel < 33) {
        this.permissionsStatus.storage = 
          results['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
          results['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        this.permissionsStatus.storage = true; // Não precisa em Android 13+
      }

      // Verificar se todas foram concedidas
      this.permissionsStatus.all = Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );

      // Mostrar resultado
      if (this.permissionsStatus.all) {
        console.log('✅ Todas as permissões concedidas');
      } else {
        console.warn('⚠️ Algumas permissões foram negadas');
        this.showPermissionsDeniedAlert();
      }

    } catch (error) {
      console.error('❌ Erro ao solicitar permissões Android:', error);
    }
  }

  /**
   * Solicitar permissões no iOS
   */
  async requestIOSPermissions() {
    try {
      // iOS: Permissões de notificação são gerenciadas pelo FCM
      // Não precisamos do expo-notifications aqui
      console.log('📱 iOS: Permissões de notificação gerenciadas pelo FCM');
      
      // Assumir que permissões serão solicitadas pelo FCM
      this.permissionsStatus.notifications = true;
      this.permissionsStatus.storage = true; // iOS não precisa de permissões explícitas para storage
      this.permissionsStatus.all = true;

    } catch (error) {
      console.error('❌ Erro ao solicitar permissões iOS:', error);
    }
  }

  /**
   * Verificar se todas as permissões estão concedidas
   */
  async checkAllPermissions() {
    try {
      if (Platform.OS === 'android') {
        return await this.checkAndroidPermissions();
      } else if (Platform.OS === 'ios') {
        return await this.checkIOSPermissions();
      }
      return false;
    } catch (error) {
      console.error('❌ Erro ao verificar permissões:', error);
      return false;
    }
  }

  /**
   * Verificar permissões no Android
   */
  async checkAndroidPermissions() {
    const apiLevel = Platform.Version;

    try {
      // Verificar notificações (Android 13+)
      if (apiLevel >= 33) {
        const notificationStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        this.permissionsStatus.notifications = notificationStatus;
      } else {
        this.permissionsStatus.notifications = true;
      }

      // Verificar armazenamento (Android 12 e inferior)
      if (apiLevel < 33) {
        const readStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        const writeStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        this.permissionsStatus.storage = readStatus && writeStatus;
      } else {
        this.permissionsStatus.storage = true;
      }

      this.permissionsStatus.all = 
        this.permissionsStatus.notifications && 
        this.permissionsStatus.storage;

      return this.permissionsStatus.all;

    } catch (error) {
      console.error('❌ Erro ao verificar permissões Android:', error);
      return false;
    }
  }

  /**
   * Verificar permissões no iOS
   */
  async checkIOSPermissions() {
    try {
      // iOS: Permissões gerenciadas pelo FCM
      this.permissionsStatus.notifications = true;
      this.permissionsStatus.storage = true;
      this.permissionsStatus.all = true;

      return this.permissionsStatus.all;

    } catch (error) {
      console.error('❌ Erro ao verificar permissões iOS:', error);
      return false;
    }
  }

  /**
   * Mostrar alerta quando permissões são negadas
   */
  showPermissionsDeniedAlert() {
    Alert.alert(
      '⚠️ Permissões Necessárias',
      'Algumas permissões foram negadas. O app pode não funcionar corretamente.\n\n' +
      'Permissões necessárias:\n' +
      '• Notificações: Para receber alertas de promoções\n' +
      '• Armazenamento: Para salvar imagens e dados\n\n' +
      'Você pode ativar as permissões nas configurações do app.',
      [
        {
          text: 'Agora Não',
          style: 'cancel',
        },
        {
          text: 'Abrir Configurações',
          onPress: () => this.openAppSettings(),
        },
      ]
    );
  }

  /**
   * Abrir configurações do app
   */
  openAppSettings() {
    try {
      Linking.openSettings();
    } catch (error) {
      console.error('❌ Erro ao abrir configurações:', error);
      Alert.alert(
        'Erro',
        'Não foi possível abrir as configurações. Por favor, abra manualmente.'
      );
    }
  }

  /**
   * Solicitar permissão específica de notificações
   */
  async requestNotificationPermission() {
    console.log('🔔 Solicitando permissão de notificações...');

    try {
      if (Platform.OS === 'android') {
        const apiLevel = Platform.Version;
        
        if (apiLevel >= 33) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          
          const granted = result === PermissionsAndroid.RESULTS.GRANTED;
          this.permissionsStatus.notifications = granted;
          
          console.log('📱 Permissão de notificações:', granted ? 'Concedida' : 'Negada');
          return granted;
        } else {
          // Android < 13 não precisa de permissão explícita
          this.permissionsStatus.notifications = true;
          return true;
        }
      } else if (Platform.OS === 'ios') {
        // iOS: Permissões gerenciadas pelo FCM
        console.log('📱 iOS: Permissão de notificações gerenciada pelo FCM');
        this.permissionsStatus.notifications = true;
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Erro ao solicitar permissão de notificações:', error);
      return false;
    }
  }

  /**
   * Obter status atual das permissões
   */
  getPermissionsStatus() {
    return { ...this.permissionsStatus };
  }
}

// Exportar instância única (singleton)
export default new PermissionsService();
