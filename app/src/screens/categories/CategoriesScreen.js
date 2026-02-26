import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Animated,
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

  // Animações
  const headerAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    loadCategories();
    
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

    // Animação de pulso
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
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

  const renderCategory = ({ item, index }) => {
    const iconName = CATEGORY_ICONS[item.name] || 'pricetag-outline';
    const hasEmojiIcon = item.icon && item.icon.length <= 2;

    return (
      <TouchableOpacity
        style={s.categoryCard}
        onPress={() => handleCategoryPress(item)}
        activeOpacity={0.7}
      >
        <Animated.View 
          style={[
            s.iconContainer,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          {hasEmojiIcon ? (
            <Text style={s.emojiIcon}>{item.icon}</Text>
          ) : (
            <Ionicons name={iconName} size={28} color={colors.primary} />
          )}
        </Animated.View>
        <View style={s.categoryInfo}>
          <Text style={s.categoryName} numberOfLines={1}>{item.name}</Text>
          {item.description && (
            <Text style={s.categoryDescription} numberOfLines={1}>{item.description}</Text>
          )}
          <View style={s.productCountContainer}>
            <Ionicons name="pricetags" size={12} color={colors.primary} />
            <Text style={s.productCount}>{item.product_count || 0} produtos</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={s.container}>
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
              <Ionicons name="grid" size={28} color="#fff" />
            </Animated.View>
            <View style={s.headerTextContainer}>
              <Text style={s.headerTitle}>Categorias</Text>
              <Text style={s.headerSubtitle}>Explore por categoria</Text>
            </View>
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
            <Ionicons name="grid" size={64} color={colors.primary} />
          </Animated.View>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          <Text style={s.loadingText}>Carregando categorias...</Text>
          <Text style={[s.loadingText, { fontSize: 12, marginTop: 4 }]}>
            Organizando produtos para você
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
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
            <Ionicons name="grid" size={28} color="#fff" />
          </Animated.View>
          <View style={s.headerTextContainer}>
            <Text style={s.headerTitle}>Categorias</Text>
            <Text style={s.headerSubtitle}>Explore por categoria</Text>
          </View>
        </View>
        <Animated.View style={[s.statsCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={s.statItem}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={[s.statIconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="apps" size={20} color={colors.primary} />
              </View>
            </Animated.View>
            <View style={s.statTextContainer}>
              <Text style={s.statValue}>{categories.length}</Text>
              <Text style={s.statLabel}>Categorias</Text>
            </View>
          </View>
          {categories.length > 0 && (
            <>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <View style={[s.statIconContainer, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="pricetags" size={20} color="#16A34A" />
                  </View>
                </Animated.View>
                <View style={s.statTextContainer}>
                  <Text style={[s.statValue, { color: '#16A34A' }]}>
                    {categories.reduce((sum, cat) => sum + (cat.product_count || 0), 0)}
                  </Text>
                  <Text style={s.statLabel}>Produtos</Text>
                </View>
              </View>
            </>
          )}
        </Animated.View>
      </Animated.View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Animated.View 
            style={[
              s.emptyContainer,
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
              <Text style={s.emptyIcon}>📂</Text>
            </Animated.View>
            <Text style={s.emptyTitle}>Nenhuma categoria</Text>
            <Text style={s.emptyText}>Aguarde novas categorias</Text>
          </Animated.View>
        }
      />
    </Animated.View>
  );
}

const createStyles = (colors) => StyleSheet.create({
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
    padding: 16,
  },
  categoryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    } : {
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    }),
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  emojiIcon: {
    fontSize: 28,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 6,
  },
  productCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productCount: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
