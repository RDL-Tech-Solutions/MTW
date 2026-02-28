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
  StatusBar,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import CouponCard from '../../components/coupons/CouponCard';
import EmptyState from '../../components/common/EmptyState';
import SearchBar from '../../components/common/SearchBar';
import { useThemeStore } from '../../theme/theme';
import { useProductStore } from '../../stores/productStore';
import api from '../../services/api';
import { SCREEN_NAMES, PLATFORM_LABELS, PLATFORMS } from '../../utils/constants';
import { getPlatformColor, getPlatformName, PlatformIcon } from '../../utils/platformIcons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FILTER_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'expiring', label: 'Acabam hoje' },
  { key: 'exclusive', label: 'Exclusivos' },
];

function formatPrice(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '';
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

// ── Bottom-sheet modal card for a single coupon ──────────────────────────────
function CouponDetailModal({ coupon, visible, onClose, navigation, colors }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const headerSlideAnim = useRef(new Animated.Value(-50)).current;
  const infoSlideAnim = useRef(new Animated.Value(30)).current;
  const buttonSlideAnim = useRef(new Animated.Value(50)).current;
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkedProductsCount, setLinkedProductsCount] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (visible && coupon) {
      setCodeCopied(false);

      // Registrar visualização do cupom (silenciosamente)
      if (coupon.id) {
        api.post(`/coupons/${coupon.id}/view`).catch(e => console.log('Erro ao registrar view do cupom:', e.message));
      }

      // Verificar produtos vinculados
      checkLinkedProducts();

      // Animação de abertura em cascata
      Animated.parallel([
        // Backdrop fade in
        Animated.timing(backdropAnim, { 
          toValue: 1, 
          duration: 300, 
          useNativeDriver: true 
        }),
        // Sheet slide up com bounce
        Animated.spring(slideAnim, { 
          toValue: 0, 
          useNativeDriver: true, 
          friction: 9, 
          tension: 65,
          velocity: 2,
        }),
        // Sheet scale up
        Animated.spring(scaleAnim, { 
          toValue: 1, 
          useNativeDriver: true, 
          friction: 8, 
          tension: 50,
          delay: 50,
        }),
      ]).start();

      // Animações em cascata do conteúdo
      Animated.stagger(80, [
        // Header slide in
        Animated.spring(headerSlideAnim, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        // Info section slide in
        Animated.spring(infoSlideAnim, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        // Button slide in
        Animated.spring(buttonSlideAnim, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();

      // Content fade in
      Animated.timing(contentFadeAnim, { 
        toValue: 1, 
        duration: 400, 
        delay: 150, 
        useNativeDriver: true 
      }).start();
    } else {
      // Animação de fechamento
      Animated.parallel([
        Animated.timing(slideAnim, { 
          toValue: SCREEN_HEIGHT, 
          duration: 250, 
          useNativeDriver: true 
        }),
        Animated.timing(backdropAnim, { 
          toValue: 0, 
          duration: 200, 
          useNativeDriver: true 
        }),
        Animated.timing(scaleAnim, { 
          toValue: 0.85, 
          duration: 200, 
          useNativeDriver: true 
        }),
        Animated.timing(contentFadeAnim, { 
          toValue: 0, 
          duration: 150, 
          useNativeDriver: true 
        }),
      ]).start();

      // Reset das animações do conteúdo
      headerSlideAnim.setValue(-50);
      infoSlideAnim.setValue(30);
      buttonSlideAnim.setValue(50);
    }
  }, [visible, coupon]);

  const checkLinkedProducts = async () => {
    if (!coupon?.id) return;
    setLoadingProducts(true);
    try {
      const response = await api.get(`/coupons/${coupon.id}/products?limit=1`);
      const total = response.data?.data?.total || 0;
      setLinkedProductsCount(total);
    } catch (error) {
      console.log('Erro ao verificar produtos vinculados:', error);
      setLinkedProductsCount(0);
    }
    setLoadingProducts(false);
  };

  if (!coupon) return null;

  const platformColor = getPlatformColor(coupon.platform);
  const hasProducts = Array.isArray(coupon.applicable_products) && coupon.applicable_products.length > 0;
  const hasLinkedProducts = linkedProductsCount > 0;
  const scope = hasProducts ? 'Produtos selecionados' : 'Todos os produtos';

  const handleCopyCode = async () => {
    if (coupon.is_out_of_stock) {
      return;
    }
    if (coupon.code) {
      await Clipboard.setStringAsync(coupon.code);
      setCodeCopied(true);
      
      // Sem animação de scale, apenas transição de cor/texto
      setTimeout(() => setCodeCopied(false), 2500);
    }
  };

  const handleSeeProducts = () => {
    onClose();
    setTimeout(() => {
      navigation.navigate(SCREEN_NAMES.COUPON_PRODUCTS, { coupon });
    }, 300);
  };

  const handleSeeLinkedProducts = () => {
    onClose();
    setTimeout(() => {
      navigation.navigate(SCREEN_NAMES.LINKED_PRODUCTS, { 
        couponId: coupon.id,
        platformColor: platformColor
      });
    }, 300);
  };

  const formatDiscount = () => {
    if (coupon.discount_type === 'percentage') return `${coupon.discount_value}% OFF`;
    return `R$ ${coupon.discount_value} OFF`;
  };

  const s = modalStyles(colors, platformColor);

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[s.backdrop, { opacity: backdropAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View 
        style={[
          s.sheet, 
          { 
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ] 
          }
        ]}
      >
        {/* Handle */}
        <View style={s.handleContainer}>
          <View style={s.handle} />
        </View>

        <Animated.View style={{ opacity: contentFadeAnim }}>
          {/* Platform header strip */}
          <Animated.View 
            style={[
              s.platformStrip, 
              { 
                backgroundColor: platformColor + '12',
                transform: [{ translateY: headerSlideAnim }]
              }
            ]}
          >
            <PlatformIcon platform={coupon.platform} size={22} />
            <Text style={[s.platformName, { color: platformColor }]}>
              {getPlatformName(coupon.platform)}
            </Text>
            {coupon.is_exclusive && (
              <View style={s.exclusiveBadge}>
                <Ionicons name="star" size={9} color="#B45309" />
                <Text style={s.exclusiveText}>VIP</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <View style={[s.discountPill, { backgroundColor: platformColor }]}>
              <Text style={s.discountPillText}>{formatDiscount()}</Text>
            </View>
          </Animated.View>

          {/* Title */}
          {coupon.title && (
            <Animated.Text 
              style={[
                s.couponTitle,
                { transform: [{ translateY: headerSlideAnim }] }
              ]}
            >
              {coupon.title}
            </Animated.Text>
          )}

          {/* Info rows */}
          <Animated.View 
            style={[
              s.infoSection,
              { transform: [{ translateY: infoSlideAnim }] }
            ]}
          >
            <InfoRow icon="bag-handle-outline" label="Escopo" value={scope} colors={colors} />
            {coupon.min_purchase > 0 && (
              <InfoRow icon="wallet-outline" label="Compra mínima" value={formatPrice(coupon.min_purchase)} colors={colors} />
            )}
            {(coupon.max_uses || coupon.usage_limit) && (
              <InfoRow icon="people-outline" label="Limite" value={`${coupon.max_uses || coupon.usage_limit} usos`} colors={colors} />
            )}
            {coupon.valid_until && (
              <InfoRow icon="calendar-outline" label="Válido até" value={new Date(coupon.valid_until).toLocaleDateString('pt-BR')} colors={colors} />
            )}
          </Animated.View>

          {/* Code Section */}
          {coupon.code ? (
            <View style={s.codeSection}>
              <Text style={s.codeLabel}>CÓDIGO DO CUPOM</Text>
              <View style={s.codeBox}>
                <Ionicons name="ticket-outline" size={18} color={coupon.is_out_of_stock ? colors.textMuted : platformColor} />
                <Text style={[s.codeText, coupon.is_out_of_stock && { color: colors.textMuted, textDecorationLine: 'line-through' }]}>
                  {coupon.code}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  s.copyBtn,
                  { backgroundColor: coupon.is_out_of_stock ? colors.border : (codeCopied ? '#16A34A' : platformColor) }
                ]}
                onPress={coupon.is_out_of_stock ? null : handleCopyCode}
                activeOpacity={0.85}
                disabled={coupon.is_out_of_stock}
              >
                <Ionicons
                  name={coupon.is_out_of_stock ? 'close-circle-outline' : (codeCopied ? 'checkmark-circle' : 'copy-outline')}
                  size={18}
                  color={coupon.is_out_of_stock ? colors.textMuted : '#fff'}
                />
                <Text style={[s.copyBtnText, coupon.is_out_of_stock && { color: colors.textMuted }]}>
                  {coupon.is_out_of_stock ? 'Cupom Esgotado' : (codeCopied ? 'Código Copiado!' : 'Copiar Código')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.codeSection}>
              <View style={[s.noCodeBox, { backgroundColor: platformColor + '10' }]}>
                <Ionicons name="link-outline" size={20} color={platformColor} />
                <Text style={[s.noCodeText, { color: colors.textMuted }]}>
                  Desconto aplicado automaticamente pelo link
                </Text>
              </View>
            </View>
          )}

          {/* See Products Buttons */}
          {hasProducts && (
            <Animated.View style={{ transform: [{ translateY: buttonSlideAnim }] }}>
              <TouchableOpacity
                style={[s.productsBtn, { borderColor: platformColor }]}
                onPress={handleSeeProducts}
                activeOpacity={0.8}
              >
                <Ionicons name="grid-outline" size={18} color={platformColor} />
                <Text style={[s.productsBtnText, { color: platformColor }]}>
                  Ver {coupon.applicable_products.length} produto{coupon.applicable_products.length !== 1 ? 's' : ''} vinculado{coupon.applicable_products.length !== 1 ? 's' : ''}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={platformColor} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Linked Products Button */}
          {hasLinkedProducts && (
            <Animated.View style={{ transform: [{ translateY: buttonSlideAnim }] }}>
              <TouchableOpacity
                style={[s.productsBtn, { borderColor: platformColor, marginTop: hasProducts ? 8 : 0 }]}
                onPress={handleSeeLinkedProducts}
                activeOpacity={0.8}
                disabled={loadingProducts}
              >
                <Ionicons name="pricetags-outline" size={18} color={platformColor} />
                <Text style={[s.productsBtnText, { color: platformColor }]}>
                  {loadingProducts ? 'Verificando...' : `Ver ${linkedProductsCount} produto${linkedProductsCount !== 1 ? 's' : ''} com este cupom`}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={platformColor} />
              </TouchableOpacity>
            </Animated.View>
          )}

          <View style={s.bottomSpacer} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const InfoRow = ({ icon, label, value, colors }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 }}>
    <Ionicons name={icon} size={16} color={colors.textMuted} />
    <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500', minWidth: 100 }}>{label}</Text>
    <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' }}>{value}</Text>
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CouponsScreen({ navigation }) {
  const { colors } = useThemeStore();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Animações
  const headerAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const tabsSlideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadCoupons();
    
    // Animação de entrada do header com bounce
    Animated.spring(headerAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Animação de fade in geral
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Animação da search bar com delay
    Animated.spring(searchBarAnim, {
      toValue: 1,
      delay: 200,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Animação das tabs com slide
    Animated.spring(tabsSlideAnim, {
      toValue: 0,
      delay: 300,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Animação de pulso contínua para badges
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
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

    // Animação flutuante para ícones
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: -8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [selectedPlatform]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const params = {
        page: 1,
        limit: 50,
        _t: Date.now(), // Force cache bypass
        // Remover filtro is_active para mostrar todos os cupons
        // Remover filtro is_out_of_stock para mostrar cupons esgotados também
      };
      if (selectedPlatform && selectedPlatform !== 'all') {
        params.platform = selectedPlatform;
      }

      // Adiciona um timestamp para forçar atualização no pull-to-refresh
      if (refreshing) {
        params._t = Date.now();
      }

      console.log('🔄 Carregando cupons com params:', params);
      const response = await api.get('/coupons', { params });
      console.log('📡 Resposta da API:', response.data);
      
      const data = response.data.data;
      let couponsList = Array.isArray(data) ? data : data?.coupons || [];
      
      // Log para debug - ver cupons duplicados
      console.log('📊 Total de cupons recebidos:', couponsList.length);
      console.log('📋 Cupons completos:', JSON.stringify(couponsList.map(c => ({ 
        id: c.id, 
        code: c.code, 
        title: c.title,
        platform: c.platform,
        discount_value: c.discount_value,
        is_exclusive: c.is_exclusive,
        is_out_of_stock: c.is_out_of_stock
      })), null, 2));
      
      // Remover duplicatas por ID
      const uniqueCoupons = [];
      const seenIds = new Set();
      
      for (const coupon of couponsList) {
        if (!seenIds.has(coupon.id)) {
          seenIds.add(coupon.id);
          uniqueCoupons.push(coupon);
        } else {
          console.warn('⚠️ Cupom duplicado removido:', coupon.id, coupon.code);
        }
      }
      
      console.log('✅ Cupons únicos após filtro:', uniqueCoupons.length);
      
      couponsList = uniqueCoupons;
      
      // Ordenar cupons: Exclusivos primeiro, depois por data de criação
      couponsList.sort((a, b) => {
        // 1. Cupons exclusivos sempre no topo
        if (a.is_exclusive && !b.is_exclusive) return -1;
        if (!a.is_exclusive && b.is_exclusive) return 1;
        
        // 2. Entre cupons do mesmo tipo, ordenar por data (mais recentes primeiro)
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
      
      console.log('🎯 Cupons ordenados (Exclusivos primeiro):', couponsList.map(c => ({
        code: c.code,
        is_exclusive: c.is_exclusive,
        created_at: c.created_at
      })));
      
      setCoupons(couponsList);
    } catch (error) {
      console.error('❌ Erro ao carregar cupons:', error);
      console.error('Detalhes do erro:', error.response?.data || error.message);
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
    setSelectedCoupon(coupon);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const filteredCoupons = coupons.filter(c => {
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

  // Separar cupons ativos e esgotados
  const activeCoupons = filteredCoupons.filter(c => !c.is_out_of_stock);
  const outOfStockCoupons = filteredCoupons.filter(c => c.is_out_of_stock);

  // Criar lista combinada com divisor
  const combinedList = [
    ...activeCoupons,
    ...(outOfStockCoupons.length > 0 ? [{ isDivider: true }] : []),
    ...outOfStockCoupons
  ];

  const s = dynamicStyles(colors);

  const renderCoupon = ({ item, index }) => {
    // Renderizar divisor
    if (item.isDivider) {
      return (
        <View style={s.dividerContainer}>
          <View style={s.dividerLine} />
          <View style={s.dividerTextContainer}>
            <Ionicons name="ban" size={16} color={colors.textMuted} />
            <Text style={s.dividerText}>Cupons Esgotados</Text>
          </View>
          <View style={s.dividerLine} />
        </View>
      );
    }
    
    // Renderizar cupom normal
    return <CouponCard coupon={item} onPress={() => handleCouponPress(item)} index={index} />;
  };

  const renderEmpty = () => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: floatingAnim }] }}>
      <EmptyState
        icon="ticket-outline"
        title={searchQuery ? 'Nenhum cupom encontrado' : 'Nenhum cupom disponível'}
        message={searchQuery ? 'Tente buscar por outro termo' : 'Novos cupons serão exibidos aqui'}
        iconColor={colors.primary}
      />
    </Animated.View>
  );

  const renderHeader = () => {
    const headerTranslateY = headerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-50, 0],
    });

    const searchBarScale = searchBarAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    });

    return (
      <View>
        <Animated.View 
          style={[
            s.headerBar,
            {
              opacity: headerAnim,
              transform: [{ translateY: headerTranslateY }],
            }
          ]}
        >
          <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
          
          <View style={s.headerContent}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }, { translateY: floatingAnim }] }}>
              <Ionicons name="ticket" size={28} color="#fff" />
            </Animated.View>
            <View style={s.headerTextContainer}>
              <Text style={s.headerTitle}>Cupons</Text>
              <Animated.Text style={[s.headerSubtitle, { opacity: fadeAnim }]}>
                {filteredCoupons.length} {filteredCoupons.length === 1 ? 'cupom' : 'cupons'} disponíveis
              </Animated.Text>
            </View>
          </View>
        </Animated.View>

        {/* Search Bar com animação */}
        <Animated.View 
          style={[
            s.searchSection, 
            { 
              opacity: searchBarAnim,
              transform: [{ scale: searchBarScale }],
            }
          ]}
        >
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar cupons, lojas..."
          />
        </Animated.View>

        {/* Filter Tabs com slide */}
        <Animated.View 
          style={{ 
            opacity: fadeAnim,
            transform: [{ translateX: tabsSlideAnim }],
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabScroll}
            style={s.tabContainer}
          >
            {FILTER_TABS.map((tab, index) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    s.tabChip, 
                    isActive && s.tabChipActive,
                    isActive && { backgroundColor: colors.primary + '12' }
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                >
                  {isActive && (
                    <Animated.View 
                      style={[
                        StyleSheet.absoluteFill,
                        s.tabChipActive,
                        { 
                          transform: [{ scale: pulseAnim }],
                          backgroundColor: colors.primary + '12'
                        }
                      ]}
                    />
                  )}
                  <Text style={[s.tabChipText, isActive && s.tabChipTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <View style={s.tabDivider} />
            {[
              'all', 
              PLATFORMS.MERCADOLIVRE, 
              PLATFORMS.SHOPEE, 
              PLATFORMS.AMAZON,
              PLATFORMS.ALIEXPRESS,
              PLATFORMS.KABUM,
              PLATFORMS.MAGAZINELUIZA,
              PLATFORMS.PICHAU
            ].map((platform, index) => {
              const isActive = selectedPlatform === platform;
              return (
                <TouchableOpacity
                  key={platform}
                  style={[
                    s.tabChip, 
                    isActive && s.tabChipActive,
                    isActive && { backgroundColor: colors.primary + '12' }
                  ]}
                  onPress={() => setSelectedPlatform(platform)}
                  activeOpacity={0.7}
                >
                  {isActive && (
                    <Animated.View 
                      style={[
                        StyleSheet.absoluteFill,
                        s.tabChipActive,
                        { 
                          transform: [{ scale: pulseAnim }],
                          backgroundColor: colors.primary + '12'
                        }
                      ]}
                    />
                  )}
                  <Text style={[s.tabChipText, isActive && s.tabChipTextActive]}>
                    {platform === 'all' ? 'Todas lojas' : PLATFORM_LABELS[platform] || platform}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={s.container}>
        {renderHeader()}
        <Animated.View 
          style={[
            s.loadingContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: floatingAnim }]
            }
          ]}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons name="ticket" size={64} color={colors.primary} />
          </Animated.View>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          <Text style={s.loadingText}>Carregando cupons...</Text>
          <Text style={[s.loadingText, { fontSize: 12, marginTop: 4 }]}>
            Buscando as melhores ofertas para você
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      <FlatList
        data={combinedList}
        renderItem={renderCoupon}
        keyExtractor={(item, index) => item.isDivider ? `divider-${index}` : item.id}
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

      <CouponDetailModal
        coupon={selectedCoupon}
        visible={modalVisible}
        onClose={handleCloseModal}
        navigation={navigation}
        colors={colors}
      />
    </Animated.View>
  );
}

// ── Modal Styles ──────────────────────────────────────────────────────────────
const modalStyles = (colors, platformColor) => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
    } : {
      elevation: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
    }),
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  platformStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    marginHorizontal: 16,
    borderRadius: 14,
    marginBottom: 4,
  },
  platformName: {
    fontSize: 15,
    fontWeight: '700',
  },
  exclusiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  exclusiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  discountPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  discountPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  couponTitle: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 20,
  },
  infoSection: {
    marginHorizontal: 20,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  codeSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 10,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: platformColor + '50',
    paddingVertical: 14,
    marginBottom: 12,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    height: 52,
    gap: 8,
    ...(Platform.OS === 'web' ? {} : {
      elevation: 3,
      shadowColor: platformColor,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    }),
  },
  copyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  noCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 16,
  },
  noCodeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  productsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  productsBtnText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 36 : 20,
  },
});

// ── Screen Styles ─────────────────────────────────────────────────────────────
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
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    } : {
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
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
    overflow: 'hidden',
  },
  tabChipActive: {
    borderColor: colors.primary,
    // backgroundColor aplicado inline
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
  listContent: {
    paddingBottom: 100, // Espaço para navbar flutuante
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  // Divisor entre cupons ativos e esgotados
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
