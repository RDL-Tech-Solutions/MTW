import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text,
  FlatList, 
  StyleSheet, 
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../stores/productStore';
import ProductCard from '../../components/common/ProductCard';
import { SCREEN_NAMES } from '../../utils/constants';
import colors from '../../theme/colors';

export default function HomeScreen({ navigation }) {
  const { products, fetchProducts, addFavorite, removeFavorite, isFavorite, registerClick } = useProductStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    await fetchProducts();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const handleFavorite = async (productId) => {
    if (isFavorite(productId)) {
      await removeFavorite(productId);
    } else {
      await addFavorite(productId);
    }
  };

  const handleProductPress = async (product) => {
    await registerClick(product.id);
    navigation.navigate(SCREEN_NAMES.PRODUCT_DETAILS, { product });
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || p.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.greeting}>Olá! 👋</Text>
          <Text style={styles.subtitle}>Encontre as melhores ofertas</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar produtos..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtro por Plataforma */}
      <View style={styles.platformFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.platformFilter, platformFilter === 'all' && styles.platformFilterActive]}
            onPress={() => setPlatformFilter('all')}
          >
            <Text style={[styles.platformFilterText, platformFilter === 'all' && styles.platformFilterTextActive]}>
              Todas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.platformFilter, platformFilter === 'mercadolivre' && styles.platformFilterActive]}
            onPress={() => setPlatformFilter('mercadolivre')}
          >
            <Text style={[styles.platformFilterText, platformFilter === 'mercadolivre' && styles.platformFilterTextActive]}>
              Mercado Livre
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.platformFilter, platformFilter === 'shopee' && styles.platformFilterActive]}
            onPress={() => setPlatformFilter('shopee')}
          >
            <Text style={[styles.platformFilterText, platformFilter === 'shopee' && styles.platformFilterTextActive]}>
              Shopee
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.platformFilter, platformFilter === 'amazon' && styles.platformFilterActive]}
            onPress={() => setPlatformFilter('amazon')}
          >
            <Text style={[styles.platformFilterText, platformFilter === 'amazon' && styles.platformFilterTextActive]}>
              Amazon
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.platformFilter, platformFilter === 'aliexpress' && styles.platformFilterActive]}
            onPress={() => setPlatformFilter('aliexpress')}
          >
            <Text style={[styles.platformFilterText, platformFilter === 'aliexpress' && styles.platformFilterTextActive]}>
              AliExpress
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{products.length}</Text>
          <Text style={styles.statLabel}>Produtos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>🔥</Text>
          <Text style={styles.statLabel}>Em Destaque</Text>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyTitle}>Nenhum produto encontrado</Text>
      <Text style={styles.emptyText}>
        {searchQuery ? 'Tente buscar por outro termo' : 'Aguarde novos produtos'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando produtos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => handleProductPress(item)}
            onFavoritePress={() => handleFavorite(item.id)}
            isFavorite={isFavorite(item.id)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
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
  platformFilterContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  platformFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  platformFilterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  platformFilterText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  platformFilterTextActive: {
    color: colors.white,
    fontWeight: '600',
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
    textAlign: 'center',
  },
});
