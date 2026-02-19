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
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CouponCard from '../../components/coupons/CouponCard';
import EmptyState from '../../components/common/EmptyState';
import SearchBar from '../../components/common/SearchBar';
import { useThemeStore } from '../../theme/theme';
import api from '../../services/api';
import { SCREEN_NAMES, PLATFORM_LABELS, PLATFORMS } from '../../utils/constants';

const FILTER_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'expiring', label: 'Acabam hoje' },
  { key: 'exclusive', label: 'Exclusivos' },
];

export default function CouponsScreen({ navigation }) {
  const { colors } = useThemeStore();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCoupons();
  }, [selectedPlatform]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const params = {
        page: 1,
        limit: 50,
        is_active: true,
      };

      if (selectedPlatform && selectedPlatform !== 'all') {
        params.platform = selectedPlatform;
      }

      const response = await api.get('/coupons', { params });
      const data = response.data.data;

      let couponsList = [];
      if (Array.isArray(data)) {
        couponsList = data;
      } else if (data.coupons) {
        couponsList = data.coupons;
      }

      // Sort: exclusive first, then by expiry
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
    // Navigate to details (or just copy, handled by card)
    navigation.navigate(SCREEN_NAMES.COUPON_DETAILS, { coupon });
  };

  // Apply tab filter & search
  const filteredCoupons = coupons.filter(c => {
    // Tab filtering
    let tabMatch = true;
    if (activeTab === 'expiring') {
      if (!c.valid_until) tabMatch = false;
      else {
        const daysLeft = Math.ceil((new Date(c.valid_until) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 1) tabMatch = false;
      }
    } else if (activeTab === 'exclusive') {
      tabMatch = c.is_exclusive;
    }

    // Search filtering
    let searchMatch = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      searchMatch =
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.store_name && c.store_name.toLowerCase().includes(q)) ||
        (PLATFORM_LABELS[c.platform] && PLATFORM_LABELS[c.platform].toLowerCase().includes(q));
    }

    return tabMatch && searchMatch;
  });

  const s = dynamicStyles(colors);

  const renderCoupon = ({ item, index }) => (
    <CouponCard coupon={item} onPress={() => handleCouponPress(item)} index={index} />
  );

  const renderEmpty = () => (
    <EmptyState
      icon="ticket-outline"
      title={searchQuery ? 'Nenhum cupom encontrado' : 'Nenhum cupom disponível'}
      message={searchQuery ? 'Tente buscar por outro termo' : 'Novos cupons serão exibidos aqui'}
      iconColor={colors.primary}
    />
  );

  // ─── HEADER ────────────────────────────────────────────
  const renderHeader = () => (
    <View>
      {/* Top bar with Search */}
      <View style={s.headerBar}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

        <View style={s.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={s.searchContainer}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar cupons, lojas..."
              containerStyle={s.searchBarOverride}
            />
          </View>
        </View>
      </View>

      {/* Info bar */}
      <View style={s.infoBar}>
        <Text style={s.infoText}>
          {filteredCoupons.length} {filteredCoupons.length === 1 ? 'Cupom' : 'Cupons'} encontrados
        </Text>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabScroll}
        style={s.tabContainer}
      >
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tabChip, activeTab === tab.key && s.tabChipActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[s.tabChipText, activeTab === tab.key && s.tabChipTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
        {/* Platform filter chips */}
        <View style={s.tabDivider} />
        {['all', PLATFORMS.MERCADOLIVRE, PLATFORMS.SHOPEE, PLATFORMS.AMAZON].map(platform => {
          const isActive = selectedPlatform === platform;
          return (
            <TouchableOpacity
              key={platform}
              style={[s.tabChip, isActive && s.tabChipActive]}
              onPress={() => setSelectedPlatform(platform)}
            >
              <Text style={[s.tabChipText, isActive && s.tabChipTextActive]}>
                {platform === 'all' ? 'Todas lojas' : PLATFORM_LABELS[platform] || platform}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={s.container}>
        {renderHeader()}
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Carregando cupons...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FlatList
        data={filteredCoupons}
        renderItem={renderCoupon}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={s.listContent}
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

  // ─── Header bar ────────────────────────────────────────
  headerBar: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight + 8,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flex: 1,
  },
  searchBarOverride: {
    height: 38, // Slightly smaller for header
    backgroundColor: '#fff',
    borderRadius: 19,
  },

  // ─── Info bar ──────────────────────────────────────────
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // ─── Filter tabs ──────────────────────────────────────
  tabContainer: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tabChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  tabChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginHorizontal: 4,
  },

  // ─── List ─────────────────────────────────────────────
  listContent: {
    paddingBottom: 24,
  },

  // ─── Loading ──────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EBEBEB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
