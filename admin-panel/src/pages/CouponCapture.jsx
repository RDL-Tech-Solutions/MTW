import { useState, useEffect } from 'react';
import {
  RefreshCw, Settings, TrendingUp, Clock, AlertCircle,
  CheckCircle, XCircle, Play, Pause, Eye, Download,
  Zap, ShoppingBag, Search, Filter, CheckSquare, Square,
  FileDown, Trash2, CheckCircle2, Loader2, Brain, Sparkles
} from 'lucide-react';
import api from '../services/api';
import { Pagination } from '../components/ui/Pagination';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

export default function CouponCapture() {
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [logs, setLogs] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [cronStatus, setCronStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [couponsPagination, setCouponsPagination] = useState({
    page: 1,
    limit: 50,
    totalPages: 1,
    total: 0
  });

  const [logsPagination, setLogsPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0
  });

  // Filtros e busca
  const [filters, setFilters] = useState({
    search: '',
    platform: '',
    verification_status: '',
    is_active: '',
    is_general: '',
    discount_type: '',
    min_discount: '',
    max_discount: ''
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedCoupons, setSelectedCoupons] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingCoupons, setPendingCoupons] = useState([]);
  const [pendingPagination, setPendingPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0
  });
  
  // Estados para funcionalidades Shopee
  const [shopeeCategories, setShopeeCategories] = useState([]);
  const [shopeeLoading, setShopeeLoading] = useState(false);
  const [shopeeKeyword, setShopeeKeyword] = useState('');
  const [shopeeResults, setShopeeResults] = useState(null);
  const [shopeeAnalysis, setShopeeAnalysis] = useState(null);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadSettings(),
        loadLogs(1),
        loadCoupons(1),
        loadCronStatus(),
        loadPendingCoupons(1)
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/coupon-capture/stats?days=7');
      setStats(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await api.get('/coupon-capture/settings');
      setSettings(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const loadLogs = async (page = 1) => {
    try {
      const response = await api.get(`/coupon-capture/logs?limit=20&page=${page}`);

      const data = response.data.data;

      if (Array.isArray(data)) {
        setLogs(data);
      } else {
        setLogs(data.logs || []);
        setLogsPagination(prev => ({
          ...prev,
          page,
          totalPages: data.totalPages || 1,
          total: data.total || 0
        }));
      }

    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  };

  const loadCoupons = async (page = 1) => {
    try {
      // Construir query string com filtros
      const params = new URLSearchParams({
        limit: '50',
        auto_captured: 'true',
        page: page.toString()
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          params.append(key, value);
        }
      });

      const response = await api.get(`/coupon-capture/coupons?${params.toString()}`);
      const data = response.data.data;

      if (Array.isArray(data)) {
        setCoupons(data);
      } else {
        setCoupons(data.coupons || []);
        setCouponsPagination(prev => ({
          ...prev,
          page,
          totalPages: data.totalPages || 1,
          total: data.total || 0
        }));
      }

      // Limpar seleção ao mudar de página
      setSelectedCoupons([]);

    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
    }
  };

  const loadCronStatus = async () => {
    try {
      const response = await api.get('/coupon-capture/cron-status');
      setCronStatus(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar status do cron:', error);
    }
  };

  const handleSyncAll = async () => {
    if (syncing) return;

    try {
      setSyncing(true);
      await api.post('/coupon-capture/sync/all');
      alert('Sincronização iniciada com sucesso!');
      setTimeout(() => {
        loadLogs(1);
        loadStats();
      }, 3000);
    } catch (error) {
      console.error('Erro na sincronização:', error);
      alert('Erro ao iniciar sincronização');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncPlatform = async (platform) => {
    try {
      setSyncing(true);
      await api.post(`/coupon-capture/sync/${platform}`);
      alert(`Sincronização de ${platform} iniciada!`);
      setTimeout(() => {
        loadLogs(1);
        loadStats();
        if (platform === 'gatry') {
          loadPendingCoupons(1);
        }
      }, 3000);
    } catch (error) {
      console.error('Erro na sincronização:', error);
      alert('Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const loadPendingCoupons = async (page = 1) => {
    try {
      const response = await api.get(`/coupon-capture/pending?page=${page}&limit=20`);
      const data = response.data.data;
      
      if (Array.isArray(data)) {
        setPendingCoupons(data);
      } else {
        setPendingCoupons(data.coupons || []);
        setPendingPagination(prev => ({
          ...prev,
          page,
          totalPages: data.totalPages || 1,
          total: data.total || 0
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar cupons pendentes:', error);
    }
  };

  const handleApproveCoupon = async (couponId, updates = {}) => {
    try {
      await api.put(`/coupon-capture/coupons/${couponId}/approve`, updates);
      alert('Cupom aprovado com sucesso!');
      loadPendingCoupons(pendingPagination.page);
      loadCoupons(couponsPagination.page);
      loadStats();
    } catch (error) {
      console.error('Erro ao aprovar cupom:', error);
      alert('Erro ao aprovar cupom');
    }
  };

  const handleRejectCoupon = async (couponId, reason = '') => {
    try {
      await api.put(`/coupon-capture/coupons/${couponId}/reject`, { reason });
      alert('Cupom rejeitado com sucesso!');
      loadPendingCoupons(pendingPagination.page);
      loadStats();
    } catch (error) {
      console.error('Erro ao rejeitar cupom:', error);
      alert('Erro ao rejeitar cupom');
    }
  };

  const handleApproveBatch = async () => {
    if (selectedCoupons.length === 0) {
      alert('Selecione pelo menos um cupom');
      return;
    }

    if (!confirm(`Aprovar ${selectedCoupons.length} cupom(ns)?`)) return;

    try {
      await api.post('/coupon-capture/coupons/approve-batch', { ids: selectedCoupons });
      alert(`${selectedCoupons.length} cupom(ns) aprovado(s) com sucesso!`);
      setSelectedCoupons([]);
      loadPendingCoupons(pendingPagination.page);
      loadCoupons(couponsPagination.page);
      loadStats();
    } catch (error) {
      console.error('Erro ao aprovar cupons:', error);
      alert('Erro ao aprovar cupons');
    }
  };

  const handleRejectBatch = async () => {
    if (selectedCoupons.length === 0) {
      alert('Selecione pelo menos um cupom');
      return;
    }

    const reason = prompt('Motivo da rejeição (opcional):');
    if (reason === null) return; // Usuário cancelou

    try {
      await api.post('/coupon-capture/coupons/reject-batch', { ids: selectedCoupons, reason });
      alert(`${selectedCoupons.length} cupom(ns) rejeitado(s) com sucesso!`);
      setSelectedCoupons([]);
      loadPendingCoupons(pendingPagination.page);
      loadStats();
    } catch (error) {
      console.error('Erro ao rejeitar cupons:', error);
      alert('Erro ao rejeitar cupons');
    }
  };

  const handleToggleAutoCapture = async () => {
    try {
      const enabled = !settings.auto_capture_enabled;
      await api.post('/coupon-capture/toggle-auto-capture', { enabled });
      alert(enabled ? 'Captura automática ativada!' : 'Captura automática desativada!');
      loadSettings();
      loadCronStatus();
    } catch (error) {
      console.error('Erro ao alterar captura automática:', error);
      alert('Erro ao alterar configuração');
    }
  };

  const handleUpdateSettings = async (updates) => {
    try {
      await api.put('/coupon-capture/settings', updates);
      alert('Configurações atualizadas!');
      loadSettings();
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      alert('Erro ao atualizar configurações');
    }
  };

  const handleExpireCoupon = async (couponId) => {
    if (!confirm('Tem certeza que deseja expirar este cupom?')) return;

    try {
      await api.put(`/coupon-capture/coupons/${couponId}/expire`);
      alert('Cupom expirado com sucesso!');
      loadCoupons(couponsPagination.page);
    } catch (error) {
      console.error('Erro ao expirar cupom:', error);
      alert('Erro ao expirar cupom');
    }
  };

  const handleVerifyCoupon = async (couponId) => {
    try {
      await api.post(`/coupon-capture/coupons/${couponId}/verify`);
      alert('Verificação concluída!');
      loadCoupons(couponsPagination.page);
    } catch (error) {
      console.error('Erro ao verificar cupom:', error);
      alert('Erro ao verificar cupom');
    }
  };

  const handleBatchAction = async (action) => {
    if (selectedCoupons.length === 0) {
      alert('Selecione pelo menos um cupom');
      return;
    }

    const actionNames = {
      expire: 'expirar',
      activate: 'ativar',
      delete: 'deletar'
    };

    if (!confirm(`Tem certeza que deseja ${actionNames[action]} ${selectedCoupons.length} cupom(ns)?`)) {
      return;
    }

    try {
      await api.post('/coupon-capture/coupons/batch', {
        action,
        coupon_ids: selectedCoupons
      });
      alert(`${selectedCoupons.length} cupom(ns) ${actionNames[action]}(s) com sucesso!`);
      setSelectedCoupons([]);
      loadCoupons(couponsPagination.page);
    } catch (error) {
      console.error('Erro na ação em lote:', error);
      alert('Erro ao executar ação em lote');
    }
  };

  const handleExport = async (format = 'json') => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({ format, ...filters });
      const response = await api.get(`/coupon-capture/coupons/export?${params.toString()}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `coupons_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const dataStr = JSON.stringify(response.data.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `coupons_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      alert('Exportação concluída!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar cupons');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      platform: '',
      verification_status: '',
      is_active: '',
      is_general: '',
      discount_type: '',
      min_discount: '',
      max_discount: ''
    });
  };

  const toggleSelectCoupon = (couponId) => {
    setSelectedCoupons(prev => 
      prev.includes(couponId)
        ? prev.filter(id => id !== couponId)
        : [...prev, couponId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCoupons.length === coupons.length) {
      setSelectedCoupons([]);
    } else {
      setSelectedCoupons(coupons.map(c => c.id));
    }
  };

  // Recarregar cupons quando filtros mudarem
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCoupons(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  const getPlatformIcon = (platform) => {
    const icons = {
      shopee: '🛍️',
      mercadolivre: '🛒',
      amazon: '📦',
      aliexpress: '🌐',
      gatry: '🎟️'
    };
    return icons[platform] || '🎁';
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'text-green-600 bg-green-100',
      running: 'text-blue-600 bg-blue-100',
      failed: 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getVerificationStatusColor = (status) => {
    const colors = {
      active: 'text-green-600 bg-green-100',
      pending: 'text-yellow-600 bg-yellow-100',
      expired: 'text-red-600 bg-red-100',
      invalid: 'text-gray-600 bg-gray-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🔥 Captura Automática de Cupons
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie a captura e sincronização de cupons de todas as plataformas
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleToggleAutoCapture}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${settings?.auto_capture_enabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
          >
            {settings?.auto_capture_enabled ? <Pause size={20} /> : <Play size={20} />}
            {settings?.auto_capture_enabled ? 'Pausar' : 'Ativar'} Captura
          </button>
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
            Sincronizar Agora
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cupons Ativos</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats?.coupons?.active || 0}
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expirando em Breve</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">
                {stats?.coupons?.expiring_soon || 0}
              </p>
            </div>
            <Clock className="w-12 h-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sincronizações (7d)</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {Object.values(stats?.platforms || {}).reduce((sum, p) => sum + p.total_syncs, 0)}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Status do Cron</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {cronStatus?.capture?.running ? (
                  <span className="text-green-600 flex items-center gap-2">
                    <Zap size={20} /> Ativo
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center gap-2">
                    <AlertCircle size={20} /> Inativo
                  </span>
                )}
              </p>
            </div>
            <Settings className="w-12 h-12 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6">
            {['overview', 'pending', 'coupons', 'shopee', 'logs', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 font-medium border-b-2 transition-colors ${activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                {tab === 'overview' && 'Visão Geral'}
                {tab === 'pending' && `Cupons Pendentes (${pendingPagination.total})`}
                {tab === 'coupons' && 'Cupons Capturados'}
                {tab === 'shopee' && '🛍️ Shopee'}
                {tab === 'logs' && 'Logs de Sincronização'}
                {tab === 'settings' && 'Configurações'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Estatísticas por Plataforma</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(stats?.platforms || {}).map(([platform, data]) => (
                  <div key={platform} className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-2xl">{getPlatformIcon(platform)}</span>
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </h4>
                      <button
                        onClick={() => handleSyncPlatform(platform)}
                        disabled={syncing}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium disabled:opacity-50"
                      >
                        {syncing ? 'Sincronizando...' : 'Sincronizar'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Encontrado</p>
                        <p className="text-2xl font-bold text-gray-900">{data.total_coupons_found}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Criados</p>
                        <p className="text-2xl font-bold text-green-600">{data.total_coupons_created}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Sincronizações</p>
                        <p className="text-2xl font-bold text-blue-600">{data.total_syncs}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Taxa de Sucesso</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {data.total_syncs > 0
                            ? Math.round((data.successful / data.total_syncs) * 100)
                            : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Coupons Tab */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Cupons Pendentes de Aprovação
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Avalie e aprove ou rejeite cupons capturados automaticamente
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSyncPlatform('gatry')}
                    disabled={syncing}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw size={16} className={`mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Capturar do Gatry
                  </Button>
                  <Button
                    onClick={() => loadPendingCoupons(1)}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Atualizar
                  </Button>
                </div>
              </div>

              {selectedCoupons.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedCoupons.length} cupom(ns) selecionado(s)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleApproveBatch}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 size={16} className="mr-2" />
                      Aprovar Selecionados
                    </Button>
                    <Button
                      onClick={handleRejectBatch}
                      size="sm"
                      variant="destructive"
                    >
                      <XCircle size={16} className="mr-2" />
                      Rejeitar Selecionados
                    </Button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <button onClick={toggleSelectAll} className="text-gray-600 hover:text-gray-900">
                          {selectedCoupons.length === pendingCoupons.length && pendingCoupons.length > 0 ? (
                            <CheckSquare size={18} />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fonte</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plataforma</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desconto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Validade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingCoupons.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                          Nenhum cupom pendente encontrado
                        </td>
                      </tr>
                    ) : (
                      pendingCoupons.map((coupon) => (
                        <tr key={coupon.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleSelectCoupon(coupon.id)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              {selectedCoupons.includes(coupon.id) ? (
                                <CheckSquare size={18} className="text-blue-600" />
                              ) : (
                                <Square size={18} />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              {coupon.capture_source || 'N/A'}
                            </span>
                            {coupon.source_url && (
                              <a
                                href={coupon.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-blue-600 hover:underline mt-1"
                              >
                                Ver origem
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-2xl">{getPlatformIcon(coupon.platform)}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm font-bold">{coupon.code}</td>
                          <td className="px-4 py-3">
                            {coupon.discount_type === 'percentage'
                              ? `${coupon.discount_value}%`
                              : `R$ ${coupon.discount_value}`}
                            {coupon.min_purchase > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Compra mín: R$ {coupon.min_purchase}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="max-w-xs">
                              <p className="font-medium text-sm">{coupon.title || 'Sem título'}</p>
                              {coupon.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{coupon.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {new Date(coupon.valid_until).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveCoupon(coupon.id)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium"
                                title="Aprovar"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Motivo da rejeição (opcional):');
                                  if (reason !== null) {
                                    handleRejectCoupon(coupon.id, reason);
                                  }
                                }}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
                                title="Rejeitar"
                              >
                                <XCircle size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={pendingPagination.page}
                totalPages={pendingPagination.totalPages}
                onPageChange={(p) => loadPendingCoupons(p)}
              />
            </div>
          )}

          {/* Coupons Tab */}
          {activeTab === 'coupons' && (
            <div className="space-y-4">
              {/* Header com ações */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Cupons Capturados ({couponsPagination.total})
                </h3>
                <div className="flex gap-2">
                  <Button
                    onClick={() => loadCoupons(1)}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Atualizar
                  </Button>
                  <Button
                    onClick={() => handleExport('csv')}
                    variant="outline"
                    size="sm"
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <FileDown size={16} className="mr-2" />
                    )}
                    Exportar CSV
                  </Button>
                  <Button
                    onClick={() => handleExport('json')}
                    variant="outline"
                    size="sm"
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <FileDown size={16} className="mr-2" />
                    )}
                    Exportar JSON
                  </Button>
                </div>
              </div>

              {/* Busca e Filtros */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      placeholder="Buscar por código, descrição ou título..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={() => setShowFilters(!showFilters)}
                    variant="outline"
                  >
                    <Filter size={16} className="mr-2" />
                    Filtros
                  </Button>
                  {Object.values(filters).some(v => v !== '') && (
                    <Button
                      onClick={clearFilters}
                      variant="outline"
                    >
                      Limpar
                    </Button>
                  )}
                </div>

                {/* Painel de Filtros */}
                {showFilters && (
                  <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plataforma</label>
                      <select
                        value={filters.platform}
                        onChange={(e) => handleFilterChange('platform', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Todas</option>
                        <option value="mercadolivre">Mercado Livre</option>
                        <option value="shopee">Shopee</option>
                        <option value="amazon">Amazon</option>
                        <option value="aliexpress">AliExpress</option>
                        <option value="gatry">Gatry</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={filters.verification_status}
                        onChange={(e) => handleFilterChange('verification_status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Todos</option>
                        <option value="active">Ativo</option>
                        <option value="pending">Pendente</option>
                        <option value="expired">Expirado</option>
                        <option value="invalid">Inválido</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Desconto</label>
                      <select
                        value={filters.discount_type}
                        onChange={(e) => handleFilterChange('discount_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Todos</option>
                        <option value="percentage">Percentual</option>
                        <option value="fixed">Fixo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Aplicabilidade</label>
                      <select
                        value={filters.is_general}
                        onChange={(e) => handleFilterChange('is_general', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Todas</option>
                        <option value="true">Todos os Produtos</option>
                        <option value="false">Produtos Selecionados</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Ações em lote */}
                {selectedCoupons.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedCoupons.length} cupom(ns) selecionado(s)
                    </span>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleBatchAction('activate')}
                        size="sm"
                        variant="outline"
                      >
                        <CheckCircle2 size={16} className="mr-2" />
                        Ativar
                      </Button>
                      <Button
                        onClick={() => handleBatchAction('expire')}
                        size="sm"
                        variant="outline"
                      >
                        <XCircle size={16} className="mr-2" />
                        Expirar
                      </Button>
                      <Button
                        onClick={() => handleBatchAction('delete')}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Deletar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabela */}
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <button onClick={toggleSelectAll} className="text-gray-600 hover:text-gray-900">
                          {selectedCoupons.length === coupons.length && coupons.length > 0 ? (
                            <CheckSquare size={18} />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plataforma</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desconto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aplicabilidade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Validade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {coupons.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                          Nenhum cupom encontrado
                        </td>
                      </tr>
                    ) : (
                      coupons.map((coupon) => (
                        <tr key={coupon.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleSelectCoupon(coupon.id)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              {selectedCoupons.includes(coupon.id) ? (
                                <CheckSquare size={18} className="text-blue-600" />
                              ) : (
                                <Square size={18} />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-2xl">{getPlatformIcon(coupon.platform)}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">{coupon.code}</td>
                          <td className="px-4 py-3">
                            {coupon.discount_type === 'percentage'
                              ? `${coupon.discount_value}%`
                              : `R$ ${coupon.discount_value}`}
                            {coupon.min_purchase > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Compra mín: R$ {coupon.min_purchase}
                              </div>
                            )}
                            {coupon.max_discount_value > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Limite: R$ {coupon.max_discount_value}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              coupon.is_general 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {coupon.is_general ? 'Todos os Produtos' : 'Produtos Selecionados'}
                            </span>
                            {!coupon.is_general && coupon.applicable_products && coupon.applicable_products.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {coupon.applicable_products.length} produto(s)
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {new Date(coupon.valid_until).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVerificationStatusColor(coupon.verification_status)}`}>
                              {coupon.verification_status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleVerifyCoupon(coupon.id)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                title="Verificar"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleExpireCoupon(coupon.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                title="Expirar"
                              >
                                <XCircle size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={couponsPagination.page}
                totalPages={couponsPagination.totalPages}
                onPageChange={(p) => loadCoupons(p)}
              />
            </div>
          )}

          {/* Shopee Tab */}
          {activeTab === 'shopee' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">🛍️ Funcionalidades Avançadas Shopee</h3>
                <p className="text-gray-600">Use a API completa da Shopee para capturar cupons e analisar produtos</p>
              </div>

              {/* Buscar Categorias */}
              <div className="border rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">📂 Categorias Disponíveis</h4>
                <Button
                  onClick={async () => {
                    try {
                      setShopeeLoading(true);
                      const response = await api.get('/coupon-capture/shopee/categories');
                      setShopeeCategories(response.data.data || []);
                      alert(`✅ ${response.data.data?.length || 0} categorias encontradas!`);
                    } catch (error) {
                      console.error('Erro ao buscar categorias:', error);
                      alert('Erro ao buscar categorias');
                    } finally {
                      setShopeeLoading(false);
                    }
                  }}
                  disabled={shopeeLoading}
                  className="mb-3"
                >
                  {shopeeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Buscar Categorias
                </Button>
                {shopeeCategories.length > 0 && (
                  <div className="mt-3 max-h-60 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {shopeeCategories.slice(0, 20).map((cat, idx) => (
                        <button
                          key={idx}
                          onClick={async () => {
                            try {
                              setShopeeLoading(true);
                              const response = await api.post(`/coupon-capture/shopee/category/${cat.category_id || cat.id}`);
                              setShopeeResults(response.data.data);
                              alert(`✅ ${response.data.data.found || 0} cupons encontrados na categoria!`);
                            } catch (error) {
                              console.error('Erro ao buscar cupons:', error);
                              alert('Erro ao buscar cupons da categoria');
                            } finally {
                              setShopeeLoading(false);
                            }
                          }}
                          className="p-2 text-sm border rounded hover:bg-gray-50 text-left"
                        >
                          {cat.category_name || cat.name || `Categoria ${cat.category_id || cat.id}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Buscar por Palavra-chave */}
              <div className="border rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">🔍 Buscar Cupons por Palavra-chave</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shopeeKeyword}
                    onChange={(e) => setShopeeKeyword(e.target.value)}
                    placeholder="Ex: notebook, fone bluetooth, smartwatch..."
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                  <Button
                    onClick={async () => {
                      if (!shopeeKeyword.trim()) {
                        alert('Digite uma palavra-chave');
                        return;
                      }
                      try {
                        setShopeeLoading(true);
                        const response = await api.post('/coupon-capture/shopee/keyword', { keyword: shopeeKeyword });
                        setShopeeResults(response.data.data);
                        alert(`✅ ${response.data.data.found || 0} cupons encontrados!`);
                      } catch (error) {
                        console.error('Erro ao buscar cupons:', error);
                        alert('Erro ao buscar cupons');
                      } finally {
                        setShopeeLoading(false);
                      }
                    }}
                    disabled={shopeeLoading || !shopeeKeyword.trim()}
                  >
                    {shopeeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Buscar
                  </Button>
                </div>
              </div>

              {/* Verificar Cupom */}
              <div className="border rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">✅ Verificar Cupom</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="verify-code"
                    placeholder="Digite o código do cupom..."
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                  <Button
                    onClick={async () => {
                      const code = document.getElementById('verify-code').value;
                      if (!code.trim()) {
                        alert('Digite um código de cupom');
                        return;
                      }
                      try {
                        setShopeeLoading(true);
                        const response = await api.post('/coupon-capture/shopee/verify', { code });
                        alert(`Cupom: ${response.data.data.valid ? '✅ Válido' : '❌ Inválido'}\n${response.data.data.message}`);
                      } catch (error) {
                        console.error('Erro ao verificar cupom:', error);
                        alert('Erro ao verificar cupom');
                      } finally {
                        setShopeeLoading(false);
                      }
                    }}
                    disabled={shopeeLoading}
                  >
                    {shopeeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Verificar
                  </Button>
                </div>
              </div>

              {/* Análise com IA */}
              <div className="border rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Análise com IA
                </h4>
                <div className="space-y-3">
                  <Button
                    onClick={async () => {
                      const code = prompt('Digite o código do cupom para análise:');
                      if (!code) return;
                      try {
                        setShopeeLoading(true);
                        const response = await api.post('/coupon-capture/shopee/analyze-coupon', {
                          coupon: { code, title: 'Cupom Shopee', discount_value: 10, discount_type: 'percentage' }
                        });
                        setShopeeAnalysis(response.data.data);
                        alert('✅ Análise concluída! Veja os resultados abaixo.');
                      } catch (error) {
                        console.error('Erro ao analisar cupom:', error);
                        alert('Erro ao analisar cupom');
                      } finally {
                        setShopeeLoading(false);
                      }
                    }}
                    disabled={shopeeLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {shopeeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Analisar Cupom com IA
                  </Button>
                  
                  {shopeeResults && shopeeResults.coupons && shopeeResults.coupons.length > 0 && (
                    <>
                      <Button
                        onClick={async () => {
                          try {
                            setShopeeLoading(true);
                            const response = await api.post('/coupon-capture/ai/batch-analyze', {
                              coupons: shopeeResults.coupons.slice(0, 20),
                              options: { platform: 'shopee' }
                            });
                            const updatedCoupons = shopeeResults.coupons.map((coupon, idx) => ({
                              ...coupon,
                              analysis: response.data.data[idx]?.analysis || null
                            }));
                            setShopeeResults({ ...shopeeResults, coupons: updatedCoupons });
                            alert(`✅ ${response.data.data.length} cupons analisados!`);
                          } catch (error) {
                            console.error('Erro ao analisar em lote:', error);
                            alert('Erro ao analisar cupons');
                          } finally {
                            setShopeeLoading(false);
                          }
                        }}
                        disabled={shopeeLoading}
                        variant="outline"
                        className="w-full"
                      >
                        {shopeeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
                        Analisar Todos os Cupons em Lote
                      </Button>

                      <Button
                        onClick={async () => {
                          if (!confirm(`Melhorar ${shopeeResults.coupons.length} cupons com IA? Isso otimizará títulos e descrições.`)) {
                            return;
                          }
                          try {
                            setShopeeLoading(true);
                            const response = await api.post('/coupon-capture/ai/enhance-coupons', {
                              coupons: shopeeResults.coupons.slice(0, 20)
                            });
                            setShopeeResults({ ...shopeeResults, coupons: response.data.data });
                            alert(`✅ ${response.data.data.length} cupons melhorados!`);
                          } catch (error) {
                            console.error('Erro ao melhorar cupons:', error);
                            alert('Erro ao melhorar cupons');
                          } finally {
                            setShopeeLoading(false);
                          }
                        }}
                        disabled={shopeeLoading}
                        variant="outline"
                        className="w-full"
                      >
                        {shopeeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Melhorar Cupons com IA
                      </Button>

                      <Button
                        onClick={async () => {
                          try {
                            setShopeeLoading(true);
                            const response = await api.post('/coupon-capture/ai/generate-report', {
                              coupons: shopeeResults.coupons
                            });
                            const report = response.data.data;
                            alert(`📊 Relatório Gerado!\n\nTotal: ${report.total}\nAnalisados: ${report.analyzed}\nErros: ${report.errors}\n\nAlta Qualidade: ${report.stats.high_quality}\nMédia Qualidade: ${report.stats.medium_quality}\nBaixa Qualidade: ${report.stats.low_quality}\n\nRecomendados: ${report.stats.should_promote}\nNão Recomendados: ${report.stats.should_not_promote}`);
                          } catch (error) {
                            console.error('Erro ao gerar relatório:', error);
                            alert('Erro ao gerar relatório');
                          } finally {
                            setShopeeLoading(false);
                          }
                        }}
                        disabled={shopeeLoading}
                        variant="outline"
                        className="w-full"
                      >
                        {shopeeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
                        Gerar Relatório de Análise
                      </Button>
                    </>
                  )}
                </div>
                {shopeeAnalysis && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <h5 className="font-semibold mb-2">Resultado da Análise:</h5>
                    <div className="text-sm space-y-1">
                      <p>Qualidade: {(shopeeAnalysis.quality_score * 100).toFixed(0)}%</p>
                      <p>Relevância: {(shopeeAnalysis.relevance_score * 100).toFixed(0)}%</p>
                      <p>Valor: {(shopeeAnalysis.value_score * 100).toFixed(0)}%</p>
                      <p>Promover: {shopeeAnalysis.should_promote ? '✅ Sim' : '❌ Não'}</p>
                      {shopeeAnalysis.suggested_title && <p>Título sugerido: {shopeeAnalysis.suggested_title}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Resultados */}
              {shopeeResults && shopeeResults.coupons && shopeeResults.coupons.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-3">
                    📦 Resultados ({shopeeResults.found || 0} cupons encontrados)
                  </h4>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {shopeeResults.coupons.slice(0, 10).map((coupon, idx) => (
                      <div key={idx} className={`p-3 border rounded ${coupon.analysis?.should_promote ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">{coupon.title || coupon.code}</p>
                            <p className="text-sm text-gray-600">Código: <code className="bg-gray-200 px-1 rounded">{coupon.code}</code></p>
                            <p className="text-sm text-green-600 font-semibold">
                              Desconto: {coupon.discount_value}{coupon.discount_type === 'percentage' ? '%' : ' R$'}
                            </p>
                            {coupon.min_purchase && (
                              <p className="text-xs text-gray-500">Compra mínima: R$ {coupon.min_purchase}</p>
                            )}
                            {coupon.analysis && (
                              <div className="mt-2 text-xs space-y-1 p-2 bg-white rounded border">
                                <div className="flex gap-4">
                                  <span className="text-blue-600">
                                    Qualidade: {(coupon.analysis.quality_score * 100).toFixed(0)}%
                                  </span>
                                  <span className="text-purple-600">
                                    Relevância: {(coupon.analysis.relevance_score * 100).toFixed(0)}%
                                  </span>
                                  <span className="text-orange-600">
                                    Valor: {(coupon.analysis.value_score * 100).toFixed(0)}%
                                  </span>
                                </div>
                                {coupon.analysis.should_promote ? (
                                  <p className="text-green-600 font-semibold">✅ Recomendado para promoção</p>
                                ) : (
                                  <p className="text-red-600">❌ Não recomendado</p>
                                )}
                                {coupon.analysis.suggested_title && (
                                  <p className="text-gray-600 italic">💡 Título sugerido: {coupon.analysis.suggested_title}</p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                try {
                                  setShopeeLoading(true);
                                  const response = await api.post('/coupon-capture/shopee/analyze-coupon', { coupon });
                                  const updatedCoupons = shopeeResults.coupons.map(c => 
                                    c.code === coupon.code ? { ...c, analysis: response.data.data } : c
                                  );
                                  setShopeeResults({ ...shopeeResults, coupons: updatedCoupons });
                                  alert(`Análise: ${response.data.data.should_promote ? '✅ Promover' : '❌ Não promover'}\nConfiança: ${(response.data.data.confidence * 100).toFixed(0)}%`);
                                } catch (error) {
                                  console.error('Erro:', error);
                                  alert('Erro ao analisar cupom');
                                } finally {
                                  setShopeeLoading(false);
                                }
                              }}
                              disabled={shopeeLoading}
                              variant="outline"
                              title="Analisar com IA"
                            >
                              <Brain className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Logs de Sincronização</h3>

              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getPlatformIcon(log.platform)}</span>
                        <div>
                          <p className="font-bold text-gray-900">{log.platform}</p>
                          <p className="text-sm text-gray-600">{log.sync_type}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <p className="text-gray-600">Encontrados</p>
                        <p className="font-bold">{log.coupons_found}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Criados</p>
                        <p className="font-bold text-green-600">{log.coupons_created}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Erros</p>
                        <p className="font-bold text-red-600">{log.errors}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Duração</p>
                        <p className="font-bold">{(log.duration_ms / 1000).toFixed(2)}s</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>

              <Pagination
                currentPage={logsPagination.page}
                totalPages={logsPagination.totalPages}
                onPageChange={(p) => loadLogs(p)}
              />
            </div>
          )}

          {/* Shopee Tab */}
          {activeTab === 'shopee' && (
            <div className="space-y-6 p-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">🛍️ Funcionalidades Avançadas Shopee</h3>
                <p className="text-gray-600">Use a API completa da Shopee para capturar cupons e analisar produtos</p>
              </div>

              {/* Buscar Categorias */}
              <div className="border rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">📂 Categorias Disponíveis</h4>
                <Button
                  onClick={async () => {
                    try {
                      setShopeeLoading(true);
                      const response = await api.get('/coupon-capture/shopee/categories');
                      setShopeeCategories(response.data.data || []);
                      alert(`✅ ${response.data.data?.length || 0} categorias encontradas!`);
                    } catch (error) {
                      console.error('Erro ao buscar categorias:', error);
                      alert('Erro ao buscar categorias');
                    } finally {
                      setShopeeLoading(false);
                    }
                  }}
                  disabled={shopeeLoading}
                  className="mb-3"
                >
                  {shopeeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Buscar Categorias
                </Button>
                {shopeeCategories.length > 0 && (
                  <div className="mt-3 max-h-60 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {shopeeCategories.slice(0, 20).map((cat, idx) => (
                        <button
                          key={idx}
                          onClick={async () => {
                            try {
                              setShopeeLoading(true);
                              const response = await api.post(`/coupon-capture/shopee/category/${cat.category_id || cat.id}`);
                              setShopeeResults(response.data.data);
                              alert(`✅ ${response.data.data.found || 0} cupons encontrados na categoria!`);
                            } catch (error) {
                              console.error('Erro ao buscar cupons:', error);
                              alert('Erro ao buscar cupons da categoria');
                            } finally {
                              setShopeeLoading(false);
                            }
                          }}
                          className="p-2 text-sm border rounded hover:bg-gray-50 text-left"
                        >
                          {cat.category_name || cat.name || `Categoria ${cat.category_id || cat.id}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Buscar por Palavra-chave */}
              <div className="border rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">🔍 Buscar Cupons por Palavra-chave</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shopeeKeyword}
                    onChange={(e) => setShopeeKeyword(e.target.value)}
                    placeholder="Ex: notebook, fone bluetooth, smartwatch..."
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                  <Button
                    onClick={async () => {
                      if (!shopeeKeyword.trim()) {
                        alert('Digite uma palavra-chave');
                        return;
                      }
                      try {
                        setShopeeLoading(true);
                        const response = await api.post('/coupon-capture/shopee/keyword', { keyword: shopeeKeyword });
                        setShopeeResults(response.data.data);
                        alert(`✅ ${response.data.data.found || 0} cupons encontrados!`);
                      } catch (error) {
                        console.error('Erro ao buscar cupons:', error);
                        alert('Erro ao buscar cupons');
                      } finally {
                        setShopeeLoading(false);
                      }
                    }}
                    disabled={shopeeLoading || !shopeeKeyword.trim()}
                  >
                    {shopeeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Buscar
                  </Button>
                </div>
              </div>

              {/* Verificar Cupom */}
              <div className="border rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">✅ Verificar Cupom</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="verify-code"
                    placeholder="Digite o código do cupom..."
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                  <Button
                    onClick={async () => {
                      const code = document.getElementById('verify-code').value;
                      if (!code.trim()) {
                        alert('Digite um código de cupom');
                        return;
                      }
                      try {
                        setShopeeLoading(true);
                        const response = await api.post('/coupon-capture/shopee/verify', { code });
                        alert(`Cupom: ${response.data.data.valid ? '✅ Válido' : '❌ Inválido'}\n${response.data.data.message}`);
                      } catch (error) {
                        console.error('Erro ao verificar cupom:', error);
                        alert('Erro ao verificar cupom');
                      } finally {
                        setShopeeLoading(false);
                      }
                    }}
                    disabled={shopeeLoading}
                  >
                    {shopeeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Verificar
                  </Button>
                </div>
              </div>

              {/* Análise com IA */}
              <div className="border rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Análise com IA
                </h4>
                <div className="space-y-3">
                  <Button
                    onClick={async () => {
                      const code = prompt('Digite o código do cupom para análise:');
                      if (!code) return;
                      try {
                        setShopeeLoading(true);
                        const response = await api.post('/coupon-capture/shopee/analyze-coupon', {
                          coupon: { code, title: 'Cupom Shopee', discount_value: 10, discount_type: 'percentage' }
                        });
                        setShopeeAnalysis(response.data.data);
                        alert('✅ Análise concluída! Veja os resultados abaixo.');
                      } catch (error) {
                        console.error('Erro ao analisar cupom:', error);
                        alert('Erro ao analisar cupom');
                      } finally {
                        setShopeeLoading(false);
                      }
                    }}
                    disabled={shopeeLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {shopeeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Analisar Cupom com IA
                  </Button>
                </div>
                {shopeeAnalysis && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <h5 className="font-semibold mb-2">Resultado da Análise:</h5>
                    <div className="text-sm space-y-1">
                      <p>Qualidade: {(shopeeAnalysis.quality_score * 100).toFixed(0)}%</p>
                      <p>Relevância: {(shopeeAnalysis.relevance_score * 100).toFixed(0)}%</p>
                      <p>Valor: {(shopeeAnalysis.value_score * 100).toFixed(0)}%</p>
                      <p>Promover: {shopeeAnalysis.should_promote ? '✅ Sim' : '❌ Não'}</p>
                      {shopeeAnalysis.suggested_title && <p>Título sugerido: {shopeeAnalysis.suggested_title}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Resultados */}
              {shopeeResults && shopeeResults.coupons && shopeeResults.coupons.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-3">
                    📦 Resultados ({shopeeResults.found || 0} cupons encontrados)
                  </h4>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {shopeeResults.coupons.slice(0, 10).map((coupon, idx) => (
                      <div key={idx} className="p-3 border rounded bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">{coupon.title || coupon.code}</p>
                            <p className="text-sm text-gray-600">Código: {coupon.code}</p>
                            <p className="text-sm text-green-600">
                              Desconto: {coupon.discount_value}{coupon.discount_type === 'percentage' ? '%' : ' R$'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                setShopeeLoading(true);
                                const response = await api.post('/coupon-capture/shopee/analyze-coupon', { coupon });
                                alert(`Análise: ${response.data.data.should_promote ? '✅ Promover' : '❌ Não promover'}\nConfiança: ${(response.data.data.confidence * 100).toFixed(0)}%`);
                              } catch (error) {
                                console.error('Erro:', error);
                              } finally {
                                setShopeeLoading(false);
                              }
                            }}
                            disabled={shopeeLoading}
                            variant="outline"
                          >
                            <Brain className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && settings && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Configurações do Módulo</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intervalo de Captura (minutos)
                  </label>
                  <input
                    type="number"
                    value={settings.capture_interval_minutes}
                    onChange={(e) => handleUpdateSettings({ capture_interval_minutes: parseInt(e.target.value) })}
                    className="px-4 py-2 border border-gray-300 rounded-lg w-32"
                    min="1"
                    max="1440"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Intervalo entre capturas automáticas (1-1440 minutos)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Shopee */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 mb-3">🛍️ Shopee</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.shopee_enabled}
                          onChange={(e) => handleUpdateSettings({ shopee_enabled: e.target.checked })}
                          className="mr-2"
                        />
                        Ativar captura Shopee
                      </label>
                      <p className="text-xs text-gray-600">
                        Configure Partner ID e Partner Key em Configurações → Shopee
                      </p>
                    </div>
                  </div>

                  {/* Mercado Livre */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 mb-3">🛒 Mercado Livre</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.meli_enabled}
                          onChange={(e) => handleUpdateSettings({ meli_enabled: e.target.checked })}
                          className="mr-2"
                        />
                        Ativar captura Mercado Livre
                      </label>
                    </div>
                  </div>

                  {/* Amazon */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 mb-3">📦 Amazon</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.amazon_enabled}
                          onChange={(e) => handleUpdateSettings({ amazon_enabled: e.target.checked })}
                          className="mr-2"
                        />
                        Ativar captura Amazon
                      </label>
                    </div>
                  </div>

                  {/* AliExpress */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 mb-3">🌐 AliExpress</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.aliexpress_enabled}
                          onChange={(e) => handleUpdateSettings({ aliexpress_enabled: e.target.checked })}
                          className="mr-2"
                        />
                        Ativar captura AliExpress
                      </label>
                    </div>
                  </div>

                  {/* Gatry */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 mb-3">🎟️ Gatry</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.gatry_enabled || false}
                          onChange={(e) => handleUpdateSettings({ gatry_enabled: e.target.checked })}
                          className="mr-2"
                        />
                        Ativar captura Gatry
                      </label>
                      <p className="text-xs text-gray-600 mt-2">
                        Captura cupons do site gatry.com/cupons via web scraping
                      </p>
                    </div>
                  </div>
                </div>

                {/* Configurações de IA */}
                <div className="border-t pt-4">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Inteligência Artificial
                  </h4>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.use_ai_filtering || false}
                        onChange={(e) => handleUpdateSettings({ use_ai_filtering: e.target.checked })}
                        className="mr-2"
                      />
                      Usar IA para filtrar cupons automaticamente
                    </label>
                    <p className="text-xs text-gray-600 ml-6">
                      A IA analisará qualidade, relevância e valor antes de salvar cupons
                    </p>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.use_ai_optimization || false}
                        onChange={(e) => handleUpdateSettings({ use_ai_optimization: e.target.checked })}
                        className="mr-2"
                      />
                      Usar IA para otimizar descrições de cupons
                    </label>
                    <p className="text-xs text-gray-600 ml-6">
                      A IA gerará descrições otimizadas para melhor conversão
                    </p>

                    {settings.use_ai_filtering && (
                      <div className="ml-6 space-y-2 p-3 bg-gray-50 rounded">
                        <div>
                          <label className="text-sm font-medium">Score Mínimo de Qualidade (0.0-1.0)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={settings.ai_min_quality_score || 0.6}
                            onChange={(e) => handleUpdateSettings({ ai_min_quality_score: parseFloat(e.target.value) || 0.6 })}
                            className="w-full px-2 py-1 border rounded mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Score Mínimo de Relevância (0.0-1.0)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={settings.ai_min_relevance_score || 0.5}
                            onChange={(e) => handleUpdateSettings({ ai_min_relevance_score: parseFloat(e.target.value) || 0.5 })}
                            className="w-full px-2 py-1 border rounded mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Score Mínimo de Preço (0.0-1.0)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={settings.ai_min_price_score || 0.5}
                            onChange={(e) => handleUpdateSettings({ ai_min_price_score: parseFloat(e.target.value) || 0.5 })}
                            className="w-full px-2 py-1 border rounded mt-1"
                          />
                        </div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.ai_require_good_deal || false}
                            onChange={(e) => handleUpdateSettings({ ai_require_good_deal: e.target.checked })}
                            className="mr-2"
                          />
                          Requerer que seja uma boa oportunidade
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-bold text-gray-900 mb-3">📢 Notificações</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notify_bots_on_new_coupon}
                        onChange={(e) => handleUpdateSettings({ notify_bots_on_new_coupon: e.target.checked })}
                        className="mr-2"
                      />
                      Notificar bots quando novo cupom for capturado
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notify_bots_on_expiration}
                        onChange={(e) => handleUpdateSettings({ notify_bots_on_expiration: e.target.checked })}
                        className="mr-2"
                      />
                      Notificar bots quando cupom expirar
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
