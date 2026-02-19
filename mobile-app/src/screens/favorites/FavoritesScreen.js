import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../stores/productStore';
import { useThemeStore } from '../../theme/theme';
import ProductCard from '../../components/common/ProductCard';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import { SCREEN_NAMES } from '../../utils/constants';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 8;
const GRID_PADDING = 12;

export default function FavoritesScreen({ navigation }) {
  const { favorites, fetchFavorites, removeFavorite, addFavorite, isFavorite, registerClick } = useProductStore();
  const { colors } = useThemeStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    await fetchFavorites();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
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

  // Filter by search
  const filteredFavorites = favorites.filter(p => {
    if (!searchQuery) return true;
    return p.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const s = dynamicStyles(colors);

  const renderItem = useCallback(({ item, index }) => (
    <ProductCard
      product={item}
      onPress={() => handleProductPress(item)}
      onFavoritePress={() => handleFavorite(item.id)}
      isFavorite={true}
      index={index}
      isGrid={true}
    />
  ), [favorites]);

  const renderEmpty = () => (
    <EmptyState
      icon="heart-outline"
      title="Nenhum favorito ainda"
      message="Adicione produtos aos favoritos para vê-los aqui"
      iconColor={colors.error}
    />
  );

  if (loading) {
    return (
      <View style={s.container}>
        {/* Header */}
        <View style={s.headerBar}>
          <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
          <View style={s.searchRow}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar nos favoritos..."
            />
          </View>
        </View>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Carregando favoritos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Sticky Header */}
      <View style={s.headerBar}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={s.searchRow}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar nos favoritos..."
          />
        </View>
        <View style={s.subtitleRow}>
          <Ionicons name="heart" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={s.subtitleText}>
            {filteredFavorites.length} {filteredFavorites.length === 1 ? 'produto salvo' : 'produtos salvos'}
          </Text>
        </View>
      </View>

      <FlatList
        data={filteredFavorites}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={s.gridRow}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={s.list}
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

const dynamicStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBEBEB',
  },
  headerBar: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 8,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  subtitleText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 8,
    paddingBottom: 24,
  },
  gridRow: {
    justifyContent: 'space-between',
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
});
