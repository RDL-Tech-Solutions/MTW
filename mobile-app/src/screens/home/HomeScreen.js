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
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../theme/theme';
import ProductCard from '../../components/common/ProductCard';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import GradientHeader from '../../components/common/GradientHeader';
import StatCard from '../../components/common/StatCard';
import { SCREEN_NAMES, PLATFORM_LABELS, PLATFORMS } from '../../utils/constants';

export default function HomeScreen({ navigation }) {
  const { products, fetchProducts, addFavorite, removeFavorite, isFavorite, registerClick } = useProductStore();
  const { preferences } = useNotificationStore();
  const { user } = useAuthStore();
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

  // Aplicar filtros locais (preferências do usuário)
  const filteredProducts = products.filter(p => {
    const homeFilters = preferences?.home_filters || {};

    const matchesPlatformFilter = !homeFilters.platforms || homeFilters.platforms.length === 0 ||
      homeFilters.platforms.includes(p.platform);

    const matchesCategory = !homeFilters.categories || homeFilters.categories.length === 0 ||
      (p.category_id && homeFilters.categories.includes(p.category_id));

    const discount = p.discount_percentage ||
      (p.old_price ? Math.round(((p.old_price - p.current_price) / p.old_price) * 100) : 0);
    const matchesMinDiscount = !homeFilters.min_discount || discount >= homeFilters.min_discount;

    const matchesMaxPrice = !homeFilters.max_price || p.current_price <= homeFilters.max_price;

    const matchesCoupon = !homeFilters.only_with_coupon || !!p.coupon_id;

    return matchesPlatformFilter && matchesCategory && matchesMinDiscount && matchesMaxPrice && matchesCoupon;
  });

  // Calcular estatísticas
  const totalProducts = filteredProducts.length;
  const productsWithCoupons = filteredProducts.filter(p => p.coupon_id).length;
  const highDiscountProducts = filteredProducts.filter(p => {
    const discount = p.discount_percentage ||
      (p.old_price ? Math.round(((p.old_price - p.current_price) / p.old_price) * 100) : 0);
    return discount >= 30;
  }).length;

  const styles = dynamicStyles(colors);

  // Função para obter saudação baseada na hora
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const renderListHeader = () => (
    <View style={styles.listHeaderContent}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar produtos..."
        />
      </View>

      {/* Platform Filters */}
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

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <StatCard
          icon="cube-outline"
          iconColor={colors.iconColors.products}
          value={totalProducts}
          label="Produtos"
        />
        <StatCard
          icon="flame"
          iconColor={colors.error}
          value={highDiscountProducts}
          label="Descontos"
        />
        <StatCard
          icon="ticket-outline"
          iconColor={colors.success}
          value={productsWithCoupons}
          label="Cupons"
        />
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ofertas Disponíveis</Text>
        <TouchableOpacity onPress={() => navigation.navigate(SCREEN_NAMES.HOME_FILTERS)}>
          <View style={styles.filterButton}>
            <Ionicons name="options-outline" size={18} color={colors.primary} />
            <Text style={styles.filterButtonText}>Filtros</Text>
          </View>
        </TouchableOpacity>
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
      <View style={styles.container}>
        {/* Header mesmo durante loading */}
        <GradientHeader
          title={`${getGreeting()}!`}
          subtitle="Encontre as melhores ofertas"
          gradientColors={colors.gradients.primary}
          leftComponent={
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          }
          rightComponent={
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate(SCREEN_NAMES.SETTINGS)}
            >
              <Ionicons name="notifications-outline" size={24} color="#fff" />
            </TouchableOpacity>
          }
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando produtos...</Text>
        </View>
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
      {/* Fixed Gradient Header */}
      <GradientHeader
        title={`${getGreeting()}!`}
        subtitle="Encontre as melhores ofertas"
        gradientColors={colors.gradients.primary}
        leftComponent={
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        }
        rightComponent={
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate(SCREEN_NAMES.SETTINGS)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color="#fff" />
          </TouchableOpacity>
        }
      />

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ProductCard
            product={item}
            onPress={() => handleProductPress(item)}
            onFavoritePress={() => handleFavorite(item.id)}
            isFavorite={isFavorite(item.id)}
            index={index}
          />
        )}
        ListHeaderComponent={renderListHeader}
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
  listHeaderContent: {
    marginBottom: 20,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    } : {
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    }),
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    } : {
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
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
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
    } : {
      elevation: 2,
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
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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
