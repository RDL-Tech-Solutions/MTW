import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import CouponCard from '../../components/coupons/CouponCard';
import EmptyState from '../../components/common/EmptyState';
import { useThemeStore } from '../../theme/theme';
import api from '../../services/api';
import { SCREEN_NAMES, PLATFORM_LABELS, PLATFORMS } from '../../utils/constants';

export default function CouponsScreen({ navigation }) {
  const { colors } = useThemeStore();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, mercadolivre, shopee, amazon, aliexpress

  useEffect(() => {
    loadCoupons();
  }, [filter]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const params = {
        page: 1,
        limit: 50,
        is_active: true,
      };

      if (filter && filter !== 'all') {
        params.platform = filter;
      }

      const response = await api.get('/coupons', { params });
      const data = response.data.data;

      let couponsList = [];
      if (Array.isArray(data)) {
        couponsList = data;
      } else if (data.coupons) {
        couponsList = data.coupons;
      }

      // Ordenar: cupons exclusivos primeiro, depois os demais
      couponsList.sort((a, b) => {
        if (a.is_exclusive && !b.is_exclusive) return -1;
        if (!a.is_exclusive && b.is_exclusive) return 1;
        // Se ambos são exclusivos ou ambos não são, manter ordem original
        return 0;
      });

      setCoupons(couponsList);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
      setCoupons([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCoupons();
  };

  const handleCouponPress = (coupon) => {
    navigation.navigate(SCREEN_NAMES.COUPON_DETAILS, { coupon });
  };

  const renderCoupon = ({ item }) => (
    <CouponCard coupon={item} onPress={() => handleCouponPress(item)} />
  );

  const renderEmpty = () => (
    <EmptyState
      icon="ticket-outline"
      title="Nenhum cupom disponível"
      message="Novos cupons serão exibidos aqui quando disponíveis"
      iconColor={colors.primary}
    />
  );

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Cupons Ativos</Text>
      <View style={styles.filterContainer}>
        {['all', PLATFORMS.MERCADOLIVRE, PLATFORMS.SHOPEE, PLATFORMS.AMAZON, PLATFORMS.ALIEXPRESS].map((platform) => (
          <TouchableOpacity
            key={platform}
            style={[
              styles.filterButton,
              { 
                backgroundColor: filter === platform ? colors.primary : colors.card,
                borderColor: filter === platform ? colors.primary : colors.border,
              },
              filter === platform && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(platform)}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === platform ? colors.white : colors.textMuted },
                filter === platform && styles.filterTextActive,
              ]}
            >
              {platform === 'all' ? 'Todos' : PLATFORM_LABELS[platform] || platform}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Carregando cupons...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={coupons}
        renderItem={renderCoupon}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    paddingVertical: 8,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    } : {
      elevation: 1,
    }),
  },
  filterButtonActive: {
    // Estilos adicionais se necessário
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    fontWeight: '600',
  },
});
