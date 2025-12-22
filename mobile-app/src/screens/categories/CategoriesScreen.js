import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator,
  Platform,
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
};

export default function CategoriesScreen({ navigation }) {
  const { categories, fetchCategories, fetchProducts } = useProductStore();
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

  const handleCategoryPress = async (category) => {
    // Buscar produtos da categoria
    await fetchProducts({ category_id: category.id });
    navigation.navigate(SCREEN_NAMES.HOME);
  };

  const renderCategory = ({ item }) => {
    const iconName = CATEGORY_ICONS[item.name] || 'pricetag-outline';
    const hasEmojiIcon = item.icon && item.icon.length <= 2; // Emoji geralmente tem 1-2 caracteres
    
    const dynamicStyles = createStyles(colors);
    
    return (
      <TouchableOpacity 
        style={dynamicStyles.categoryCard}
        onPress={() => handleCategoryPress(item)}
        activeOpacity={0.7}
      >
        <View style={dynamicStyles.iconContainer}>
          {hasEmojiIcon ? (
            <Text style={dynamicStyles.emojiIcon}>{item.icon}</Text>
          ) : (
            <Ionicons name={iconName} size={32} color={colors.primary} />
          )}
        </View>
        <Text style={dynamicStyles.categoryName}>{item.name}</Text>
        {item.description && (
          <Text style={dynamicStyles.categoryDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text style={dynamicStyles.productCount}>
          {item.product_count || 0} produtos
        </Text>
      </TouchableOpacity>
    );
  };

  const dynamicStyles = createStyles(colors);

  if (loading) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={dynamicStyles.loadingText}>Carregando categorias...</Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.title}>Categorias</Text>
        <Text style={dynamicStyles.subtitle}>Explore por categoria</Text>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        numColumns={2}
        contentContainerStyle={dynamicStyles.list}
        columnWrapperStyle={dynamicStyles.row}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={dynamicStyles.emptyContainer}>
            <Text style={dynamicStyles.emptyIcon}>📂</Text>
            <Text style={dynamicStyles.emptyTitle}>Nenhuma categoria</Text>
            <Text style={dynamicStyles.emptyText}>Aguarde novas categorias</Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  row: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    } : {
      elevation: 2,
    }),
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emojiIcon: {
    fontSize: 32,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  categoryDescription: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  productCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
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
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
