import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash2, Search, Copy, Calendar, Brain, Send, XCircle, CheckCircle, Filter, Download, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { format } from 'date-fns';
import { Pagination } from '../components/ui/Pagination';

export default function Coupons() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' ou 'pending'
  const [coupons, setCoupons] = useState([]);
  const [pendingCoupons, setPendingCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [approvalCoupon, setApprovalCoupon] = useState(null); // Cupom para modal de aprovação
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0
  });
  const [pendingPagination, setPendingPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    platform: '',
    is_active: '',
    verification_status: '',
    discount_type: ''
  });

  const [formData, setFormData] = useState({
    code: '',
    platform: 'general',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    min_purchase: '',
    max_discount_value: '',
    is_general: null, // null = não especificado, true = todos produtos, false = produtos selecionados
    applicable_products: [],
    max_uses: '',
    current_uses: 0,
    valid_from: '',
    valid_until: '',
    is_exclusive: false
  });

  const [errors, setErrors] = useState({});
  const [isLoadingCoupon, setIsLoadingCoupon] = useState(false);
  const [codeSearchTimeout, setCodeSearchTimeout] = useState(null);
  const [templateMode, setTemplateMode] = useState('custom');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'all') {
        fetchCoupons(1);
      } else {
        fetchPendingCoupons(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, activeTab, filters]);

  useEffect(() => {
    if (activeTab === 'all') {
      fetchCoupons(1);
    } else {
      fetchPendingCoupons(1);
    }
  }, [activeTab]);

  useEffect(() => {
    loadTemplateMode();
  }, []);

  const loadTemplateMode = async () => {
    try {
      const response = await api.get('/settings');
      const settings = response.data.data;
      setTemplateMode(settings.template_mode_coupon || 'custom');
    } catch (error) {
      console.error('Erro ao carregar modo de template:', error);
    }
  };

  const getTemplateModeInfo = () => {
    const modeNames = {
      'default': { label: 'Padrão', icon: '📋', color: 'bg-gray-100 text-gray-800' },
      'custom': { label: 'Customizado', icon: '✏️', color: 'bg-blue-100 text-blue-800' },
      'ai_advanced': { label: 'IA ADVANCED', icon: '🤖', color: 'bg-purple-100 text-purple-800' }
    };
    return modeNames[templateMode] || modeNames['custom'];
  };

  // Função para buscar cupom por código e auto-preencher
  const handleCodeChange = (code) => {
    const upperCode = code.toUpperCase().trim();
    setFormData({ ...formData, code: upperCode });

    // Limpar timeout anterior
    if (codeSearchTimeout) {
      clearTimeout(codeSearchTimeout);
    }

    // Se o código tiver pelo menos 4 caracteres e não estiver editando, buscar após delay
    if (upperCode.length >= 4 && !editingCoupon) {
      const timeout = setTimeout(async () => {
        setIsLoadingCoupon(true);
        let couponFound = false;

        try {
          // Primeiro tentar buscar via API da plataforma selecionada
          const platform = formData.platform;

          if (platform && platform !== 'general' && ['mercadolivre', 'shopee', 'amazon', 'aliexpress', 'kabum', 'magazineluiza', 'terabyteshop'].includes(platform)) {
            try {
              const apiResponse = await api.get(`/coupons/code/${encodeURIComponent(upperCode)}?platform=${platform}`, {
                validateStatus: (status) => status === 200 || status === 404 // Não lançar erro para 404
              });

              if (apiResponse.status === 200 && apiResponse.data.success && apiResponse.data.data) {
                const coupon = apiResponse.data.data;
                couponFound = true;

                // Preencher formulário com os dados do cupom encontrado
                setFormData({
                  code: coupon.code || upperCode,
                  platform: coupon.platform || platform || 'general',
                  description: coupon.description || coupon.title || '',
                  discount_type: coupon.discount_type || 'percentage',
                  discount_value: coupon.discount_value || '',
                  min_purchase: coupon.min_purchase || '',
                  max_discount_value: coupon.max_discount_value || '',
                  is_general: coupon.is_general !== undefined && coupon.is_general !== null ? coupon.is_general : null,
                  applicable_products: coupon.applicable_products || [],
                  max_uses: coupon.max_uses || '',
                  current_uses: coupon.current_uses || 0,
                  valid_from: coupon.valid_from ? format(new Date(coupon.valid_from), 'yyyy-MM-dd') : '',
                  valid_until: coupon.valid_until ? format(new Date(coupon.valid_until), 'yyyy-MM-dd') : '',
                  is_exclusive: coupon.is_exclusive || false
                });
              }
            } catch (apiError) {
              // validateStatus já previne erro para 404, mas se ainda houver erro, ignorar silenciosamente
              // Não fazer nada - cupom não encontrado é esperado
            }
          }

          // Se não encontrou via API, buscar no banco local
          if (!couponFound) {
            try {
              const localResponse = await api.get(`/coupons/code/${encodeURIComponent(upperCode)}`, {
                validateStatus: (status) => status === 200 || status === 404 // Não lançar erro para 404
              });

              if (localResponse.status === 200 && localResponse.data.success && localResponse.data.data) {
                const coupon = localResponse.data.data;
                couponFound = true;

                // Preencher formulário com os dados do cupom encontrado
                setFormData({
                  code: coupon.code || upperCode,
                  platform: coupon.platform || formData.platform || 'general',
                  description: coupon.description || coupon.title || '',
                  discount_type: coupon.discount_type || 'percentage',
                  discount_value: coupon.discount_value || '',
                  min_purchase: coupon.min_purchase || '',
                  max_discount_value: coupon.max_discount_value || '',
                  is_general: coupon.is_general !== undefined && coupon.is_general !== null ? coupon.is_general : null,
                  applicable_products: coupon.applicable_products || [],
                  max_uses: coupon.max_uses || '',
                  current_uses: coupon.current_uses || 0,
                  valid_from: coupon.valid_from ? format(new Date(coupon.valid_from), 'yyyy-MM-dd') : '',
                  valid_until: coupon.valid_until ? format(new Date(coupon.valid_until), 'yyyy-MM-dd') : '',
                  is_exclusive: coupon.is_exclusive || false
                });
              }
            } catch (localError) {
              // validateStatus já previne erro para 404, mas se ainda houver erro, ignorar silenciosamente
              // Não fazer nada - cupom não encontrado é esperado
            }
          }
        } catch (error) {
          // validateStatus já previne erro para 404
          // Se ainda houver erro, ignorar silenciosamente
        } finally {
          setIsLoadingCoupon(false);
        }
      }, 800); // Delay de 800ms após parar de digitar

      setCodeSearchTimeout(timeout);
    } else {
      setIsLoadingCoupon(false);
    }
  };

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (codeSearchTimeout) {
        clearTimeout(codeSearchTimeout);
      }
    };
  }, [codeSearchTimeout]);

  const fetchPendingCoupons = async (page = 1) => {
    try {
      setLoading(true);
      setSelectedIds([]);
      // Limpar filtros vazios antes de enviar
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      );

      const params = {
        page,
        limit: 20,
        ...(searchTerm && { search: searchTerm }),
        ...cleanFilters
      };

      const response = await api.get('/coupons/pending', { params });
      const data = response.data.data;

      console.log('📋 Resposta de cupons pendentes:', data);

      if (Array.isArray(data)) {
        setPendingCoupons(data);
        setPendingPagination(prev => ({ ...prev, page, total: data.length }));
      } else if (data && data.coupons) {
        setPendingCoupons(data.coupons || []);
        setPendingPagination(prev => ({
          ...prev,
          page,
          totalPages: data.totalPages || 1,
          total: data.total || 0
        }));
      } else {
        // Se a estrutura for diferente, tentar extrair os cupons
        console.warn('⚠️ Estrutura de dados inesperada:', data);
        setPendingCoupons([]);
        setPendingPagination(prev => ({ ...prev, page, totalPages: 1, total: 0 }));
      }
    } catch (error) {
      console.error('❌ Erro ao carregar cupons pendentes:', error);
      console.error('   Detalhes:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupons = async (page = 1) => {
    try {
      setLoading(true);
      setSelectedIds([]); // Clear selection when changing view/page

      // Limpar filtros vazios antes de enviar
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      );

      const params = {
        page,
        limit: 20,
        ...(searchTerm && { search: searchTerm }),
        ...cleanFilters,
        excludePending: true, // Excluir cupons pendentes da lista "Todos os Cupons"
        is_active: true // Apenas cupons ativos
      };

      const response = await api.get('/coupons/admin/all', { params });

      const { coupons, totalPages, total } = response.data.data;
      setCoupons(coupons || []);
      setPagination(prev => ({
        ...prev,
        page,
        totalPages: totalPages || 1,
        total: total || 0
      }));
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente deletar este cupom?')) return;

    try {
      await api.delete(`/coupons/${id}`);
      fetchCoupons(1);
    } catch (error) {
      alert('Erro ao deletar cupom');
    }
  };

  const handleMarkAsOutOfStock = async (coupon) => {
    if (!confirm(`Deseja marcar o cupom ${coupon.code} como esgotado?`)) return;

    try {
      await api.post(`/coupons/${coupon.id}/mark-out-of-stock`);
      fetchCoupons(pagination.page);
      alert('Cupom marcado como esgotado!');
    } catch (error) {
      alert('Erro ao marcar cupom como esgotado');
    }
  };

  const handleMarkAsAvailable = async (coupon) => {
    if (!confirm(`Deseja marcar o cupom ${coupon.code} como disponível novamente?`)) return;

    try {
      await api.post(`/coupons/${coupon.id}/mark-available`);
      fetchCoupons(pagination.page);
      alert('Cupom marcado como disponível!');
    } catch (error) {
      alert('Erro ao marcar cupom como disponível');
    }
  };

  const handleForcePublish = async (coupon) => {
    if (!confirm(`Deseja aprovar e publicar o cupom ${coupon.code}? O cupom será aprovado e enviado aos bots.`)) return;

    // Adicionar à lista de processamento
    setProcessingCoupons(prev => ({
      ...prev,
      publishing: new Set(prev.publishing).add(coupon.id)
    }));

    try {
      // IMPORTANTE: Enviar dados atualizados do cupom no body
      // Extrair apenas os campos relevantes para atualização
      const updateData = {
        code: coupon.code,
        platform: coupon.platform,
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_purchase: coupon.min_purchase,
        max_discount_value: coupon.max_discount_value,
        is_general: coupon.is_general,
        max_uses: coupon.max_uses,
        valid_from: coupon.valid_from,
        valid_until: coupon.valid_until,
        is_exclusive: coupon.is_exclusive
      };

      await api.post(`/coupons/${coupon.id}/force-publish`, updateData);
      if (activeTab === 'all') {
        fetchCoupons(pagination.page);
      } else {
        fetchPendingCoupons(pendingPagination.page);
      }
      alert('Cupom aprovado e publicado com sucesso!');
    } catch (error) {
      console.error('Erro ao publicar cupom:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao publicar cupom';
      alert(`Erro: ${errorMessage}`);
    } finally {
      // Remover da lista de processamento
      setProcessingCoupons(prev => {
        const newSet = new Set(prev.publishing);
        newSet.delete(coupon.id);
        return { ...prev, publishing: newSet };
      });
    }
  };

  const handleApproveCoupon = async (couponId, updates = {}) => {
    // Adicionar à lista de processamento
    setProcessingCoupons(prev => ({
      ...prev,
      approving: new Set(prev.approving).add(couponId)
    }));

    try {
      await api.put(`/coupons/${couponId}/approve`, updates);
      alert('Cupom aprovado com sucesso!');
      if (activeTab === 'pending') {
        fetchPendingCoupons(pendingPagination.page);
      }
      fetchCoupons(pagination.page);
    } catch (error) {
      console.error('Erro ao aprovar cupom:', error);
      alert('Erro ao aprovar cupom');
    } finally {
      // Remover da lista de processamento
      setProcessingCoupons(prev => {
        const newSet = new Set(prev.approving);
        newSet.delete(couponId);
        return { ...prev, approving: newSet };
      });
    }
  };

  const handleRejectCoupon = async (couponId, reason = '') => {
    // Adicionar à lista de processamento
    setProcessingCoupons(prev => ({
      ...prev,
      rejecting: new Set(prev.rejecting).add(couponId)
    }));

    try {
      await api.put(`/coupons/${couponId}/reject`, { reason });
      alert('Cupom rejeitado com sucesso!');
      if (activeTab === 'pending') {
        fetchPendingCoupons(pendingPagination.page);
      }
      fetchCoupons(pagination.page);
    } catch (error) {
      console.error('Erro ao rejeitar cupom:', error);
      alert('Erro ao rejeitar cupom');
    } finally {
      // Remover da lista de processamento
      setProcessingCoupons(prev => {
        const newSet = new Set(prev.rejecting);
        newSet.delete(couponId);
        return { ...prev, rejecting: newSet };
      });
    }
  };

  const handleApproveBatch = async () => {
    if (selectedIds.length === 0) {
      alert('Selecione pelo menos um cupom');
      return;
    }

    if (!confirm(`Aprovar ${selectedIds.length} cupom(ns)?`)) return;

    setIsBatchProcessing(true);
    // Adicionar todos à lista de processamento
    setProcessingCoupons(prev => ({
      ...prev,
      approving: new Set([...prev.approving, ...selectedIds])
    }));

    try {
      await api.post('/coupons/approve-batch', { ids: selectedIds });
      alert(`${selectedIds.length} cupom(ns) aprovado(s) com sucesso!`);
      setSelectedIds([]);
      if (activeTab === 'pending') {
        fetchPendingCoupons(pendingPagination.page);
      }
      fetchCoupons(pagination.page);
    } catch (error) {
      console.error('Erro ao aprovar cupons:', error);
      alert('Erro ao aprovar cupons');
    } finally {
      setIsBatchProcessing(false);
      // Remover todos da lista de processamento
      setProcessingCoupons(prev => {
        const newSet = new Set(prev.approving);
        selectedIds.forEach(id => newSet.delete(id));
        return { ...prev, approving: newSet };
      });
    }
  };

  const handleRejectBatch = async () => {
    if (selectedIds.length === 0) {
      alert('Selecione pelo menos um cupom');
      return;
    }

    const reason = prompt('Motivo da rejeição (opcional):');
    if (reason === null) return; // Usuário cancelou

    setIsBatchProcessing(true);
    // Adicionar todos à lista de processamento
    setProcessingCoupons(prev => ({
      ...prev,
      rejecting: new Set([...prev.rejecting, ...selectedIds])
    }));

    try {
      await api.post('/coupons/reject-batch', { ids: selectedIds, reason });
      alert(`${selectedIds.length} cupom(ns) rejeitado(s) com sucesso!`);
      setSelectedIds([]);
      if (activeTab === 'pending') {
        fetchPendingCoupons(pendingPagination.page);
      }
      fetchCoupons(pagination.page);
    } catch (error) {
      console.error('Erro ao rejeitar cupons:', error);
      alert('Erro ao rejeitar cupons');
    } finally {
      setIsBatchProcessing(false);
      // Remover todos da lista de processamento
      setProcessingCoupons(prev => {
        const newSet = new Set(prev.rejecting);
        selectedIds.forEach(id => newSet.delete(id));
        return { ...prev, rejecting: newSet };
      });
    }
  };

  const handleExport = async (format = 'json') => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({ format, ...filters, search: searchTerm });
      const response = await api.get(`/coupons/export?${params.toString()}`, {
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
        const dataStr = JSON.stringify(response.data.data || response.data, null, 2);
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

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      platform: coupon.platform || 'general',
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_purchase: coupon.min_purchase || '',
      max_discount_value: coupon.max_discount_value || '',
      is_general: coupon.is_general !== undefined && coupon.is_general !== null ? coupon.is_general : null,
      applicable_products: coupon.applicable_products || [],
      max_uses: coupon.max_uses || '',
      current_uses: coupon.current_uses || 0,
      valid_from: coupon.valid_from ? format(new Date(coupon.valid_from), 'yyyy-MM-dd') : '',
      valid_until: coupon.valid_until ? format(new Date(coupon.valid_until), 'yyyy-MM-dd') : '',
      is_exclusive: coupon.is_exclusive || false
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validação básica no frontend
    if (!formData.code || formData.code.trim() === '') {
      setErrors({ code: 'Código é obrigatório' });
      return;
    }

    if (!formData.discount_value || parseFloat(formData.discount_value) <= 0) {
      setErrors({ discount_value: 'Valor do desconto deve ser maior que zero' });
      return;
    }

    // Data de expiração não é mais obrigatória

    try {
      // Preparar dados para envio
      const submitData = {
        code: formData.code.trim().toUpperCase(),
        platform: formData.platform,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_purchase: formData.min_purchase && formData.min_purchase !== ''
          ? parseFloat(formData.min_purchase)
          : 0,
        max_discount_value: formData.max_discount_value && formData.max_discount_value !== ''
          ? parseFloat(formData.max_discount_value)
          : null,
        is_general: formData.is_general,
        applicable_products: formData.applicable_products || [],
        valid_until: formData.valid_until && formData.valid_until.trim() !== ''
          ? new Date(formData.valid_until + 'T23:59:59').toISOString()
          : null,
      };

      // Adicionar current_uses apenas na edição
      if (editingCoupon) {
        submitData.current_uses = parseInt(formData.current_uses) || 0;
      }

      // Adicionar valid_from se fornecido
      if (formData.valid_from && formData.valid_from.trim() !== '') {
        submitData.valid_from = new Date(formData.valid_from + 'T00:00:00').toISOString();
      }

      // Adicionar description e title se fornecido
      if (formData.description && formData.description.trim() !== '') {
        submitData.description = formData.description.trim();
        submitData.title = formData.description.trim();
      }

      // Adicionar max_uses se fornecido
      if (formData.max_uses && formData.max_uses !== '') {
        const maxUses = parseInt(formData.max_uses);
        if (!isNaN(maxUses) && maxUses > 0) {
          submitData.max_uses = maxUses;
        }
      }

      // Adicionar is_exclusive
      submitData.is_exclusive = formData.is_exclusive || false;

      if (editingCoupon) {
        await api.put(`/coupons/${editingCoupon.id}`, submitData);
      } else {
        await api.post('/coupons', submitData);
      }
      setIsDialogOpen(false);
      setEditingCoupon(null);
      setErrors({});
      setFormData({
        code: '',
        platform: 'general',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        min_purchase: '',
        max_discount_value: '',
        is_general: null,
        applicable_products: [],
        max_uses: '',
        current_uses: 0,
        valid_from: '',
        valid_until: '',
        is_exclusive: false
      });
      fetchCoupons(1);
    } catch (error) {
      console.error('Erro ao salvar cupom:', error);
      const errorMessage = error.response?.data?.details
        ? error.response.data.details.map(d => `${d.field}: ${d.message}`).join('\n')
        : error.response?.data?.error || 'Erro ao salvar cupom';
      alert(errorMessage);

      // Mostrar erros de validação específicos
      if (error.response?.data?.details) {
        const validationErrors = {};
        error.response.data.details.forEach(detail => {
          validationErrors[detail.field] = detail.message;
        });
        setErrors(validationErrors);
      }
    }
  };

  const [selectedIds, setSelectedIds] = useState([]);
  const [processingCoupons, setProcessingCoupons] = useState({
    approving: new Set(),
    publishing: new Set(),
    rejecting: new Set()
  });
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Toggle selection
  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Toggle select all
  const toggleSelectAll = () => {
    const currentCoupons = activeTab === 'all' ? coupons : pendingCoupons;
    if (selectedIds.length === currentCoupons.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentCoupons.map(c => c.id));
    }
  };

  // Batch delete logic
  const handleBatchDelete = async () => {
    if (!confirm(`Deseja deletar ${selectedIds.length} cupons?`)) return;

    try {
      await api.post('/coupons/batch-delete', { ids: selectedIds });
      setSelectedIds([]);
      fetchCoupons(pagination.page);
      alert('Cupons deletados com sucesso!');
    } catch (error) {
      alert('Erro ao deletar cupons em lote');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Código copiado!');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cupons</h1>
          <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Gerencie cupons ({pagination.total})
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedIds.length > 0 && activeTab === 'pending' && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleApproveBatch}
                disabled={isBatchProcessing}
                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 h-8 sm:h-9 text-xs sm:text-sm"
              >
                {isBatchProcessing && processingCoupons.approving.size > 0 ? (
                  <><Loader2 className="mr-1 h-3 w-3 animate-spin" />...</>
                ) : (
                  <><CheckCircle className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Aprovar</span> ({selectedIds.length})</>
                )}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRejectBatch}
                disabled={isBatchProcessing}
                className="disabled:opacity-50 h-8 sm:h-9 text-xs sm:text-sm"
              >
                {isBatchProcessing && processingCoupons.rejecting.size > 0 ? (
                  <><Loader2 className="mr-1 h-3 w-3 animate-spin" />...</>
                ) : (
                  <><XCircle className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Rejeitar</span> ({selectedIds.length})</>
                )}
              </Button>
            </>
          )}
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={isBatchProcessing}
              className="disabled:opacity-50 h-8 sm:h-9 text-xs sm:text-sm"
            >
              <Trash2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Deletar</span> ({selectedIds.length})
            </Button>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" onClick={() => {
                setEditingCoupon(null);
                setFormData({
                  code: '',
                  platform: 'general',
                  description: '',
                  discount_type: 'percentage',
                  discount_value: '',
                  min_purchase: '',
                  max_discount_value: '',
                  is_general: null,
                  applicable_products: [],
                  max_uses: '',
                  current_uses: 0,
                  valid_from: '',
                  valid_until: '',
                  is_exclusive: false
                });
                setErrors({});
                setIsLoadingCoupon(false);
              }}>
                <Plus className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Novo </span>Cupom
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados do cupom abaixo
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="platform">Plataforma *</Label>
                    <select
                      id="platform"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                      required
                    >
                      <option value="general">Geral</option>
                      <option value="mercadolivre">Mercado Livre</option>
                      <option value="shopee">Shopee</option>
                      <option value="amazon">Amazon</option>
                      <option value="aliexpress">AliExpress</option>
                      <option value="kabum">Kabum</option>
                      <option value="magazineluiza">Magazine Luiza</option>
                      <option value="terabyteshop">Terabyteshop</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Código *</Label>
                    <div className="relative">
                      <Input
                        id="code"
                        value={formData.code || ''}
                        onChange={(e) => handleCodeChange(e.target.value)}
                        onBlur={(e) => {
                          // Buscar novamente ao perder o foco se tiver código
                          if (e.target.value.trim().length >= 4 && !editingCoupon) {
                            handleCodeChange(e.target.value);
                          }
                        }}
                        placeholder="Ex: PROMO10"
                        required
                        disabled={isLoadingCoupon}
                      />
                      {isLoadingCoupon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        </div>
                      )}
                    </div>
                    {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
                    {!editingCoupon && (
                      <p className="text-xs text-muted-foreground">
                        💡 Digite o código do cupom para auto-preenchimento (mínimo 4 caracteres)
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Título/Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={formData.platform === 'mercadolivre' ? 'Ex: R$ 100 OFF Móveis+Colchões' : 'Descrição do cupom'}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount_type">Tipo de Desconto *</Label>
                    <select
                      id="discount_type"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    >
                      <option value="percentage">Porcentagem (%)</option>
                      <option value="fixed">Valor Fixo (R$)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount_value">
                      Valor do Desconto * {formData.discount_type === 'percentage' ? '(%)' : '(R$)'}
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      step="0.01"
                      value={formData.discount_value || ''}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      required
                    />
                    {errors.discount_value && <p className="text-sm text-red-500">{errors.discount_value}</p>}
                  </div>
                </div>

                {(formData.platform === 'mercadolivre' || formData.platform === 'shopee') && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="min_purchase">Compra Mínima (R$)</Label>
                      <Input
                        id="min_purchase"
                        type="number"
                        step="0.01"
                        value={formData.min_purchase || ''}
                        onChange={(e) => setFormData({ ...formData, min_purchase: e.target.value })}
                        placeholder="Ex: 259.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_discount_value">Limite Máximo de Desconto (R$)</Label>
                      <Input
                        id="max_discount_value"
                        type="number"
                        step="0.01"
                        value={formData.max_discount_value || ''}
                        onChange={(e) => setFormData({ ...formData, max_discount_value: e.target.value })}
                        placeholder="Ex: 60.00 (máximo R$ 60 de desconto)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor máximo de desconto que pode ser aplicado (ex: R$ 60 máximo)
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="is_general">Aplicabilidade</Label>
                  <select
                    id="is_general"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.is_general === null ? 'null' : formData.is_general ? 'true' : 'false'}
                    onChange={(e) => {
                      const value = e.target.value === 'null' ? null : e.target.value === 'true';
                      setFormData({
                        ...formData,
                        is_general: value,
                        applicable_products: value === false ? formData.applicable_products : []
                      });
                    }}
                  >
                    <option value="null">Não especificado</option>
                    <option value="true">Todos os Produtos</option>
                    <option value="false">Produtos Selecionados</option>
                  </select>
                  {formData.is_general === false && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ⚠️ Para produtos selecionados, você precisará associar os produtos após criar o cupom.
                    </p>
                  )}
                  {formData.is_general === null && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ℹ️ Quando não especificado, a informação de aplicabilidade não aparecerá no template do cupom.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valid_from">Data de Início</Label>
                    <Input
                      id="valid_from"
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valid_until">Data de Expiração (opcional)</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={formData.valid_until || ''}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Se não informada, o cupom não terá data de expiração definida
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_uses">Limite de Usos</Label>
                    <Input
                      id="max_uses"
                      type="number"
                      value={formData.max_uses || ''}
                      onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                      placeholder="Ex: 200 (ilimitado se vazio)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Número máximo de vezes que o cupom pode ser usado
                    </p>
                  </div>
                  {editingCoupon && (
                    <div className="space-y-2">
                      <Label htmlFor="current_uses">Usos Atuais</Label>
                      <Input
                        id="current_uses"
                        type="number"
                        min="0"
                        value={formData.current_uses || 0}
                        onChange={(e) => setFormData({ ...formData, current_uses: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                      {formData.max_uses && (
                        <p className="text-xs text-muted-foreground">
                          {formData.current_uses || 0} / {formData.max_uses} usos
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_exclusive"
                      checked={formData.is_exclusive || false}
                      onChange={(e) => setFormData({ ...formData, is_exclusive: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="is_exclusive" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      ⭐ Cupom Exclusivo
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Cupons exclusivos aparecem primeiro e destacados no app mobile
                  </p>
                </div>

                {/* Informação sobre Modo de Template */}
                {!editingCoupon && (
                  <div className="p-3 bg-muted rounded-md border">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1">
                        <Label className="text-sm font-semibold">Modo de Template Ativo</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Este cupom será enviado usando o template de "Novo Cupom"
                        </p>
                      </div>
                      <Badge className={`${getTemplateModeInfo().color} shrink-0`}>
                        {getTemplateModeInfo().icon} {getTemplateModeInfo().label}
                      </Badge>
                    </div>
                    {getTemplateModeInfo().label === 'IA ADVANCED' && (
                      <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs text-purple-800 dark:text-purple-200">
                        <Brain className="h-3 w-3 inline mr-1" />
                        A IA irá gerar o template automaticamente baseado no cupom e contexto
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                    Cancelar
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto">
                    {editingCoupon ? 'Salvar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Lista de Cupons</CardTitle>
              <CardDescription>
                {activeTab === 'all'
                  ? `Exibindo página ${pagination.page} de ${pagination.totalPages} (${pagination.total} total)`
                  : `Exibindo página ${pendingPagination.page} de ${pendingPagination.totalPages} (${pendingPagination.total} pendentes)`
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cupons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 border-b">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              Todos os Cupons
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'pending'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              Pendentes de Aprovação
              {pendingPagination.total > 0 && (
                <Badge variant="destructive" className="ml-2 animate-pulse">
                  {pendingPagination.total}
                </Badge>
              )}
            </button>
          </div>

          {/* Informações adicionais para aba pendentes */}
          {activeTab === 'pending' && pendingCoupons.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                  ⚠️ {pendingPagination.total} cupom(ns) aguardando aprovação
                </span>
                <span className="text-yellow-600 dark:text-yellow-400">
                  • Use os botões de ação em lote para aprovar ou rejeitar múltiplos cupons de uma vez
                </span>
              </div>
            </div>
          )}

          {/* Filtros */}
          {showFilters && (
            <div className="mt-4 p-4 bg-muted rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Plataforma</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  value={filters.platform}
                  onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
                >
                  <option value="">Todas</option>
                  <option value="mercadolivre">Mercado Livre</option>
                  <option value="shopee">Shopee</option>
                  <option value="amazon">Amazon</option>
                  <option value="aliexpress">AliExpress</option>
                  <option value="kabum">Kabum</option>
                  <option value="magazineluiza">Magazine Luiza</option>
                  <option value="terabyteshop">Terabyteshop</option>
                  <option value="general">Geral</option>
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  value={filters.is_active}
                  onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
              <div>
                <Label>Verificação</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  value={filters.verification_status}
                  onChange={(e) => setFilters({ ...filters, verification_status: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="active">Ativo</option>
                  <option value="invalid">Inválido</option>
                  <option value="expired">Expirado</option>
                </select>
              </div>
              <div>
                <Label>Tipo de Desconto</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  value={filters.discount_type}
                  onChange={(e) => setFilters({ ...filters, discount_type: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="percentage">Percentual</option>
                  <option value="fixed">Fixo</option>
                </select>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Carregando cupons...</div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        className="translate-y-0.5 w-4 h-4 rounded border-gray-300"
                        checked={
                          (activeTab === 'all' ? coupons.length > 0 : pendingCoupons.length > 0) &&
                          selectedIds.length === (activeTab === 'all' ? coupons.length : pendingCoupons.length)
                        }
                        onChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Confiança</TableHead>
                    {activeTab === 'pending' && <TableHead>Origem</TableHead>}
                    <TableHead>Usos</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(activeTab === 'all' ? coupons : pendingCoupons).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={activeTab === 'all' ? 9 : 10} className="text-center text-muted-foreground">
                        {activeTab === 'pending' ? 'Nenhum cupom pendente encontrado' : 'Nenhum cupom encontrado'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    (activeTab === 'all' ? coupons : pendingCoupons).map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="translate-y-0.5 w-4 h-4 rounded border-gray-300"
                            checked={selectedIds.includes(coupon.id)}
                            onChange={() => toggleSelection(coupon.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="font-mono font-semibold bg-muted px-2 py-1 rounded">
                              {coupon.code}
                            </code>
                            {coupon.is_exclusive && (
                              <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-white">
                                ⭐ Exclusivo
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(coupon.code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          {coupon.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {coupon.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              coupon.platform === 'mercadolivre' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                coupon.platform === 'shopee' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                  coupon.platform === 'amazon' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                    coupon.platform === 'aliexpress' ? 'bg-red-100 text-red-800 border-red-300' :
                                      coupon.platform === 'kabum' ? 'bg-orange-200 text-orange-900 border-orange-400' :
                                        coupon.platform === 'magazineluiza' ? 'bg-blue-200 text-blue-900 border-blue-400' :
                                          coupon.platform === 'terabyteshop' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                            'bg-gray-100 text-gray-800 border-gray-300'
                            }
                          >
                            {coupon.platform === 'mercadolivre' ? 'Mercado Livre' :
                              coupon.platform === 'shopee' ? 'Shopee' :
                                coupon.platform === 'amazon' ? 'Amazon' :
                                  coupon.platform === 'aliexpress' ? 'AliExpress' :
                                    coupon.platform === 'kabum' ? 'Kabum' :
                                      coupon.platform === 'magazineluiza' ? 'Magazine Luiza' :
                                        coupon.platform === 'terabyteshop' ? 'Terabyteshop' :
                                          'Geral'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {coupon.discount_type === 'percentage'
                              ? `${coupon.discount_value}%`
                              : `R$ ${parseFloat(coupon.discount_value).toFixed(2)}`
                            }
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {coupon.confidence_score !== null && coupon.confidence_score !== undefined ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${coupon.confidence_score >= 0.90
                                        ? 'bg-green-500'
                                        : coupon.confidence_score >= 0.75
                                          ? 'bg-yellow-500'
                                          : 'bg-red-500'
                                        }`}
                                      style={{ width: `${coupon.confidence_score * 100}%` }}
                                    />
                                  </div>
                                </div>
                                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                  {(coupon.confidence_score * 100).toFixed(0)}%
                                </span>
                              </div>
                              {activeTab === 'pending' && coupon.ai_decision_reason && (
                                <div className="text-xs text-muted-foreground mt-1 max-w-xs" title={coupon.ai_decision_reason}>
                                  <div className="truncate">{coupon.ai_decision_reason}</div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        {activeTab === 'pending' && (
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              {coupon.channel_origin && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Canal:</span>
                                  <Badge variant="outline" className="text-xs">
                                    {coupon.channel_origin}
                                  </Badge>
                                </div>
                              )}
                              {coupon.capture_source && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Fonte:</span>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {coupon.capture_source}
                                  </Badge>
                                </div>
                              )}
                              {coupon.created_at && (
                                <div className="text-muted-foreground">
                                  📅 {format(new Date(coupon.created_at), 'dd/MM/yyyy HH:mm')}
                                </div>
                              )}
                              {!coupon.channel_origin && !coupon.capture_source && !coupon.created_at && (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="text-sm">
                            {coupon.current_uses} / {coupon.max_uses || '∞'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {coupon.valid_until ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(coupon.valid_until), 'dd/MM/yyyy')}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sem validade</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {coupon.is_out_of_stock ? (
                              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                                🚫 Esgotado
                              </Badge>
                            ) : coupon.is_pending_approval ? (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                ⏸️ Pendente
                              </Badge>
                            ) : (
                              <Badge variant={coupon.is_active ? 'success' : 'destructive'}>
                                {coupon.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            )}
                            {activeTab === 'pending' && coupon.verification_status && coupon.verification_status !== 'pending' && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {coupon.verification_status === 'active' ? '✅ Válido' :
                                  coupon.verification_status === 'invalid' ? '❌ Inválido' :
                                    coupon.verification_status === 'expired' ? '⏰ Expirado' :
                                      '📋 ' + coupon.verification_status}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 flex-wrap">
                            {coupon.is_pending_approval && activeTab === 'pending' && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setApprovalCoupon(coupon);
                                    setFormData({
                                      code: coupon.code || '',
                                      platform: coupon.platform || 'general',
                                      description: coupon.description || '',
                                      discount_type: coupon.discount_type || 'percentage',
                                      discount_value: coupon.discount_value || '',
                                      min_purchase: coupon.min_purchase || '',
                                      max_discount_value: coupon.max_discount_value || '',
                                      is_general: coupon.is_general !== undefined && coupon.is_general !== null ? coupon.is_general : null,
                                      applicable_products: coupon.applicable_products || [],
                                      max_uses: coupon.max_uses || '',
                                      current_uses: coupon.current_uses || 0,
                                      valid_from: coupon.valid_from ? format(new Date(coupon.valid_from), 'yyyy-MM-dd') : '',
                                      valid_until: coupon.valid_until ? format(new Date(coupon.valid_until), 'yyyy-MM-dd') : '',
                                      is_exclusive: coupon.is_exclusive || false
                                    });
                                    setIsApprovalDialogOpen(true);
                                  }}
                                  disabled={processingCoupons.approving.has(coupon.id) || processingCoupons.publishing.has(coupon.id) || processingCoupons.rejecting.has(coupon.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Revisar e publicar cupom"
                                >
                                  {processingCoupons.publishing.has(coupon.id) ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Publicando...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Revisar e Publicar
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    const reason = prompt('Motivo da rejeição (opcional):');
                                    if (reason !== null) {
                                      handleRejectCoupon(coupon.id, reason);
                                    }
                                  }}
                                  disabled={processingCoupons.approving.has(coupon.id) || processingCoupons.publishing.has(coupon.id) || processingCoupons.rejecting.has(coupon.id)}
                                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Rejeitar cupom"
                                >
                                  {processingCoupons.rejecting.has(coupon.id) ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Rejeitando...
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Rejeitar
                                    </>
                                  )}
                                </Button>
                              </>
                            )}
                            {coupon.is_pending_approval && activeTab === 'all' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleForcePublish(coupon)}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                title="Aprovar e publicar imediatamente"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Publicar
                              </Button>
                            )}
                            {coupon.is_out_of_stock ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkAsAvailable(coupon)}
                                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                                title="Marcar como disponível"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Disponível
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkAsOutOfStock(coupon)}
                                className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                                title="Marcar como esgotado"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Esgotado
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(coupon)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(coupon.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <Pagination
                currentPage={activeTab === 'all' ? pagination.page : pendingPagination.page}
                totalPages={activeTab === 'all' ? pagination.totalPages : pendingPagination.totalPages}
                onPageChange={(newPage) => {
                  if (activeTab === 'all') {
                    fetchCoupons(newPage);
                  } else {
                    fetchPendingCoupons(newPage);
                  }
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Aprovação com Edição */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Revisar e Publicar Cupom
            </DialogTitle>
            <DialogDescription>
              Revise e edite os dados do cupom antes de publicar
            </DialogDescription>
          </DialogHeader>

          {/* Informações de origem */}
          {approvalCoupon && (
            <div className="p-3 bg-muted rounded-lg border text-sm">
              <div className="flex flex-wrap gap-3">
                {approvalCoupon.channel_origin && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Canal:</span>
                    <Badge variant="outline">{approvalCoupon.channel_origin}</Badge>
                  </div>
                )}
                {approvalCoupon.capture_source && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Fonte:</span>
                    <Badge variant="outline" className="capitalize">{approvalCoupon.capture_source}</Badge>
                  </div>
                )}
                {approvalCoupon.confidence_score !== null && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Confiança:</span>
                    <Badge variant={approvalCoupon.confidence_score >= 0.9 ? 'default' : approvalCoupon.confidence_score >= 0.75 ? 'secondary' : 'destructive'}>
                      {(approvalCoupon.confidence_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!approvalCoupon) return;

            try {
              // Preparar dados atualizados
              const updateData = {
                code: formData.code?.trim()?.toUpperCase() || approvalCoupon.code,
                platform: formData.platform,
                description: formData.description?.trim() || null,
                discount_type: formData.discount_type,
                discount_value: parseFloat(formData.discount_value) || approvalCoupon.discount_value,
                min_purchase: formData.min_purchase ? parseFloat(formData.min_purchase) : 0,
                max_discount_value: formData.max_discount_value ? parseFloat(formData.max_discount_value) : null,
                is_general: formData.is_general,
                max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
                valid_from: formData.valid_from ? new Date(formData.valid_from + 'T00:00:00').toISOString() : null,
                valid_until: formData.valid_until ? new Date(formData.valid_until + 'T23:59:59').toISOString() : null,
                is_exclusive: formData.is_exclusive || false
              };

              // Publicar cupom com dados atualizados
              await handleForcePublish({ ...approvalCoupon, ...updateData });
              setIsApprovalDialogOpen(false);
              setApprovalCoupon(null);
            } catch (error) {
              console.error('Erro ao publicar cupom:', error);
            }
          }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="approval-platform">Plataforma *</Label>
                <select
                  id="approval-platform"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  required
                >
                  <option value="general">Geral</option>
                  <option value="mercadolivre">Mercado Livre</option>
                  <option value="shopee">Shopee</option>
                  <option value="amazon">Amazon</option>
                  <option value="aliexpress">AliExpress</option>
                  <option value="kabum">Kabum</option>
                  <option value="magazineluiza">Magazine Luiza</option>
                  <option value="terabyteshop">Terabyteshop</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="approval-code">Código *</Label>
                <Input
                  id="approval-code"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: PROMO10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approval-description">Título/Descrição</Label>
              <textarea
                id="approval-description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do cupom"
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="approval-discount_type">Tipo de Desconto *</Label>
                <select
                  id="approval-discount_type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                >
                  <option value="percentage">Porcentagem (%)</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="approval-discount_value">
                  Valor do Desconto * {formData.discount_type === 'percentage' ? '(%)' : '(R$)'}
                </Label>
                <Input
                  id="approval-discount_value"
                  type="number"
                  step="0.01"
                  value={formData.discount_value || ''}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  required
                />
              </div>
            </div>

            {(formData.platform === 'mercadolivre' || formData.platform === 'shopee') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="approval-min_purchase">Compra Mínima (R$)</Label>
                  <Input
                    id="approval-min_purchase"
                    type="number"
                    step="0.01"
                    value={formData.min_purchase || ''}
                    onChange={(e) => setFormData({ ...formData, min_purchase: e.target.value })}
                    placeholder="Ex: 259.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approval-max_discount_value">Limite Máximo de Desconto (R$)</Label>
                  <Input
                    id="approval-max_discount_value"
                    type="number"
                    step="0.01"
                    value={formData.max_discount_value || ''}
                    onChange={(e) => setFormData({ ...formData, max_discount_value: e.target.value })}
                    placeholder="Ex: 60.00"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="approval-is_general">Aplicabilidade</Label>
              <select
                id="approval-is_general"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.is_general === null ? 'null' : formData.is_general ? 'true' : 'false'}
                onChange={(e) => {
                  const value = e.target.value === 'null' ? null : e.target.value === 'true';
                  setFormData({
                    ...formData,
                    is_general: value,
                    applicable_products: value === false ? formData.applicable_products : []
                  });
                }}
              >
                <option value="null">Não especificado</option>
                <option value="true">Todos os Produtos</option>
                <option value="false">Produtos Selecionados</option>
              </select>
              {formData.is_general === false && (
                <p className="text-sm text-muted-foreground">
                  ⚠️ Para produtos selecionados, você precisará associar os produtos após publicar.
                </p>
              )}
              {formData.is_general === null && (
                <p className="text-sm text-muted-foreground">
                  ℹ️ Quando não especificado, a aplicabilidade não aparecerá no template.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="approval-valid_from">Data de Início</Label>
                <Input
                  id="approval-valid_from"
                  type="date"
                  value={formData.valid_from || ''}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="approval-valid_until">Data de Expiração</Label>
                <Input
                  id="approval-valid_until"
                  type="date"
                  value={formData.valid_until || ''}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="approval-is_exclusive"
                  checked={formData.is_exclusive || false}
                  onChange={(e) => setFormData({ ...formData, is_exclusive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="approval-is_exclusive" className="text-sm font-medium">
                  ⭐ Cupom Exclusivo
                </Label>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (approvalCoupon) {
                    const reason = prompt('Motivo da rejeição (opcional):');
                    if (reason !== null) {
                      handleRejectCoupon(approvalCoupon.id, reason);
                      setIsApprovalDialogOpen(false);
                      setApprovalCoupon(null);
                    }
                  }
                }}
                className="w-full sm:w-auto"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rejeitar
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setIsApprovalDialogOpen(false);
                setApprovalCoupon(null);
              }} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                disabled={processingCoupons.publishing.has(approvalCoupon?.id)}
              >
                {processingCoupons.publishing.has(approvalCoupon?.id) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Publicar Cupom
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
