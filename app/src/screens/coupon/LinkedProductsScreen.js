import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    StatusBar,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';
import { useProductStore } from '../../stores/productStore';
import { SCREEN_NAMES } from '../../utils/constants';

// Hook para buscar produtos com paginação
const useLinkedProducts = (couponId) => {
    const { getProductsByCouponId } = useProductStore();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);

    const loadData = async (pageNumber = 1) => {
        try {
            if (pageNumber === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const response = await getProductsByCouponId(couponId, pageNumber);

            if (response.success) {
                if (pageNumber === 1) {
                    setProducts(response.products);
                } else {
                    setProducts(prev => [...prev, ...response.products]);
                }
                setHasMore(pageNumber < response.totalPages);
                setPage(pageNumber);
            } else {
                setError(response.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        if (couponId) {
            loadData(1);
        }
    }, [couponId]);

    const loadMore = () => {
        if (!loading && !loadingMore && hasMore) {
            loadData(page + 1);
        }
    };

    const refresh = () => {
        loadData(1);
    };

    return { products, loading, loadingMore, hasMore, error, loadMore, refresh };
};

export default function LinkedProductsScreen({ route, navigation }) {
    const { couponId, platformColor } = route.params || {};
    const { colors } = useThemeStore();
    const { products, loading, loadingMore, error, loadMore, refresh } = useLinkedProducts(couponId);
    const s = createStyles(colors, platformColor);

    const handleProductPress = (product) => {
        navigation.navigate(SCREEN_NAMES.PRODUCT_DETAILS, { product });
    };

    const formatPrice = (price) => {
        const num = parseFloat(price);
        return `R$ ${num.toFixed(2).replace('.', ',')}`;
    };

    const renderProductItem = ({ item }) => (
        <TouchableOpacity
            style={s.productCard}
            onPress={() => handleProductPress(item)}
            activeOpacity={0.7}
        >
            <View style={s.imageContainer}>
                <Image
                    source={{ uri: item.image_url }}
                    style={s.productImage}
                    resizeMode="contain"
                />
                {!item.is_active && (
                    <View style={s.inactiveBadge}>
                        <Text style={s.inactiveBadgeText}>Inativo</Text>
                    </View>
                )}
            </View>
            <View style={s.productInfo}>
                <Text style={s.productName} numberOfLines={2}>{item.name}</Text>
                <View style={s.productPriceRow}>
                    {item.old_price > item.current_price && (
                        <Text style={s.productOldPrice}>
                            {formatPrice(item.old_price)}
                        </Text>
                    )}
                    <Text style={s.productPrice}>{formatPrice(item.current_price)}</Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={s.emptyContainer}>
            <Ionicons name="bag-outline" size={60} color={colors.border} />
            <Text style={s.emptyTitle}>Sem produtos</Text>
            <Text style={s.emptyText}>
                Nenhum produto vinculado a este cupom.
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={s.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <View style={s.container}>
                <View style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Produtos vinculados</Text>
                </View>

                {loading ? (
                    <View style={s.loadingContainer}>
                        <ActivityIndicator size="large" color={platformColor || colors.primary} />
                    </View>
                ) : error ? (
                    <View style={s.errorContainer}>
                        <Ionicons name="alert-circle-outline" size={50} color={colors.error} />
                        <Text style={s.errorText}>{error}</Text>
                        <TouchableOpacity style={[s.retryBtn, { backgroundColor: platformColor }]} onPress={refresh}>
                            <Text style={s.retryBtnText}>Tentar Novamente</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={products}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderProductItem}
                        contentContainerStyle={s.listContent}
                        showsVerticalScrollIndicator={false}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.5}
                        refreshing={loading}
                        onRefresh={refresh}
                        ListEmptyComponent={renderEmptyState}
                        ListFooterComponent={
                            loadingMore ? (
                                <View style={s.footerLoading}>
                                    <ActivityIndicator size="small" color={platformColor || colors.primary} />
                                </View>
                            ) : null
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const createStyles = (colors, platformColor) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: {
        padding: 4,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    productCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    imageContainer: {
        position: 'relative',
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.border,
        padding: 4,
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    inactiveBadge: {
        position: 'absolute',
        bottom: -6,
        left: -4,
        right: -4,
        backgroundColor: 'rgba(220, 38, 38, 0.9)',
        borderRadius: 4,
        paddingVertical: 2,
        alignItems: 'center',
    },
    inactiveBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: 'bold',
    },
    productInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    productName: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
        marginBottom: 6,
        lineHeight: 18,
    },
    productPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    productOldPrice: {
        fontSize: 12,
        color: colors.textMuted,
        textDecorationLine: 'line-through',
    },
    productPrice: {
        fontSize: 15,
        fontWeight: '700',
        color: platformColor || colors.primary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerLoading: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 8,
        textAlign: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    errorText: {
        fontSize: 15,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 24,
    },
    retryBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
});
