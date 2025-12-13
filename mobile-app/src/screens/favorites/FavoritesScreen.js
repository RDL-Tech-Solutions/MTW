import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useProductStore } from '../../stores/productStore';
import ProductCard from '../../components/common/ProductCard';
import EmptyState from '../../components/common/EmptyState';
import { SCREEN_NAMES } from '../../utils/constants';
import colors from '../../theme/colors';

export default function FavoritesScreen({ navigation }) {
  const { favorites, fetchFavorites, removeFavorite, registerClick } = useProductStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const handleRemoveFavorite = async (productId) => {
    await removeFavorite(productId);
  };

  const handleProductPress = async (product) => {
    await registerClick(product.id);
    navigation.navigate(SCREEN_NAMES.PRODUCT_DETAILS, { product });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Favoritos</Text>
      <Text style={styles.subtitle}>
        {favorites.length} {favorites.length === 1 ? 'produto salvo' : 'produtos salvos'}
      </Text>
    </View>
  );

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando favoritos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => handleProductPress(item)}
            onFavoritePress={() => handleRemoveFavorite(item.id)}
            isFavorite={true}
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
});
