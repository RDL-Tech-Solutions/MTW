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
  StatusBar,
  Dimensions,
  Image,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../stores/productStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../theme/theme';
import ProductCard from '../../components/common/ProductCard';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import { SCREEN_NAMES, PLATFORM_LABELS, PLATFORMS } from '../../utils/constants';
import { getPlatformIcon, getPlatformColor } from '../../utils/platformIcons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 8;
const GRID_PADDING = 12;

// ── Platform shortcuts for the icon row ──
const PLATFORM_SHORTCUTS = [
  { key: 'all', label: 'Todas', icon: 'apps', color: '#666' },
  { key: PLATFORMS.MERCADOLIVRE, label: 'Mercado Livre', icon: 'cart', color: '#FFE600' },
  { key: PLATFORMS.SHOPEE, label: 'Shopee', icon: 'storefront', color: '#EE4D2D' },
  { key: PLATFORMS.AMAZON, label: 'Amazon', icon: 'cube', color: '#FF9900' },
  { key: PLATFORMS.ALIEXPRESS, label: 'AliExpress', icon: 'globe', color: '#FF4747' },
  { key: PLATFORMS.KABUM, label: 'Kabum', icon: 'flash', color: '#FF6600' },
  { key: PLATFORMS.MAGAZINELUIZA, label: 'Magalu', icon: 'bag-handle', color: '#0086FF' },
];

