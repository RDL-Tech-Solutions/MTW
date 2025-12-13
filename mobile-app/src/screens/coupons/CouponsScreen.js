import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import CouponCard from '../../components/coupons/CouponCard';
import api from '../../services/api';

export default function CouponsScreen({ navigation }) {
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

      if (filter !== 'all') {
        params.platform = filter;
      }

      const response = await api.get('/coupons', { params });
      const data = response.data.data;

      if (Array.isArray(data)) {
        setCoupons(data);
      } else if (data.coupons) {
        setCoupons(data.coupons);
      } else {
        setCoupons([]);
      }
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
    navigation.navigate('CouponDetails', { coupon });
  };

  const renderCoupon = ({ item }) => (
    <CouponCard coupon={item} onPress={() => handleCouponPress(item)} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎁</Text>
      <Text style={styles.emptyText}>Nenhum cupom disponível</Text>
      <Text style={styles.emptySubtext}>
        Novos cupons serão exibidos aqui quando disponíveis
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Cupons Ativos</Text>
      <View style={styles.filterContainer}>
        {['all', 'mercadolivre', 'shopee', 'amazon', 'aliexpress'].map((platform) => (
          <TouchableOpacity
            key={platform}
            style={[
              styles.filterButton,
              filter === platform && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(platform)}
          >
            <Text
              style={[
                styles.filterText,
                filter === platform && styles.filterTextActive,
              ]}
            >
              {platform === 'all' ? 'Todos' :
               platform === 'mercadolivre' ? 'Mercado Livre' :
               platform === 'shopee' ? 'Shopee' :
               platform === 'amazon' ? 'Amazon' :
               'AliExpress'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EE4D2D" />
        <Text style={styles.loadingText}>Carregando cupons...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            colors={['#EE4D2D']}
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
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    paddingVertical: 8,
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
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
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#EE4D2D',
    borderColor: '#EE4D2D',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

