import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text,
  FlatList, 
  StyleSheet, 
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../stores/productStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useThemeStore } from '../../theme/theme';
import ProductCard from '../../components/common/ProductCard';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import { SCREEN_NAMES, PLATFORM_LABELS, PLATFORMS } from '../../utils/constants';

export default function HomeScreen({ navigation }) {
  const { products, fetchProducts, addFavorite, removeFavorite, isFavorite, registerClick } = useProductStore();
  const { preferences } = useNotificationStore();
  const { colors } = useThemeStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0,
    hasMore: true
  });

  useEffect(() => {
    loadProducts(true);
  }, []);

  useEffect(() => {
    // Resetar paginação quando filtros mudarem
    const timer = setTimeout(() => {
      loadProducts(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, platformFilter]);

  const loadProducts = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setPagination(prev => ({ ...prev, page: 1, hasMore: true }));
    } else {
      setLoadingMore(true);
    }

    try {
      const currentPage = reset ? 1 : pagination.page;
      const filters = {
        page: currentPage,
        limit: pagination.limit,
      };

      if (searchQuery) {
        filters.search = searchQuery;
      }
      if (platformFilter !== 'all') {
        filters.platform = platformFilter;
      }

      const result = await fetchProducts(filters);
      
      if (result.success) {
        if (reset) {
          setPagination({
            page: result.pagination.page,
            limit: result.pagination.limit,
            totalPages: result.pagination.totalPages,
            total: result.pagination.total,
            hasMore: result.pagination.page < result.pagination.totalPages
          });
        } else {
          setPagination(prev => ({
            ...prev,
            page: result.pagination.page,
            hasMore: result.pagination.page < result.pagination.totalPages
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && pagination.hasMore) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
      loadProducts(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts(true);
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

  // Aplicar apenas filtros locais (preferências do usuário)
  // Os filtros de busca e plataforma já são aplicados no backend via loadProducts
  const filteredProducts = products.filter(p => {
    // Filtros das preferências do usuário (aplicados localmente)
    const homeFilters = preferences?.home_filters || {};
    
    // Filtro de plataformas (preferências)
    const matchesPlatformFilter = !homeFilters.platforms || homeFilters.platforms.length === 0 || 
      homeFilters.platforms.includes(p.platform);
    
    // Filtro de categorias
    const matchesCategory = !homeFilters.categories || homeFilters.categories.length === 0 || 
      (p.category_id && homeFilters.categories.includes(p.category_id));
    
    // Filtro de desconto mínimo
    const discount = p.discount_percentage || 
      (p.old_price ? Math.round(((p.old_price - p.current_price) / p.old_price) * 100) : 0);
    const matchesMinDiscount = !homeFilters.min_discount || discount >= homeFilters.min_discount;
    
    // Filtro de preço máximo
    const matchesMaxPrice = !homeFilters.max_price || p.current_price <= homeFilters.max_price;
    
    // Filtro de apenas com cupom
    const matchesCoupon = !homeFilters.only_with_coupon || !!p.coupon_id;
    
    return matchesPlatformFilter && matchesCategory && matchesMinDiscount && matchesMaxPrice && matchesCoupon;
  });

  const styles = dynamicStyles(colors);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>Olá! 👋</Text>
          <Text style={styles.subtitle}>Encontre as melhores ofertas</Text>
        </View>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => navigation.navigate(SCREEN_NAMES.SETTINGS)}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar produtos..."
        />
      </View>

      {/* Filtro por Plataforma */}
      <View style={styles.platformFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformFilterScroll}>
          <TouchableOpacity
            style={[styles.platformFilter, platformFilter === 'all' && styles.platformFilterActive]}
            onPress={() => setPlatformFilter('all')}
          >
            <Text style={[styles.platformFilterText, platformFilter === 'all' && styles.platformFilterTextActive]}>
              Todas
            </Text>
          </TouchableOpacity>
          {[PLATFORMS.MERCADOLIVRE, PLATFORMS.SHOPEE, PLATFORMS.AMAZON, PLATFORMS.ALIEXPRESS].map((platform) => (
            <TouchableOpacity
              key={platform}
              style={[styles.platformFilter, platformFilter === platform && styles.platformFilterActive]}
              onPress={() => setPlatformFilter(platform)}
            >
              <Text style={[styles.platformFilterText, platformFilter === platform && styles.platformFilterTextActive]}>
                {PLATFORM_LABELS[platform]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="cube-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.statNumber}>{products.length}</Text>
          <Text style={styles.statLabel}>Produtos</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="flame" size={24} color={colors.error} />
          </View>
          <Text style={styles.statNumber}>🔥</Text>
          <Text style={styles.statLabel}>Em Destaque</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="ticket-outline" size={24} color={colors.success} />
          </View>
          <Text style={styles.statNumber}>+50</Text>
          <Text style={styles.statLabel}>Cupons</Text>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      icon="search-outline"
      title="Nenhum produto encontrado"
      message={searchQuery ? 'Tente buscar por outro termo' : 'Aguarde novos produtos'}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando produtos...</Text>
      </View>
    );
  }

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerLoaderText}>Carregando mais produtos...</Text>
      </View>
    );
  };

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
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        numColumns={1}
      />
    </View>
  );
}

const dynamicStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      elevation: 2,
    }),
  },
  searchContainer: {
    marginBottom: 16,
  },
  platformFilterContainer: {
    marginBottom: 20,
  },
  platformFilterScroll: {
    paddingHorizontal: 4,
  },
  platformFilter: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: colors.card,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    } : {
      elevation: 1,
    }),
  },
  platformFilterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  platformFilterText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  platformFilterTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    } : {
      elevation: 2,
    }),
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
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
    fontWeight: '500',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoaderText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textMuted,
  },
});