export default function HomeScreen({ navigation, route }) {
  const { products, categories, favorites, appCards, fetchProducts, fetchCategories, fetchFavorites, fetchAppCards, addFavorite, removeFavorite, isFavorite, registerClick } = useProductStore();
  const { preferences } = useNotificationStore();
  const { user } = useAuthStore();
  const { colors } = useThemeStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0,
    hasMore: true,
  });

  // Load categories, cards, and favorites on mount
  useEffect(() => {
    fetchCategories();
    fetchAppCards();
    if (user) fetchFavorites();
  }, []);

  // Check for category filter from route params (from CategoriesScreen)
  useEffect(() => {
    if (route?.params?.categoryId) {
      setSelectedCategory(route.params.categoryId);
    }
  }, [route?.params?.categoryId]);

  useEffect(() => {
    loadProducts(true);
  }, [searchQuery, selectedCategory]);

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

      if (searchQuery) filters.search = searchQuery;
      if (selectedCategory) filters.category_id = selectedCategory;

      const result = await fetchProducts(filters);

      if (result.success) {
        if (reset) {
          setPagination({
            page: result.pagination.page,
            limit: result.pagination.limit,
            totalPages: result.pagination.totalPages,
            total: result.pagination.total,
            hasMore: result.pagination.page < result.pagination.totalPages,
          });
        } else {
          setPagination(prev => ({
            ...prev,
            page: result.pagination.page,
            hasMore: result.pagination.page < result.pagination.totalPages,
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
    await fetchCategories();
    await fetchAppCards();
    if (user) await fetchFavorites();
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

  const handleCategorySelect = (categoryId) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryId);
    }
  };

  const handlePlatformSelect = (platformKey) => {
    setSelectedPlatform(platformKey);
  };

  const handleCardPress = (card) => {
    if (card.action_type === 'screen' && card.action_value) {
      navigation.navigate(card.action_value);
    } else if (card.action_type === 'link' && card.action_value) {
      Linking.openURL(card.action_value).catch(() => { });
    } else if (card.action_type === 'coupon_list') {
      navigation.navigate(SCREEN_NAMES.COUPONS);
    } else if (card.action_type === 'product_list') {
      // Could navigate to a filtered product list in the future
      navigation.navigate(SCREEN_NAMES.HOME);
    }
  };

  // Apply local filters (user preferences + platform)
  const filteredProducts = products.filter(p => {
    const homeFilters = preferences?.home_filters || {};
    const matchesPlatformFilter =
      !homeFilters.platforms || homeFilters.platforms.length === 0 || homeFilters.platforms.includes(p.platform);
    const matchesCategory =
      !homeFilters.categories || homeFilters.categories.length === 0 || (p.category_id && homeFilters.categories.includes(p.category_id));
    const discount =
      p.discount_percentage || (p.old_price ? Math.round(((p.old_price - p.current_price) / p.old_price) * 100) : 0);
    const matchesMinDiscount = !homeFilters.min_discount || discount >= homeFilters.min_discount;
    const matchesMaxPrice = !homeFilters.max_price || p.current_price <= homeFilters.max_price;
    const matchesCoupon = !homeFilters.only_with_coupon || !!p.coupon_id;

    // Platform filter from icon row
    const matchesPlatformIcon = selectedPlatform === 'all' || p.platform === selectedPlatform;

    return matchesPlatformFilter && matchesCategory && matchesMinDiscount && matchesMaxPrice && matchesCoupon && matchesPlatformIcon;
  });

  const s = dynamicStyles(colors);

  // ─── HEADER (sticky, primary-colored) ──────────────────
  const renderStickyHeader = () => (
    <View style={s.headerBar}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      {/* Search row */}
      <View style={s.searchRow}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar em PreçoCerto"
        />
        <TouchableOpacity
          style={s.headerIconBtn}
          onPress={() => navigation.navigate(SCREEN_NAMES.SETTINGS)}
        >
          <Ionicons name="notifications-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.categoryChipsScroll}
      >
        <TouchableOpacity
          style={[s.categoryChip, !selectedCategory && s.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[s.categoryChipText, !selectedCategory && s.categoryChipTextActive]}>
            Tudo
          </Text>
        </TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[s.categoryChip, selectedCategory === cat.id && s.categoryChipActive]}
            onPress={() => handleCategorySelect(cat.id)}
          >
            <Text style={[s.categoryChipText, selectedCategory === cat.id && s.categoryChipTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // ─── LIST HEADER (banner + platform icons + active filter) ───────
  const renderListHeader = () => (
    <View style={s.listHeaderContent}>
      {/* ── Dynamic Card Carousel ── */}
      {appCards.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled={appCards.length > 1}
          contentContainerStyle={s.cardCarouselScroll}
          style={s.cardCarousel}
        >
          {appCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[s.bannerContainer, appCards.length > 1 && { width: SCREEN_WIDTH - 40 }]}
              activeOpacity={0.9}
              onPress={() => handleCardPress(card)}
            >
              {card.image_url ? (
                <View style={s.bannerGradient}>
                  <Image source={{ uri: card.image_url }} style={s.cardImage} resizeMode="cover" />
                  <View style={[s.bannerContent, { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.35)' }]}>
                    <View style={s.bannerTextArea}>
                      <Text style={[s.bannerTitle, { color: card.text_color || '#fff' }]}>{card.title}</Text>
                      {card.subtitle ? <Text style={[s.bannerSubtitle, { color: card.text_color || '#fff' }]}>{card.subtitle}</Text> : null}
                    </View>
                  </View>
                </View>
              ) : (
                <LinearGradient
                  colors={[card.background_color || colors.primary, darkenColor(card.background_color || colors.primary)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.bannerGradient}
                >
                  <View style={s.bannerContent}>
                    <View style={s.bannerTextArea}>
                      <Text style={[s.bannerTitle, { color: card.text_color || '#fff' }]}>{card.title}</Text>
                      {card.subtitle ? <Text style={[s.bannerSubtitle, { color: card.text_color || '#fff' }]}>{card.subtitle}</Text> : null}
                    </View>
                    <View style={s.bannerIconArea}>
                      <Ionicons name="gift" size={58} color="rgba(255,255,255,0.18)" />
                    </View>
                  </View>
                </LinearGradient>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Platform Icon Row ── */}
      <View style={s.platformSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.platformScroll}
        >
          {PLATFORM_SHORTCUTS.map(p => {
            const isActive = selectedPlatform === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                style={s.platformItem}
                onPress={() => handlePlatformSelect(p.key)}
                activeOpacity={0.7}
              >
                <View style={[
                  s.platformIconCircle,
                  isActive && { borderColor: p.color, borderWidth: 2.5 },
                ]}>
                  <Ionicons name={p.icon} size={26} color={p.color} />
                </View>
                <Text style={[
                  s.platformLabel,
                  isActive && { color: colors.text, fontWeight: '700' },
                ]} numberOfLines={1}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Active Filters ── */}
      {!!(selectedCategory || selectedPlatform !== 'all') && (
        <View style={s.activeFilterRow}>
          <Text style={s.activeFilterText}>
            {selectedPlatform !== 'all'
              ? `${PLATFORM_LABELS[selectedPlatform] || selectedPlatform}`
              : ''}
            {selectedPlatform !== 'all' && selectedCategory ? ' • ' : ''}
            {selectedCategory
              ? categories.find(c => c.id === selectedCategory)?.name || 'Categoria'
              : ''}
          </Text>
          <TouchableOpacity onPress={() => { setSelectedCategory(null); setSelectedPlatform('all'); }}>
            <Ionicons name="close-circle" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Section Title ── */}
      <View style={s.sectionTitleRow}>
        <Text style={s.sectionTitle}>
          {selectedPlatform !== 'all'
            ? `Produtos ${PLATFORM_LABELS[selectedPlatform] || ''}`
            : 'Produtos para você'}
        </Text>
        <Text style={s.sectionCount}>{filteredProducts.length} resultados</Text>
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

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={s.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={s.footerLoaderText}>Carregando mais produtos...</Text>
      </View>
    );
  };

  const renderItem = ({ item, index }) => (
    <ProductCard
      product={item}
      onPress={() => handleProductPress(item)}
      onFavoritePress={() => handleFavorite(item.id)}
      isFavorite={isFavorite(item.id)}
      index={index}
      isGrid={true}
    />
  );

  if (loading && !refreshing) {
    return (
      <View style={s.container}>
        {renderStickyHeader()}
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Carregando produtos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {renderStickyHeader()}

      <FlatList
        data={filteredProducts}
        extraData={favorites}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={s.gridRow}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={s.list}
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
      />
    </View>
  );
}

// Helper to darken a hex color for gradient end
const darkenColor = (hex) => {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - 40);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - 40);
    const b = Math.max(0, (num & 0x0000FF) - 40);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  } catch {
    return '#991B1B';
  }
};

const dynamicStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#EBEBEB',
    },

    // ─── Sticky Header ───────────────────────────────────
    headerBar: {
      backgroundColor: colors.primary,
      paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 8,
      paddingBottom: 8,
      paddingHorizontal: 12,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    },
    headerIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ─── Category chips ──────────────────────────────────
    categoryChipsScroll: {
      paddingBottom: 4,
      gap: 0,
    },
    categoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
    },
    categoryChipActive: {
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    categoryChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.8)',
    },
    categoryChipTextActive: {
      fontWeight: '700',
      color: '#fff',
    },

    // ─── Banner ──────────────────────────────────────────
    bannerContainer: {
      marginHorizontal: 4,
      marginTop: 10,
      borderRadius: 12,
      overflow: 'hidden',
      ...(Platform.OS === 'web' ? {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      } : {
        elevation: 3,
      }),
    },
    bannerGradient: {
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    bannerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    bannerTextArea: {
      flex: 1,
    },
    bannerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.5,
    },
    bannerSubtitle: {
      fontSize: 22,
      fontWeight: '900',
      color: '#fff',
      marginTop: 4,
    },
    bannerIconArea: {
      width: 70,
      height: 70,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardImage: {
      width: '100%',
      height: 140,
      borderRadius: 12,
    },
    cardCarousel: {
      marginTop: 10,
    },
    cardCarouselScroll: {
      paddingHorizontal: 4,
      gap: 10,
    },

    // ─── Platform Icons ──────────────────────────────────
    platformSection: {
      backgroundColor: '#fff',
      marginTop: 8,
      marginHorizontal: 4,
      borderRadius: 10,
      paddingVertical: 14,
      ...(Platform.OS === 'web' ? {
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      } : {
        elevation: 1,
      }),
    },
    platformScroll: {
      paddingHorizontal: 8,
    },
    platformItem: {
      alignItems: 'center',
      width: (SCREEN_WIDTH - 32) / 5.5,
      marginHorizontal: 2,
    },
    platformIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    platformLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '500',
      textAlign: 'center',
    },

    // ─── Active Filter ────────────────────────────────────
    activeFilterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      marginTop: 8,
      marginHorizontal: 4,
    },
    activeFilterText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '500',
    },

    // ─── Section Title ────────────────────────────────────
    sectionTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
      marginBottom: 4,
      marginHorizontal: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    sectionCount: {
      fontSize: 12,
      color: colors.textMuted,
    },

    // ─── Product Grid ────────────────────────────────────
    list: {
      paddingHorizontal: GRID_PADDING,
      paddingTop: 0,
      paddingBottom: 24,
    },
    gridRow: {
      justifyContent: 'space-between',
    },
    listHeaderContent: {
      marginBottom: 4,
    },

    // ─── Loading / Footer ────────────────────────────────
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
