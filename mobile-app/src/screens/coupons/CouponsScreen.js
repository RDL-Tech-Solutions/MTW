import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CouponCard from '../../components/coupons/CouponCard';
import EmptyState from '../../components/common/EmptyState';
import GradientHeader from '../../components/common/GradientHeader';
import SlideInView from '../../components/common/SlideInView';
import ScaleInView from '../../components/common/ScaleInView';
import { useThemeStore } from '../../theme/theme';
import api from '../../services/api';
import { SCREEN_NAMES, PLATFORM_LABELS, PLATFORMS } from '../../utils/constants';

const HEADER_HEIGHT = 180; // Adjust as needed for your header height

export default function CouponsScreen({ navigation }) {
  const { colors } = useThemeStore();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('all'); // Renamed filter to selectedPlatform
  const scrollY = useRef(new Animated.Value(0)).current; // Added for parallax

  useEffect(() => {
    loadCoupons();
  }, [selectedPlatform]); // Use selectedPlatform here

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

      // Ordenar: cupons exclusivos primeiro
      couponsList.sort((a, b) => {
        if (a.is_exclusive && !b.is_exclusive) return -1;
        if (!a.is_exclusive && b.is_exclusive) return 1;
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
      iconColor={colors.success}
    />
  );

  const renderListHeader = () => (
    <View style={styles.listHeaderContent}>
      {/* Platform Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {['all', PLATFORMS.MERCADOLIVRE, PLATFORMS.SHOPEE, PLATFORMS.AMAZON, PLATFORMS.ALIEXPRESS].map((platform) => {
          const isActive = filter === platform;
          let chipColor = colors.primary;

          // Cores específicas por plataforma
          if (platform === PLATFORMS.MERCADOLIVRE) chipColor = '#FFE600';
          else if (platform === PLATFORMS.SHOPEE) chipColor = '#EE4D2D';
          else if (platform === PLATFORMS.AMAZON) chipColor = '#FF9900';
          else if (platform === PLATFORMS.ALIEXPRESS) chipColor = '#E62E04';

          return (
            <TouchableOpacity
              key={platform}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? chipColor : colors.card,
                  borderColor: isActive ? chipColor : colors.border,
                },
              ]}
              onPress={() => setFilter(platform)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: isActive ? '#fff' : colors.text },
                ]}
              >
                {platform === 'all' ? 'Todos' : PLATFORM_LABELS[platform] || platform}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Stats Info */}
      <View style={[styles.statsInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Ionicons name="ticket" size={24} color={colors.success} />
          <Text style={[styles.statNumber, { color: colors.text }]}>{coupons.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Ativos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="star" size={24} color={colors.warning} />
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {coupons.filter(c => c.is_exclusive).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Exclusivos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="flash" size={24} color={colors.error} />
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {coupons.filter(c => {
              const validUntil = new Date(c.valid_until);
              const daysLeft = Math.ceil((validUntil - new Date()) / (1000 * 60 * 60 * 24));
              return daysLeft <= 3;
            }).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Expirando</Text>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <GradientHeader
          title="Cupons"
          subtitle="Economize mais com nossos cupons exclusivos"
          gradientColors={[colors.success, colors.iconColors.products]}
          rightComponent={
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          }
        />
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.success} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Carregando cupons...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient Header */}
      <GradientHeader
        title="Cupons"
        subtitle="Economize mais com nossos cupons exclusivos"
        gradientColors={[colors.success, colors.iconColors.products]}
        rightComponent={
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack && navigation.goBack()}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={coupons}
        renderItem={renderCoupon}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.success]}
            tintColor={colors.success}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  listHeaderContent: {
    marginBottom: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: {
    paddingVertical: 4,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1.5,
    marginRight: 10,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
    } : {
      elevation: 2,
    }),
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsInfo: {
    flexDirection: 'row',
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    } : {
      elevation: 3,
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
