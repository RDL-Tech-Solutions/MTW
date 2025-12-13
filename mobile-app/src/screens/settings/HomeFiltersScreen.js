import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '../../stores/notificationStore';
import { useProductStore } from '../../stores/productStore';
import { useThemeStore } from '../../theme/theme';
import { PLATFORMS, PLATFORM_LABELS } from '../../utils/constants';
import Button from '../../components/common/Button';

export default function HomeFiltersScreen({ navigation }) {
  const { preferences, updatePreferences } = useNotificationStore();
  const { categories, fetchCategories } = useProductStore();
  const { colors } = useThemeStore();
  const [filters, setFilters] = useState(preferences?.home_filters || {
    platforms: [],
    categories: [],
    min_discount: 0,
    max_price: null,
    only_with_coupon: false,
  });
  const [minDiscount, setMinDiscount] = useState(String(filters.min_discount || 0));
  const [maxPrice, setMaxPrice] = useState(filters.max_price ? String(filters.max_price) : '');

  useEffect(() => {
    fetchCategories();
    if (preferences?.home_filters) {
      setFilters(preferences.home_filters);
      setMinDiscount(String(preferences.home_filters.min_discount || 0));
      setMaxPrice(preferences.home_filters.max_price ? String(preferences.home_filters.max_price) : '');
    }
  }, [preferences]);

  const handleSave = async () => {
    const updatedFilters = {
      ...filters,
      min_discount: parseFloat(minDiscount) || 0,
      max_price: maxPrice ? parseFloat(maxPrice) : null,
    };
    
    const result = await updatePreferences({
      ...preferences,
      home_filters: updatedFilters,
    });
    
    if (result.success) {
      navigation.goBack();
    }
  };

  const togglePlatform = (platform) => {
    const platforms = filters.platforms || [];
    const updated = platforms.includes(platform)
      ? platforms.filter(p => p !== platform)
      : [...platforms, platform];
    setFilters({ ...filters, platforms: updated });
  };

  const toggleCategory = (categoryId) => {
    const categories = filters.categories || [];
    const updated = categories.includes(categoryId)
      ? categories.filter(c => c !== categoryId)
      : [...categories, categoryId];
    setFilters({ ...filters, categories: updated });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Plataformas */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Plataformas</Text>
        <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
          Selecione as plataformas para exibir na tela inicial
        </Text>
        <View style={styles.platformsContainer}>
          {[PLATFORMS.MERCADOLIVRE, PLATFORMS.SHOPEE, PLATFORMS.AMAZON, PLATFORMS.ALIEXPRESS].map((platform) => {
            const isSelected = filters.platforms?.includes(platform);
            return (
              <TouchableOpacity
                key={platform}
                style={[
                  styles.platformChip,
                  isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                  { borderColor: colors.border }
                ]}
                onPress={() => togglePlatform(platform)}
              >
                <Text style={[
                  styles.platformChipText,
                  { color: isSelected ? colors.white : colors.text }
                ]}>
                  {PLATFORM_LABELS[platform]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Categorias */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Categorias</Text>
        <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
          Selecione as categorias para exibir na tela inicial
        </Text>
        {categories.map((category) => {
          const isSelected = filters.categories?.includes(category.id);
          return (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryItem, { borderColor: colors.border }]}
              onPress={() => toggleCategory(category.id)}
            >
              <View style={styles.categoryLeft}>
                <Ionicons name={category.icon || 'pricetag'} size={20} color={isSelected ? colors.primary : colors.textMuted} />
                <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
              </View>
              <Switch
                value={isSelected}
                onValueChange={() => toggleCategory(category.id)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filtros de Preço e Desconto */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Filtros Adicionais</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Desconto Mínimo (%)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            value={minDiscount}
            onChangeText={setMinDiscount}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Preço Máximo (R$)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Sem limite"
            placeholderTextColor={colors.textMuted}
            value={maxPrice}
            onChangeText={setMaxPrice}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Ionicons name="ticket" size={24} color={colors.primary} />
            <View style={styles.switchText}>
              <Text style={[styles.switchTitle, { color: colors.text }]}>Apenas com Cupom</Text>
              <Text style={[styles.switchSubtitle, { color: colors.textMuted }]}>
                Mostrar apenas produtos com cupom disponível
              </Text>
            </View>
          </View>
          <Switch
            value={filters.only_with_coupon}
            onValueChange={(value) => setFilters({ ...filters, only_with_coupon: value })}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      <Button
        title="Salvar Filtros"
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
  platformsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  platformChipText: {
    fontSize: 14,
    fontWeight: '600',
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
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
  saveButton: {
    marginTop: 8,
    marginBottom: 24,
  },
});

