import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    StatusBar,
    SafeAreaView,
    Animated,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';
import { useProductStore } from '../../stores/productStore';
import ModernHeader from '../../components/common/ModernHeader';
import ModernLoading from '../../components/common/ModernLoading';
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
    
    // Animações
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        Animated.parallel([
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
    }, []);

    const s = createStyles(colors, platformColor);

    const handleProductPress = (product) => {
        navigation.navigate(SCREEN_NAMES.PRODUCT_DETAILS, { product });
    };

    const formatPrice = (price) => {
        const num = parseFloat(price);
        return `R$ ${num.toFixed(2).replace('.', ',')}`;
    };

    const renderProductItem = ({ item, index }) => {
        // Calcular desconto do preço original
        const discount = item.old_price && item.old_price > item.current_price
            ? Math.round(((item.old_price - item.current_price) / item.old_price) * 100)
            : 0;

        // Selecionar o melhor cupom
        const getBestCoupon = () => {
            if (!item.coupons || item.coupons.length === 0) return null;
            
            const activeCoupons = item.coupons.filter(c => !c.is_out_of_stock);
            if (activeCoupons.length === 0) return null;

            const couponsWithDiscount = activeCoupons.map(coupon => {
                const currentPrice = parseFloat(item.current_price) || 0;
                let discountPercent = 0;

                if (coupon.discount_type === 'percentage') {
                    discountPercent = parseFloat(coupon.discount_value) || 0;
                } else {
                    const discountValue = parseFloat(coupon.discount_value) || 0;
                    discountPercent = currentPrice > 0 ? (discountValue / currentPrice) * 100 : 0;
                }

                return { ...coupon, discountPercent };
            });

            couponsWithDiscount.sort((a, b) => b.discountPercent - a.discountPercent);
            return couponsWithDiscount[0];
        };

        const bestCoupon = getBestCoupon();
        const displayPrice = bestCoupon && item.price_with_coupon 
            ? item.price_with_coupon 
            : item.current_price;

        return (
            <TouchableOpacity
                style={s.productCard}
                onPress={() => handleProductPress(item)}
                activeOpacity={0.8}
            >
                <View style={s.imageContainer}>
                    <Image
                        source={{ uri: item.image_url }}
                        style={s.productImage}
                        resizeMode="contain"
                    />
                    {discount > 0 && (
                        <View style={s.discountBadge}>
                            <Text style={s.discountBadgeText}>{discount}%</Text>
                        </View>
                    )}
                    {!item.is_active && (
                        <View style={s.inactiveBadge}>
                            <Text style={s.inactiveBadgeText}>Inativo</Text>
                        </View>
                    )}
                </View>
                <View style={s.productInfo}>
                    <Text style={s.productName} numberOfLines={2}>{item.name}</Text>
                    <View style={s.productPriceRow}>
                        {/* Mostrar preço original se houver cupom, senão mostrar old_price */}
                        {bestCoupon && item.price_with_coupon ? (
                            <Text style={s.productOldPrice}>
                                {formatPrice(item.current_price)}
                            </Text>
                        ) : (
                            item.old_price > item.current_price && (
                                <Text style={s.productOldPrice}>
                                    {formatPrice(item.old_price)}
                                </Text>
                            )
                        )}
                        <Text style={s.productPrice}>{formatPrice(displayPrice)}</Text>
                    </View>
                    {bestCoupon && (
                        <View style={s.couponBadge}>
                            <Ionicons name="ticket-outline" size={12} color={platformColor || colors.success} />
                            <Text style={[s.couponText, { color: platformColor || colors.success }]}>
                                {bestCoupon.code}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={s.arrowContainer}>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => (
        <Animated.View 
            style={[
                s.emptyContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <View style={s.emptyIconContainer}>
                <Ionicons name="bag-outline" size={64} color={platformColor || colors.primary} />
            </View>
            <Text style={s.emptyTitle}>Nenhum produto encontrado</Text>
            <Text style={s.emptyText}>
                Este cupom ainda não possui produtos vinculados.
            </Text>
        </Animated.View>
    );

    const renderHeader = () => (
        <Animated.View 
            style={[
                s.headerInfo,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <View style={s.statsCard}>
                <View style={s.statItem}>
                    <Ionicons name="pricetags" size={24} color={platformColor || colors.primary} />
                    <View style={s.statTextContainer}>
                        <Text style={s.statValue}>{products.length}</Text>
                        <Text style={s.statLabel}>Produtos</Text>
                    </View>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                    <Ionicons name="ticket" size={24} color={platformColor || colors.success} />
                    <View style={s.statTextContainer}>
                        <Text style={s.statValue}>Cupom</Text>
                        <Text style={s.statLabel}>Aplicável</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );

    return (
        <View style={s.container}>
            <ModernHeader
                title="Produtos Vinculados"
                subtitle={`${products.length} produtos com este cupom`}
                icon="pricetags"
                showBack
                onBack={() => navigation.goBack()}
            />

            {loading ? (
                <ModernLoading
                    icon="pricetags"
                    iconColor={platformColor || colors.primary}
                    title="Carregando produtos..."
                    subtitle="Buscando produtos vinculados ao cupom"
                />
            ) : error ? (
                <Animated.View 
                    style={[
                        s.errorContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <View style={s.errorIconContainer}>
                        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
                    </View>
                    <Text style={s.errorTitle}>Ops! Algo deu errado</Text>
                    <Text style={s.errorText}>{error}</Text>
                    <TouchableOpacity 
                        style={[s.retryBtn, { backgroundColor: platformColor || colors.primary }]} 
                        onPress={refresh}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="refresh" size={18} color="#fff" />
                        <Text style={s.retryBtnText}>Tentar Novamente</Text>
                    </TouchableOpacity>
                </Animated.View>
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
                    ListHeaderComponent={products.length > 0 ? renderHeader : null}
                    ListEmptyComponent={renderEmptyState}
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={s.footerLoading}>
                                <ActivityIndicator size="small" color={platformColor || colors.primary} />
                                <Text style={s.footerLoadingText}>Carregando mais...</Text>
                            </View>
                        ) : null
                    }
                />
            )}
        </View>
    );
}

const createStyles = (colors, platformColor) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    headerInfo: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
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
        fontWeight: '600',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.border,
        marginHorizontal: 12,
    },
    listContent: {
        padding: 16,
        paddingTop: 0,
    },
    productCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        ...(Platform.OS === 'web' ? {
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        } : {
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
        }),
    },
    imageContainer: {
        position: 'relative',
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: colors.border,
        padding: 8,
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    discountBadge: {
        position: 'absolute',
        top: 4,
        left: 4,
        backgroundColor: colors.error,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        ...(Platform.OS === 'web' ? {
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
        } : {
            elevation: 3,
            shadowColor: colors.error,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
        }),
    },
    discountBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    inactiveBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        right: 4,
        backgroundColor: 'rgba(220, 38, 38, 0.95)',
        borderRadius: 6,
        paddingVertical: 3,
        alignItems: 'center',
    },
    inactiveBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    productInfo: {
        flex: 1,
        marginLeft: 14,
        justifyContent: 'center',
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
        lineHeight: 19,
    },
    productPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    productOldPrice: {
        fontSize: 13,
        color: colors.textMuted,
        textDecorationLine: 'line-through',
        fontWeight: '500',
    },
    productPrice: {
        fontSize: 18,
        fontWeight: '800',
        color: platformColor || colors.primary,
        letterSpacing: 0.3,
    },
    couponBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: (platformColor || colors.success) + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: (platformColor || colors.success) + '30',
    },
    couponText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    arrowContainer: {
        marginLeft: 8,
    },
    footerLoading: {
        paddingVertical: 20,
        alignItems: 'center',
        gap: 8,
    },
    footerLoadingText: {
        fontSize: 13,
        color: colors.textMuted,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: (platformColor || colors.primary) + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '500',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    errorIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.error + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    errorText: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
        fontWeight: '500',
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        ...(Platform.OS === 'web' ? {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        } : {
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
        }),
    },
    retryBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 15,
        letterSpacing: 0.3,
    },
});
