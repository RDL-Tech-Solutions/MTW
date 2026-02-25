import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    StatusBar,
    Platform,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../theme/theme';
import { getPlatformColor, getPlatformName, PlatformIcon } from '../../utils/platformIcons';
import { SCREEN_NAMES } from '../../utils/constants';
import api from '../../services/api';

function formatPrice(price) {
    const num = parseFloat(price);
    if (isNaN(num)) return '';
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
}

export default function CouponProductsScreen({ route, navigation }) {
    const { coupon } = route.params || {};
    const { colors, isDark } = useThemeStore();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const platformColor = coupon ? getPlatformColor(coupon.platform) : colors.primary;

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        if (!coupon) return;
        try {
            setLoading(true);
            const productIds = coupon.applicable_products;
            if (!Array.isArray(productIds) || productIds.length === 0) {
                setProducts([]);
                setLoading(false);
                return;
            }
            // Try fetching via API
            const results = await Promise.allSettled(
                productIds.map(id => api.get(`/products/${id}`))
            );
            const fetched = results
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value?.data?.data || r.value?.data)
                .filter(Boolean);
            setProducts(fetched);
        } catch (e) {
            console.log('CouponProductsScreen error:', e);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const s = createStyles(colors, platformColor, isDark);

    const renderProduct = ({ item }) => {
        const hasDiscount = item.old_price && parseFloat(item.old_price) > parseFloat(item.current_price);
        const discountPct = hasDiscount
            ? Math.round(((parseFloat(item.old_price) - parseFloat(item.current_price)) / parseFloat(item.old_price)) * 100)
            : 0;
        return (
            <TouchableOpacity
                style={s.productCard}
                onPress={() => navigation.navigate(SCREEN_NAMES.PRODUCT_DETAILS, { product: item })}
                activeOpacity={0.75}
            >
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={s.productImage} resizeMode="contain" />
                ) : (
                    <View style={[s.productImage, s.noImage]}>
                        <Ionicons name="image-outline" size={28} color={colors.textMuted} />
                    </View>
                )}
                {discountPct > 0 && (
                    <View style={s.discountBadge}>
                        <Text style={s.discountBadgeText}>-{discountPct}%</Text>
                    </View>
                )}
                <View style={s.productInfo}>
                    <Text style={s.productName} numberOfLines={2}>{item.name}</Text>
                    <View style={s.priceRow}>
                        {hasDiscount && (
                            <Text style={s.productOldPrice}>{formatPrice(item.old_price)}</Text>
                        )}
                        <Text style={s.productPrice}>{formatPrice(item.current_price)}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={s.emptyContainer}>
            <Ionicons name="bag-outline" size={52} color={colors.textMuted} />
            <Text style={s.emptyText}>Nenhum produto vinculado</Text>
        </View>
    );

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" backgroundColor={platformColor} />

            {/* Header */}
            <View style={[s.header, { backgroundColor: platformColor }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={s.headerCenter}>
                    <PlatformIcon platform={coupon?.platform} size={20} />
                    <Text style={s.headerTitle} numberOfLines={1}>
                        Produtos com este cupom
                    </Text>
                </View>
                <View style={s.headerRight} />
            </View>

            {/* Coupon badge */}
            {coupon?.code ? (
                <View style={[s.couponBanner, { backgroundColor: platformColor + '18' }]}>
                    <Ionicons name="ticket-outline" size={16} color={platformColor} />
                    <Text style={[s.couponBannerCode, { color: platformColor }]}>{coupon.code}</Text>
                    <Text style={[s.couponBannerLabel, { color: colors.textMuted }]}>
                        •  {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `R$ ${coupon.discount_value} OFF`}
                    </Text>
                </View>
            ) : null}

            {loading ? (
                <View style={s.loadingContainer}>
                    <ActivityIndicator size="large" color={platformColor} />
                    <Text style={s.loadingText}>Carregando produtos...</Text>
                </View>
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderProduct}
                    numColumns={2}
                    ListEmptyComponent={renderEmpty}
                    columnWrapperStyle={s.columnWrapper}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const createStyles = (colors, platformColor, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight + 12,
        paddingBottom: 14,
        paddingHorizontal: 16,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        flex: 1,
    },
    headerRight: {
        width: 38,
    },

    couponBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 6,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    couponBannerCode: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    },
    couponBannerLabel: {
        fontSize: 13,
        fontWeight: '500',
    },

    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '500',
    },

    listContent: {
        padding: 12,
        paddingBottom: 32,
        flexGrow: 1,
    },
    columnWrapper: {
        gap: 10,
        marginBottom: 10,
    },
    productCard: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        ...(Platform.OS === 'web' ? {
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        } : {
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
        }),
    },
    productImage: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: isDark ? '#2D3748' : '#F9FAFB',
    },
    noImage: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    discountBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#DC2626',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    discountBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#fff',
    },
    productInfo: {
        padding: 10,
    },
    productName: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.text,
        lineHeight: 17,
        marginBottom: 6,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    productOldPrice: {
        fontSize: 10,
        color: colors.textMuted,
        textDecorationLine: 'line-through',
    },
    productPrice: {
        fontSize: 13,
        fontWeight: '800',
        color: platformColor,
    },

    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
        color: colors.textMuted,
        fontWeight: '600',
        textAlign: 'center',
    },
});
