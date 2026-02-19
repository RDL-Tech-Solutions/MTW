import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../stores/productStore';
import { useThemeStore } from '../../theme/theme';
import { SCREEN_NAMES } from '../../utils/constants';

const CATEGORY_ICONS = {
  'Eletrônicos': 'phone-portrait-outline',
  'Moda': 'shirt-outline',
  'Casa': 'home-outline',
  'Beleza': 'sparkles-outline',
  'Esportes': 'basketball-outline',
  'Livros': 'book-outline',
  'Brinquedos': 'game-controller-outline',
  'Alimentos': 'fast-food-outline',
  'Computação': 'desktop-outline',
  'Celulares': 'phone-portrait-outline',
  'Lar': 'bed-outline',
};

export default function CategoriesScreen({ navigation }) {
  const { categories, fetchCategories } = useProductStore();
  const { colors } = useThemeStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    await fetchCategories();
    setLoading(false);
  };

  const handleCategoryPress = (category) => {
    // Navigate to Home with category filter via route params
    navigation.navigate(SCREEN_NAMES.HOME, { categoryId: category.id });
  };

  const s = createStyles(colors);

  const renderCategory = ({ item }) => {
    const iconName = CATEGORY_ICONS[item.name] || 'pricetag-outline';
    const hasEmojiIcon = item.icon && item.icon.length <= 2;

    return (
      <TouchableOpacity
        style={s.categoryCard}
        onPress={() => handleCategoryPress(item)}
        activeOpacity={0.7}
      >
        <View style={s.iconContainer}>
          {hasEmojiIcon ? (
            <Text style={s.emojiIcon}>{item.icon}</Text>
          ) : (
            <Ionicons name={iconName} size={28} color={colors.primary} />
          )}
        </View>
        <View style={s.categoryInfo}>
          <Text style={s.categoryName} numberOfLines={1}>{item.name}</Text>
          {item.description && (
            <Text style={s.categoryDescription} numberOfLines={1}>{item.description}</Text>
          )}
          <Text style={s.productCount}>{item.product_count || 0} produtos</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.headerBar}>
          <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
          <Text style={s.headerTitle}>Categorias</Text>
        </View>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Carregando categorias...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.headerBar}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <Text style={s.headerTitle}>Categorias</Text>
        <Text style={s.headerSubtitle}>Explore por categoria</Text>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Text style={s.emptyIcon}>📂</Text>
            <Text style={s.emptyTitle}>Nenhuma categoria</Text>
            <Text style={s.emptyText}>Aguarde novas categorias</Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBEBEB',
  },
  headerBar: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 8,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  list: {
    padding: 12,
  },
  categoryCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    } : {
      elevation: 1,
    }),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emojiIcon: {
    fontSize: 24,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  categoryDescription: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  productCount: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EBEBEB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
