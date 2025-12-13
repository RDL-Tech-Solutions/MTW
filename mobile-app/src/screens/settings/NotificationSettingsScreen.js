import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '../../stores/notificationStore';
import { useProductStore } from '../../stores/productStore';
import { useThemeStore } from '../../theme/theme';
import Button from '../../components/common/Button';

export default function NotificationSettingsScreen({ navigation }) {
  const { preferences, updatePreferences, addCategory, removeCategory, addKeyword, removeKeyword, addProductName, removeProductName } = useNotificationStore();
  const { categories, fetchCategories } = useProductStore();
  const { colors } = useThemeStore();
  const [localPreferences, setLocalPreferences] = useState(preferences || {
    push_enabled: true,
    email_enabled: false,
    category_preferences: [],
    keyword_preferences: [],
    product_name_preferences: [],
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [newProductName, setNewProductName] = useState('');

  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
    fetchCategories();
  }, [preferences]);

  const handleSave = async () => {
    const result = await updatePreferences(localPreferences);
    if (result.success) {
      Alert.alert('Sucesso', 'Preferências salvas com sucesso!');
    } else {
      Alert.alert('Erro', result.error || 'Não foi possível salvar as preferências');
    }
  };

  const handleTogglePush = (value) => {
    setLocalPreferences({ ...localPreferences, push_enabled: value });
  };

  const handleToggleCategory = async (categoryId) => {
    const isSelected = localPreferences.category_preferences?.includes(categoryId);
    const updatedCategories = isSelected
      ? localPreferences.category_preferences.filter(id => id !== categoryId)
      : [...(localPreferences.category_preferences || []), categoryId];
    
    setLocalPreferences({
      ...localPreferences,
      category_preferences: updatedCategories,
    });
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim()) {
      const keywords = [...(localPreferences.keyword_preferences || []), newKeyword.trim().toLowerCase()];
      setLocalPreferences({
        ...localPreferences,
        keyword_preferences: keywords,
      });
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword) => {
    const keywords = localPreferences.keyword_preferences.filter(k => k !== keyword);
    setLocalPreferences({
      ...localPreferences,
      keyword_preferences: keywords,
    });
  };

  const handleAddProductName = () => {
    if (newProductName.trim()) {
      const productNames = [...(localPreferences.product_name_preferences || []), newProductName.trim()];
      setLocalPreferences({
        ...localPreferences,
        product_name_preferences: productNames,
      });
      setNewProductName('');
    }
  };

  const handleRemoveProductName = (productName) => {
    const productNames = localPreferences.product_name_preferences.filter(pn => pn !== productName);
    setLocalPreferences({
      ...localPreferences,
      product_name_preferences: productNames,
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Notificações Push */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Notificações Push</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Ionicons name="notifications" size={24} color={colors.primary} />
            <View style={styles.switchText}>
              <Text style={[styles.switchTitle, { color: colors.text }]}>Ativar Notificações</Text>
              <Text style={[styles.switchSubtitle, { color: colors.textMuted }]}>
                Receba alertas sobre novas promoções
              </Text>
            </View>
          </View>
          <Switch
            value={localPreferences.push_enabled}
            onValueChange={handleTogglePush}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* Categorias */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Notificar por Categoria</Text>
        <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
          Selecione as categorias de produtos para receber notificações
        </Text>
        {categories.map((category) => {
          const isSelected = localPreferences.category_preferences?.includes(category.id);
          return (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryItem, { borderColor: colors.border }]}
              onPress={() => handleToggleCategory(category.id)}
            >
              <View style={styles.categoryLeft}>
                <Ionicons name={category.icon || 'pricetag'} size={20} color={isSelected ? colors.primary : colors.textMuted} />
                <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
              </View>
              <Switch
                value={isSelected}
                onValueChange={() => handleToggleCategory(category.id)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Palavras-chave */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Notificar por Palavra-chave</Text>
        <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
          Adicione palavras-chave para receber notificações quando produtos relacionados forem publicados
        </Text>
        <View style={[styles.inputContainer, { borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Digite uma palavra-chave..."
            placeholderTextColor={colors.textMuted}
            value={newKeyword}
            onChangeText={setNewKeyword}
            onSubmitEditing={handleAddKeyword}
          />
          <TouchableOpacity onPress={handleAddKeyword} style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {localPreferences.keyword_preferences?.length > 0 && (
          <View style={styles.tagsContainer}>
            {localPreferences.keyword_preferences.map((keyword, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: colors.primaryLight + '20' }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{keyword}</Text>
                <TouchableOpacity onPress={() => handleRemoveKeyword(keyword)}>
                  <Ionicons name="close-circle" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Nomes de Produtos */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Notificar por Nome de Produto</Text>
        <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
          Adicione nomes específicos de produtos para receber notificações
        </Text>
        <View style={[styles.inputContainer, { borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Digite o nome do produto..."
            placeholderTextColor={colors.textMuted}
            value={newProductName}
            onChangeText={setNewProductName}
            onSubmitEditing={handleAddProductName}
          />
          <TouchableOpacity onPress={handleAddProductName} style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {localPreferences.product_name_preferences?.length > 0 && (
          <View style={styles.tagsContainer}>
            {localPreferences.product_name_preferences.map((productName, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: colors.infoLight }]}>
                <Text style={[styles.tagText, { color: colors.info }]}>{productName}</Text>
                <TouchableOpacity onPress={() => handleRemoveProductName(productName)}>
                  <Ionicons name="close-circle" size={18} color={colors.info} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Botão Salvar */}
      <Button
        title="Salvar Preferências"
        onPress={handleSave}
        style={styles.saveButton}
        size="large"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      elevation: 2,
    }),
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchText: {
    marginLeft: 12,
    flex: 1,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  switchSubtitle: {
    fontSize: 13,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryName: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  addButton: {
    padding: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 24,
  },
});

