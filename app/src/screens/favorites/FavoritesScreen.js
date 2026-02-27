import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Animated,
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
  const [removingItems, setRemovingItems] = useState(new Set());

  // Animações
  const headerAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const itemAnimations = useRef({}).current;

  useEffect(() => {
    loadFavorites();
    
    // Animações de entrada
    Animated.parallel([
      Animated.spring(headerAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Animação de pulso para o ícone de coração
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animação flutuante
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: -10,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
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
      // Adicionar à lista de itens sendo removidos
      setRemovingItems(prev => new Set([...prev, productId]));
      
      // Criar animação para este item se não existir
      if (!itemAnimations[productId]) {
        itemAnimations[productId] = {
          scale: new Animated.Value(1),
          opacity: new Animated.Value(1),
          translateX: new Animated.Value(0),
        };
      }
      
      // Animar remoção
      Animated.parallel([
        Animated.timing(itemAnimations[productId].scale, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(itemAnimations[productId].opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(itemAnimations[productId].translateX, {
          toValue: -SCREEN_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(async () => {
        // Remover do favoritos após animação
        await removeFavorite(productId);
        setRemovingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        delete itemAnimations[productId];
      });
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

  const renderItem = useCallback(({ item, index }) => {
    // Criar animação para o item se não existir
    if (!itemAnimations[item.id]) {
      itemAnimations[item.id] = {
        scale: new Animated.Value(1),
        opacity: new Animated.Value(1),
        translateX: new Animated.Value(0),
      };
    }

    const isRemoving = removingItems.has(item.id);
    
    return (
      <Animated.View
        style={{
          transform: [
            { scale: itemAnimations[item.id].scale },
            { translateX: itemAnimations[item.id].translateX },
          ],
          opacity: itemAnimations[item.id].opacity,
        }}
      >
        <ProductCard
          product={item}
          onPress={() => handleProductPress(item)}
          onFavoritePress={() => handleFavorite(item.id)}
          isFavorite={true}
          index={index}
          isGrid={true}
        />
      </Animated.View>
    );
  }, [favorites, removingItems, itemAnimations]);

  const renderEmpty = () => (
    <Animated.View 
      style={{ 
        opacity: fadeAnim,
        transform: [
          { translateY: floatingAnim },
          { scale: scaleAnim }
        ]
      }}
    >
      <EmptyState
        icon="heart-outline"
        title="Nenhum favorito ainda"
        message="Adicione produtos aos favoritos para vê-los aqui"
        iconColor={colors.error}
      />
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={s.container}>
        {/* Header */}
        <Animated.View 
          style={[
            s.headerBar,
            {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              })}]
            }
          ]}
        >
          <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
          <View style={s.headerContent}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons name="heart" size={28} color="#fff" />
            </Animated.View>
            <View style={s.headerTextContainer}>
              <Text style={s.headerTitle}>Favoritos</Text>
              <Text style={s.headerSubtitle}>Seus produtos salvos</Text>
            </View>
          </View>
          <View style={s.searchRow}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar nos favoritos..."
            />
          </View>
        </Animated.View>
        <Animated.View 
          style={[
            s.loadingContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: floatingAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons name="heart" size={64} color={colors.error} />
          </Animated.View>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          <Text style={s.loadingText}>Carregando favoritos...</Text>
          <Text style={[s.loadingText, { fontSize: 12, marginTop: 4 }]}>
            Buscando seus produtos salvos
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      {/* Sticky Header */}
      <Animated.View 
        style={[
          s.headerBar,
          {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-50, 0],
            })}]
          }
        ]}
      >
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={s.headerContent}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons name="heart" size={28} color="#fff" />
          </Animated.View>
          <View style={s.headerTextContainer}>
            <Text style={s.headerTitle}>Favoritos</Text>
            <Text style={s.headerSubtitle}>Seus produtos salvos</Text>
          </View>
        </View>
        <View style={s.searchRow}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar nos favoritos..."
          />
        </View>
        <Animated.View style={[s.statsCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={s.statItem}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={[s.statIconContainer, { backgroundColor: colors.error + '15' }]}>
                <Ionicons name="heart" size={20} color={colors.error} />
              </View>
            </Animated.View>
            <View style={s.statTextContainer}>
              <Text style={s.statValue}>{filteredFavorites.length}</Text>
              <Text style={s.statLabel}>Salvos</Text>
            </View>
          </View>
          {filteredFavorites.length > 0 && (
            <>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <View style={[s.statIconContainer, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                  </View>
                </Animated.View>
                <View style={s.statTextContainer}>
                  <Text style={[s.statValue, { color: '#16A34A' }]}>Ativo</Text>
                  <Text style={s.statLabel}>Disponível</Text>
                </View>
              </View>
            </>
          )}
        </Animated.View>
      </Animated.View>

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
    </Animated.View>
  );
}

const dynamicStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...(Platform.OS === 'web' ? {} : {
      elevation: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 2,
  },
  searchRow: {
    marginBottom: 12,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    } : {
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    }),
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  list: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16,
    paddingBottom: 24,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
