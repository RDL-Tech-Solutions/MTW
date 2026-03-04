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
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFcmStore } from '../../stores/fcmStore';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';

export default function NotificationSettingsScreen({ navigation }) {
  const {
    isInitialized,
    hasPermission,
    isAvailable,
    fcmToken,
    requestPermission,
    login,
  } = useFcmStore();

  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Preferências
  const [pushEnabled, setPushEnabled] = useState(true);
  const [couponsOnly, setCouponsOnly] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [couponPlatforms, setCouponPlatforms] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [productNames, setProductNames] = useState([]);
  const [newProductName, setNewProductName] = useState('');

  // Plataformas disponíveis para cupons
  const availablePlatforms = [
    { id: 'amazon', name: 'Amazon', icon: 'logo-amazon' },
    { id: 'mercadolivre', name: 'Mercado Livre', icon: 'cart' },
    { id: 'shopee', name: 'Shopee', icon: 'bag' },
    { id: 'aliexpress', name: 'AliExpress', icon: 'globe' },
    { id: 'magalu', name: 'Magazine Luiza', icon: 'storefront' },
  ];

  useEffect(() => {
    loadCategories();
    loadPreferences();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      setLoadingPrefs(true);
      const response = await api.get('/notification-preferences');
      const prefs = response.data.data;

      if (prefs) {
        setPushEnabled(prefs.push_enabled ?? true);
        setCouponsOnly(prefs.coupons_only ?? false);
        setSelectedCategories(prefs.category_preferences || []);
        setCouponPlatforms(prefs.coupon_platforms || []);
        setKeywords(prefs.keyword_preferences || []);
        setProductNames(prefs.product_name_preferences || []);
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    } finally {
      setLoadingPrefs(false);
    }
  };

  const savePreferences = async () => {
    try {
      setLoading(true);
      await api.put('/notification-preferences', {
        push_enabled: pushEnabled,
        coupons_only: couponsOnly,
        category_preferences: selectedCategories,
        coupon_platforms: couponPlatforms,
        keyword_preferences: keywords,
        product_name_preferences: productNames,
      });

      Alert.alert('Sucesso!', 'Preferências salvas com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      Alert.alert('Erro', 'Não foi possível salvar as preferências.');
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platformId) => {
    setCouponPlatforms(prev => {
      if (prev.includes(platformId)) {
        return prev.filter(id => id !== platformId);
      } else {
        return [...prev, platformId];
      }
    });
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

        // Se usuário está logado, garantir que o token está registrado
        if (user?.id) {
          await login(user.id);
        }

        // Ativar push nas preferências
        setPushEnabled(true);
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

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const addKeyword = () => {
    if (newKeyword.trim()) {
      setKeywords(prev => [...prev, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (index) => {
    setKeywords(prev => prev.filter((_, i) => i !== index));
  };

  const addProductName = () => {
    if (newProductName.trim()) {
      setProductNames(prev => [...prev, newProductName.trim()]);
      setNewProductName('');
    }
  };

  const removeProductName = (index) => {
    setProductNames(prev => prev.filter((_, i) => i !== index));
  };

  if (!isAvailable) {
    return (
      <View style={styles.container}>
        <View style={styles.unavailableContainer}>
          <Ionicons name="warning-outline" size={64} color="#F59E0B" />
          <Text style={styles.unavailableTitle}>Notificações Não Disponíveis</Text>
          <Text style={styles.unavailableText}>
            Firebase Cloud Messaging requer um build nativo. Você está usando Expo Go.
          </Text>
          <Text style={styles.unavailableSteps}>
            Para usar notificações push:
          </Text>
          <Text style={styles.unavailableStep}>1. Execute: npx expo prebuild</Text>
          <Text style={styles.unavailableStep}>2. Execute: npx expo run:android</Text>
          <Text style={styles.unavailableStep}>3. Notificações funcionarão no build nativo</Text>
        </View>
      </View>
    );
  }

  if (loadingPrefs) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Carregando preferências...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status das Notificações</Text>

          <View style={styles.statusItem}>
            <View style={styles.statusLeft}>
              <Ionicons
                name={hasPermission ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={hasPermission ? '#10B981' : '#EF4444'}
              />
              <Text style={styles.statusLabel}>Permissão do Sistema</Text>
            </View>
            <Text style={[styles.statusValue, { color: hasPermission ? '#10B981' : '#EF4444' }]}>
              {hasPermission ? 'Concedida' : 'Negada'}
            </Text>
          </View>

          <View style={styles.statusItem}>
            <View style={styles.statusLeft}>
              <Ionicons
                name={fcmToken ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={fcmToken ? '#10B981' : '#EF4444'}
              />
              <Text style={styles.statusLabel}>Dispositivo Registrado</Text>
            </View>
            <Text style={[styles.statusValue, { color: fcmToken ? '#10B981' : '#EF4444' }]}>
              {fcmToken ? 'Sim' : 'Não'}
            </Text>
          </View>

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
        </View>

        {/* Configurações Gerais */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Notificação</Text>

          <View style={styles.switchItem}>
            <View style={styles.switchLeft}>
              <Ionicons name="pricetag" size={24} color="#DC2626" />
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>Apenas Cupons</Text>
                <Text style={styles.switchDescription}>
                  Receber notificações apenas de cupons
                </Text>
              </View>
            </View>
            <Switch
              value={couponsOnly}
              onValueChange={setCouponsOnly}
              trackColor={{ false: '#D1D5DB', true: '#FCA5A5' }}
              thumbColor={couponsOnly ? '#DC2626' : '#9CA3AF'}
              disabled={!hasPermission}
            />
          </View>

          {couponsOnly && (
            <Text style={styles.infoText}>
              ℹ️ Com esta opção ativada, você receberá notificações apenas de cupons e produtos com palavras-chave configuradas abaixo.
            </Text>
          )}
        </View>

        {/* Plataformas de Cupons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plataformas de Cupons</Text>
          <Text style={styles.sectionDescription}>
            Selecione as plataformas de cupons que deseja receber
          </Text>

          {availablePlatforms.map((platform, index) => (
            <TouchableOpacity
              key={platform.id}
              style={[styles.categoryItem, index === availablePlatforms.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => togglePlatform(platform.id)}
            >
              <View style={styles.categoryLeft}>
                <Ionicons
                  name={couponPlatforms.includes(platform.id) ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={couponPlatforms.includes(platform.id) ? '#DC2626' : '#9CA3AF'}
                />
                <Ionicons name={platform.icon} size={20} color="#6B7280" style={{ marginLeft: 8 }} />
                <Text style={styles.categoryLabel}>{platform.name}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {couponPlatforms.length === 0 && (
            <Text style={styles.infoText}>
              ℹ️ Se nenhuma plataforma for selecionada, você receberá cupons de todas as plataformas.
            </Text>
          )}
        </View>

        {/* Categorias */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorias de Interesse</Text>
          <Text style={styles.sectionDescription}>
            Receba notificações apenas das categorias selecionadas
          </Text>

          {categories.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma categoria disponível</Text>
          ) : (
            categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => toggleCategory(category.id)}
              >
                <View style={styles.categoryLeft}>
                  <Ionicons
                    name={selectedCategories.includes(category.id) ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={selectedCategories.includes(category.id) ? '#DC2626' : '#9CA3AF'}
                  />
                  <Text style={styles.categoryLabel}>{category.name}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Palavras-chave */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Palavras-chave</Text>
          <Text style={styles.sectionDescription}>
            Receba notificações de produtos que contenham estas palavras
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ex: iPhone, Samsung, Notebook..."
              value={newKeyword}
              onChangeText={setNewKeyword}
              onSubmitEditing={addKeyword}
            />
            <TouchableOpacity style={styles.addButton} onPress={addKeyword}>
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.tagsContainer}>
            {keywords.map((keyword, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{keyword}</Text>
                <TouchableOpacity onPress={() => removeKeyword(index)}>
                  <Ionicons name="close-circle" size={20} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Nomes de Produtos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produtos Específicos</Text>
          <Text style={styles.sectionDescription}>
            Receba notificações de produtos com estes nomes
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ex: iPhone 15, Galaxy S24..."
              value={newProductName}
              onChangeText={setNewProductName}
              onSubmitEditing={addProductName}
            />
            <TouchableOpacity style={styles.addButton} onPress={addProductName}>
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.tagsContainer}>
            {productNames.map((name, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{name}</Text>
                <TouchableOpacity onPress={() => removeProductName(index)}>
                  <Ionicons name="close-circle" size={20} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Botão Salvar */}
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={savePreferences}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Salvar Preferências</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Ajuda */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dicas</Text>
          <Text style={styles.helpText}>
            • Se "Apenas Cupons" estiver ativado, você receberá apenas cupons e produtos com palavras-chave
          </Text>
          <Text style={styles.helpText}>
            • Se não selecionar categorias, receberá notificações de todas
          </Text>
          <Text style={styles.helpText}>
            • Palavras-chave e produtos específicos são opcionais
          </Text>
          <Text style={styles.helpText}>
            • Você pode desativar notificações push a qualquer momento
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
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
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
  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  switchDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryLabel: {
    fontSize: 16,
    color: '#374151',
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: '#DC2626',
  },
  saveButton: {
    backgroundColor: '#10B981',
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  helpText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    paddingLeft: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    lineHeight: 18,
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
