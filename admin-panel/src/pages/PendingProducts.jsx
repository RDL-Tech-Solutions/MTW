import { useEffect, useState } from 'react';
import api from '../services/api';
import { CheckCircle, XCircle, Search, ExternalLink, Clock, Eye, X, Zap, Brain, Link2, Loader2, CheckSquare, Square, Filter, Download, FileText, ChevronDown, ChevronUp, Calendar, Clipboard } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';
import { Pagination } from '../components/ui/Pagination';
import { PlatformLogo, getPlatformName } from '../utils/platformLogos.jsx';
import { useIsMobile } from '../hooks/useMediaQuery';

export default function PendingProducts() {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [affiliateLink, setAffiliateLink] = useState('');
  const [selectedCouponId, setSelectedCouponId] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [finalPrice, setFinalPrice] = useState(null);
  const [approving, setApproving] = useState(false);
  const [shortening, setShortening] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [approvingOnly, setApprovingOnly] = useState(false); // NOVO: aprovar sem publicar
  const [rejecting, setRejecting] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [templateModes, setTemplateModes] = useState({
    new_promotion: 'custom',
    promotion_with_coupon: 'custom'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0
  });
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minDiscountFilter, setMinDiscountFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [editableCurrentPrice, setEditableCurrentPrice] = useState('');
  const [editableOldPrice, setEditableOldPrice] = useState('');

  // NOVO: Estados para captura em lote
  const [isBatchCaptureDialogOpen, setIsBatchCaptureDialogOpen] = useState(false);
  const [batchCaptureLinks, setBatchCaptureLinks] = useState('');
  const [batchCapturing, setBatchCapturing] = useState(false);
  const [batchCaptureProgress, setBatchCaptureProgress] = useState({ current: 0, total: 0 });
  const [batchCaptureResults, setBatchCaptureResults] = useState(null);

  // NOVO: Estado para modal de aprovação em lote
  const [isBatchApprovalDialogOpen, setIsBatchApprovalDialogOpen] = useState(false);

  const isMobile = useIsMobile();
  const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);
  const [selectedMobileProduct, setSelectedMobileProduct] = useState(null);

  useEffect(() => {
    fetchPendingProducts(1);
    loadTemplateModes();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadTemplateModes = async () => {
    try {
      const response = await api.get('/settings');
      const settings = response.data.data;
      setTemplateModes({
        new_promotion: settings.template_mode_promotion || 'custom',
        promotion_with_coupon: settings.template_mode_promotion_coupon || 'custom'
      });
    } catch (error) {
      console.error('Erro ao carregar modos de template:', error);
    }
  };

  const getTemplateModeInfo = (hasCoupon) => {
    const mode = hasCoupon ? templateModes.promotion_with_coupon : templateModes.new_promotion;
    const modeNames = {
      'default': { label: 'Padrão', icon: '📋', color: 'bg-gray-100 text-gray-800' },
      'custom': { label: 'Customizado', icon: '✏️', color: 'bg-blue-100 text-blue-800' },
      'ai_advanced': { label: 'IA ADVANCED', icon: '🤖', color: 'bg-purple-100 text-purple-800' }
    };
    return modeNames[mode] || modeNames['custom'];
  };

  const fetchPendingProducts = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }
      if (platformFilter && platformFilter !== 'all') {
        params.platform = platformFilter;
      }
      if (categoryFilter && categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      if (minDiscountFilter) {
        params.min_discount = parseFloat(minDiscountFilter);
      }

      const response = await api.get('/products/pending', { params });

      const { products, totalPages, total } = response.data.data;

      setProducts(products || []);
      setPagination(prev => ({
        ...prev,
        page,
        totalPages: totalPages || 1,
        total: total || 0
      }));
      setSelectedProducts(new Set()); // Limpar seleção ao mudar página

    } catch (error) {
      console.error('❌ Erro ao carregar produtos pendentes:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar produtos pendentes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Debounce search e filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPendingProducts(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, platformFilter, categoryFilter, minDiscountFilter]);

  const handleOpenApprovalDialog = async (product) => {
    setSelectedProduct(product);
    setAffiliateLink(product.original_link || product.affiliate_link || '');
    setSelectedCouponId(product.coupon_id || '');
    setSelectedCategoryId(product.category_id || '');
    setFinalPrice(null);
    setEditableCurrentPrice(product.current_price?.toString() || '');
    setEditableOldPrice(product.old_price?.toString() || '');
    setIsApprovalDialogOpen(true);

    // Buscar cupons disponíveis para a plataforma do produto
    await fetchAvailableCoupons(product.platform);
  };

  const handleCloseApprovalDialog = () => {
    setIsApprovalDialogOpen(false);
    setSelectedProduct(null);
    setAffiliateLink('');
    setSelectedCouponId('');
    setSelectedCategoryId('');
    setAvailableCoupons([]);
    setFinalPrice(null);
  };

  const fetchAvailableCoupons = async (platform) => {
    try {
      setLoadingCoupons(true);
      const response = await api.get('/coupons', {
        params: {
          platform: platform || 'all',
          limit: 100 // Buscar mais cupons para ter opções
        }
      });

      const coupons = response.data.data?.coupons || [];
      setAvailableCoupons(coupons);
    } catch (error) {
      console.error('❌ Erro ao buscar cupons:', error);
      toast({
        title: "Aviso",
        description: "Não foi possível carregar cupons disponíveis",
        variant: "default"
      });
    } finally {
      setLoadingCoupons(false);
    }
  };

  const calculateFinalPrice = (product, couponId) => {
    if (!product || !couponId) {
      setFinalPrice(null);
      return;
    }

    const coupon = availableCoupons.find(c => c.id === couponId);
    if (!coupon) {
      setFinalPrice(null);
      return;
    }

    // Preço atual do produto (já com desconto)
    const currentPrice = product.current_price || 0;

    // Aplicar desconto do cupom sobre o preço atual
    let finalPriceValue = currentPrice;

    if (coupon.discount_type === 'percentage') {
      // Desconto percentual: preço - (preço * desconto%)
      finalPriceValue = currentPrice - (currentPrice * (coupon.discount_value / 100));
    } else {
      // Desconto fixo: preço - valor fixo
      finalPriceValue = Math.max(0, currentPrice - coupon.discount_value);
    }

    // Aplicar limite máximo de desconto se existir
    if (coupon.max_discount_value && coupon.max_discount_value > 0) {
      const discountAmount = currentPrice - finalPriceValue;
      if (discountAmount > coupon.max_discount_value) {
        finalPriceValue = currentPrice - coupon.max_discount_value;
      }
    }

    setFinalPrice(finalPriceValue);
  };

  useEffect(() => {
    if (selectedProduct && selectedCouponId) {
      calculateFinalPrice(selectedProduct, selectedCouponId);
    } else {
      setFinalPrice(null);
    }
  }, [selectedCouponId, selectedProduct, availableCoupons]);

  const toggleProductSelection = (productId) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const handleBatchApproveAndPublish = async () => {
    if (selectedProducts.size === 0) {
      toast({
        title: "Aviso",
        description: "Selecione pelo menos um produto",
        variant: "default"
      });
      return;
    }

    setBatchProcessing(true);
    setIsBatchApprovalDialogOpen(false);
    
    try {
      const productIds = Array.from(selectedProducts);
      let successCount = 0;
      let errorCount = 0;

      toast({
        title: "Processando...",
        description: `Aprovando e publicando ${productIds.length} produtos`,
      });

      for (const productId of productIds) {
        try {
          const product = products.find(p => p.id === productId);
          if (!product || !product.original_link) {
            errorCount++;
            continue;
          }

          await api.post(`/products/pending/${productId}/approve`, {
            affiliate_link: product.original_link,
            shorten_link: false
          });
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      toast({
        title: "Processamento concluído",
        description: `${successCount} produtos aprovados e publicados${errorCount > 0 ? `, ${errorCount} com erro` : ''}`,
      });

      setSelectedProducts(new Set());
      fetchPendingProducts(pagination.page);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao processar produtos em lote",
        variant: "destructive"
      });
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchApproveOnly = async () => {
    if (selectedProducts.size === 0) {
      toast({
        title: "Aviso",
        description: "Selecione pelo menos um produto",
        variant: "default"
      });
      return;
    }

    setBatchProcessing(true);
    setIsBatchApprovalDialogOpen(false);
    
    try {
      const productIds = Array.from(selectedProducts);
      let successCount = 0;
      let errorCount = 0;

      toast({
        title: "Processando...",
        description: `Aprovando ${productIds.length} produtos (sem publicar)`,
      });

      for (const productId of productIds) {
        try {
          const product = products.find(p => p.id === productId);
          if (!product || !product.original_link) {
            errorCount++;
            continue;
          }

          await api.post(`/products/pending/${productId}/approve-only`, {
            affiliate_link: product.original_link,
            shorten_link: false
          });
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      toast({
        title: "Processamento concluído",
        description: `${successCount} produtos aprovados${errorCount > 0 ? `, ${errorCount} com erro` : ''}`,
      });

      setSelectedProducts(new Set());
      fetchPendingProducts(pagination.page);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao processar produtos em lote",
        variant: "destructive"
      });
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchSchedule = async () => {
    if (selectedProducts.size === 0) {
      toast({
        title: "Aviso",
        description: "Selecione pelo menos um produto",
        variant: "default"
      });
      return;
    }

    setBatchProcessing(true);
    setIsBatchApprovalDialogOpen(false);
    
    try {
      const productIds = Array.from(selectedProducts);
      let successCount = 0;
      let errorCount = 0;

      toast({
        title: "Processando...",
        description: `Agendando ${productIds.length} produtos com IA`,
      });

      for (const productId of productIds) {
        try {
          const product = products.find(p => p.id === productId);
          if (!product || !product.original_link) {
            errorCount++;
            continue;
          }

          await api.post(`/products/pending/${productId}/approve-schedule`, {
            affiliate_link: product.original_link,
            shorten_link: false
          });
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      toast({
        title: "Processamento concluído",
        description: `${successCount} produtos agendados com IA${errorCount > 0 ? `, ${errorCount} com erro` : ''}`,
      });

      setSelectedProducts(new Set());
      fetchPendingProducts(pagination.page);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao processar produtos em lote",
        variant: "destructive"
      });
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchReject = async () => {
    if (selectedProducts.size === 0) {
      toast({
        title: "Aviso",
        description: "Selecione pelo menos um produto",
        variant: "default"
      });
      return;
    }

    setBatchProcessing(true);
    try {
      const productIds = Array.from(selectedProducts);
      let successCount = 0;
      let errorCount = 0;

      for (const productId of productIds) {
        try {
          await api.post(`/products/pending/${productId}/reject`, {
            reason: 'Rejeitado em lote pelo administrador'
          });
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      toast({
        title: "Processamento concluído",
        description: `${successCount} produtos rejeitados${errorCount > 0 ? `, ${errorCount} com erro` : ''}`,
      });

      setSelectedProducts(new Set());
      fetchPendingProducts(pagination.page);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao processar produtos em lote",
        variant: "destructive"
      });
    } finally {
      setBatchProcessing(false);
    }
  };

  // NOVO: Captura em lote
  const handleBatchCapture = async () => {
    if (!batchCaptureLinks.trim()) {
      toast({
        title: "Erro",
        description: "Cole pelo menos um link de afiliado",
        variant: "destructive"
      });
      return;
    }

    // Extrair URLs (uma por linha)
    const urls = batchCaptureLinks
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.startsWith('http'));

    if (urls.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhuma URL válida encontrada",
        variant: "destructive"
      });
      return;
    }

    if (urls.length > 50) {
      toast({
        title: "Erro",
        description: "Máximo de 50 links por vez",
        variant: "destructive"
      });
      return;
    }

    setBatchCapturing(true);
    setBatchCaptureProgress({ current: 0, total: urls.length });
    setBatchCaptureResults(null);

    try {
      toast({
        title: "Iniciando captura...",
        description: `Processando ${urls.length} links`,
      });

      const response = await api.post('/products/batch-capture', { urls });
      const results = response.data.data;

      setBatchCaptureResults(results);
      setBatchCaptureProgress({ current: results.total, total: results.total });

      toast({
        title: "Captura concluída!",
        description: `${results.success} produtos capturados, ${results.failed} falhas`,
      });

      // Recarregar lista de produtos pendentes
      fetchPendingProducts(pagination.page);

    } catch (error) {
      console.error('Erro na captura em lote:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Falha na captura em lote",
        variant: "destructive"
      });
    } finally {
      setBatchCapturing(false);
    }
  };

  const handleCloseBatchCaptureDialog = () => {
    setIsBatchCaptureDialogOpen(false);
    setBatchCaptureLinks('');
    setBatchCaptureResults(null);
    setBatchCaptureProgress({ current: 0, total: 0 });
  };

  const handleApprove = async (shouldShorten = false) => {
    if (!affiliateLink || !affiliateLink.trim()) {
      toast({
        title: "Erro",
        description: "Link de afiliado é obrigatório",
        variant: "destructive"
      });
      return;
    }

    // Validar URL
    try {
      new URL(affiliateLink.trim());
    } catch {
      toast({
        title: "Erro",
        description: "Link de afiliado inválido",
        variant: "destructive"
      });
      return;
    }

    if (shouldShorten) {
      setShortening(true);
    } else {
      setApproving(true);
    }

    try {
      const payload = {
        affiliate_link: affiliateLink.trim(),
        shorten_link: shouldShorten
      };

      // Adicionar cupom se selecionado
      if (selectedCouponId) {
        payload.coupon_id = selectedCouponId;
      }

      // Adicionar categoria se selecionada
      if (selectedCategoryId) {
        payload.category_id = selectedCategoryId;
      }

      // Adicionar preços editados
      if (editableCurrentPrice && !isNaN(parseFloat(editableCurrentPrice))) {
        payload.current_price = parseFloat(editableCurrentPrice);
      }
      if (editableOldPrice && !isNaN(parseFloat(editableOldPrice))) {
        payload.old_price = parseFloat(editableOldPrice);
      }

      if (shouldShorten) {
        toast({
          title: "Encurtando link...",
          description: "Aguarde enquanto o link é encurtado e o produto é publicado.",
        });
      }

      const response = await api.post(`/products/pending/${selectedProduct.id}/approve`, payload);

      toast({
        title: "Sucesso",
        description: shouldShorten
          ? "Link encurtado e produto publicado com sucesso!"
          : "Produto aprovado e publicado com sucesso!",
      });

      // Recarregar lista
      fetchPendingProducts(pagination.page);
      handleCloseApprovalDialog();
    } catch (error) {
      console.error('❌ Erro ao aprovar produto:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Falha ao aprovar produto",
        variant: "destructive"
      });
    } finally {
      setApproving(false);
      setShortening(false);
    }
  };

  // Aprovar e agendar com IA - a IA define o melhor horário para publicar
  const handleApproveAndSchedule = async () => {
    if (!affiliateLink || !affiliateLink.trim()) {
      toast({
        title: "Erro",
        description: "Link de afiliado é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setScheduling(true);
    try {
      const payload = {
        affiliate_link: affiliateLink.trim(),
        shorten_link: false
      };

      if (selectedCouponId) {
        payload.coupon_id = selectedCouponId;
      }

      if (selectedCategoryId) {
        payload.category_id = selectedCategoryId;
      }

      toast({
        title: "Agendando com IA...",
        description: "A IA está analisando o melhor horário para publicar este produto.",
      });

      const response = await api.post(`/products/pending/${selectedProduct.id}/approve-schedule`, payload);

      toast({
        title: "Produto Agendado! 📅",
        description: response.data?.data?.message || "A IA definiu o melhor horário. Verifique em Agendamentos IA.",
      });

      // Recarregar lista
      fetchPendingProducts(pagination.page);
      handleCloseApprovalDialog();
    } catch (error) {
      console.error('❌ Erro ao agendar produto:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Falha ao agendar produto com IA",
        variant: "destructive"
      });
    } finally {
      setScheduling(false);
    }
  };

  // NOVO: Aprovar SEM publicar (apenas aprovar e aparecer no app)
  const handleApproveOnly = async () => {
    if (!affiliateLink || !affiliateLink.trim()) {
      toast({
        title: "Erro",
        description: "Link de afiliado é obrigatório",
        variant: "destructive"
      });
      return;
    }

    // Validar URL
    try {
      new URL(affiliateLink.trim());
    } catch {
      toast({
        title: "Erro",
        description: "Link de afiliado inválido",
        variant: "destructive"
      });
      return;
    }

    setApprovingOnly(true);
    try {
      const payload = {
        affiliate_link: affiliateLink.trim(),
        shorten_link: false
      };

      // Adicionar cupom se selecionado
      if (selectedCouponId) {
        payload.coupon_id = selectedCouponId;
      }

      // Adicionar categoria se selecionada
      if (selectedCategoryId) {
        payload.category_id = selectedCategoryId;
      }

      // Adicionar preços editados
      if (editableCurrentPrice && !isNaN(parseFloat(editableCurrentPrice))) {
        payload.current_price = parseFloat(editableCurrentPrice);
      }
      if (editableOldPrice && !isNaN(parseFloat(editableOldPrice))) {
        payload.old_price = parseFloat(editableOldPrice);
      }

      const response = await api.post(`/products/pending/${selectedProduct.id}/approve-only`, payload);

      toast({
        title: "Produto Aprovado! ✅",
        description: "Produto aprovado! Ele aparecerá no app mas não foi publicado nos canais.",
        variant: "success"
      });

      // Recarregar lista
      fetchPendingProducts(pagination.page);
      handleCloseApprovalDialog();
    } catch (error) {
      console.error('❌ Erro ao aprovar produto:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Falha ao aprovar produto",
        variant: "destructive"
      });
    } finally {
      setApprovingOnly(false);
    }
  };

  const handleOpenRejectDialog = (product) => {
    setSelectedProduct(product);
    setRejectReason('');
    setIsRejectDialogOpen(true);
  };

  const handleCloseRejectDialog = () => {
    setIsRejectDialogOpen(false);
    setSelectedProduct(null);
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!selectedProduct) return;

    setRejecting(true);
    try {
      await api.post(`/products/pending/${selectedProduct.id}/reject`, {
        reason: rejectReason.trim() || 'Produto rejeitado pelo administrador'
      });

      toast({
        title: "Sucesso",
        description: "Produto rejeitado com sucesso!",
      });

      // Recarregar lista
      fetchPendingProducts(pagination.page);
      handleCloseRejectDialog();
    } catch (error) {
      console.error('❌ Erro ao rejeitar produto:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Falha ao rejeitar produto",
        variant: "destructive"
      });
    } finally {
      setRejecting(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos Pendentes</h1>
          <p className="text-muted-foreground mt-1">
            Aprove produtos capturados automaticamente antes de publicá-los
          </p>
        </div>
        <Button
          onClick={() => setIsBatchCaptureDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Captura em Lote
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              {showAdvancedFilters ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
              Filtros Avançados
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="platform">Plataforma</Label>
              <select
                id="platform"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="all">Todas</option>
                <option value="mercadolivre">Mercado Livre</option>
                <option value="shopee">Shopee</option>
                <option value="amazon">Amazon</option>
                <option value="aliexpress">AliExpress</option>
                <option value="kabum">Kabum</option>
                <option value="magazineluiza">Magazine Luiza</option>
                <option value="pichau">Pichau</option>
              </select>
            </div>
            {showAdvancedFilters && (
              <>
                <div className="w-48">
                  <Label htmlFor="category">Categoria</Label>
                  <select
                    id="category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="all">Todas</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-48">
                  <Label htmlFor="min_discount">Desconto Mín. (%)</Label>
                  <Input
                    id="min_discount"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Ex: 20"
                    value={minDiscountFilter}
                    onChange={(e) => setMinDiscountFilter(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Produtos Pendentes ({pagination.total})</CardTitle>
              <CardDescription>
                {pagination.total} produtos aguardando aprovação
                {selectedProducts.size > 0 && ` • ${selectedProducts.size} selecionado(s)`}
              </CardDescription>
            </div>
            {selectedProducts.size > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsBatchApprovalDialogOpen(true)}
                  disabled={batchProcessing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar Selecionados ({selectedProducts.size})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchReject}
                  disabled={batchProcessing}
                >
                  {batchProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeitar Selecionados ({selectedProducts.size})
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum produto pendente encontrado
            </div>
          ) : (
            <>
              {/* Mobile Options Modal */}
              {isMobile && selectedMobileProduct && (
                <Dialog open={isMobileOptionsOpen} onOpenChange={setIsMobileOptionsOpen}>
                  <DialogContent className="w-[95vw] rounded-xl p-4 sm:max-w-md">
                    <DialogHeader className="text-left mb-4">
                      <DialogTitle className="text-base line-clamp-2 leading-tight">
                        {selectedMobileProduct.ai_optimized_title || selectedMobileProduct.name}
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        Escolha uma ação para este produto pendente
                      </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start h-12 text-green-600 bg-green-50 border-green-200"
                        onClick={() => {
                          setIsMobileOptionsOpen(false);
                          handleOpenApprovalDialog(selectedMobileProduct);
                        }}
                      >
                        <CheckCircle className="mr-3 h-5 w-5" />
                        Aprovar Produto
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full justify-start h-12 text-red-600 bg-red-50 border-red-200"
                        onClick={() => {
                          setIsMobileOptionsOpen(false);
                          handleOpenRejectDialog(selectedMobileProduct);
                        }}
                      >
                        <XCircle className="mr-3 h-5 w-5" />
                        Rejeitar (Excluir)
                      </Button>

                      {selectedMobileProduct.platform_url && (
                        <Button
                          variant="outline"
                          className="w-full justify-start h-12 text-black bg-gray-50 dark:bg-gray-900 dark:text-gray-100"
                          asChild
                        >
                          <a href={selectedMobileProduct.platform_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-3 h-5 w-5 text-gray-500" />
                            Abrir Link na Loja
                          </a>
                        </Button>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Tabela de Produtos Pendentes para Desktop OU Lista de Cards para Mobile */}
              {!isMobile ? (
                <div className="overflow-x-auto -mx-0 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleSelectAll}
                            className={`h-8 w-8 p-0 ${selectedProducts.size === products.length && products.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}
                          >
                            {selectedProducts.size === products.length && products.length > 0 ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>Imagem</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Plataforma</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead>Desconto</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id} className={selectedProducts.has(product.id) ? 'bg-muted/50' : ''}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleProductSelection(product.id)}
                              className={`h-8 w-8 p-0 ${selectedProducts.has(product.id) ? 'text-primary' : 'text-muted-foreground'}`}
                            >
                              {selectedProducts.has(product.id) ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <img
                              src={product.image_url || 'https://via.placeholder.com/50'}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          </TableCell>
                          <TableCell className="font-medium max-w-[300px]">
                            <div className="truncate" title={product.name}>
                              {product.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <PlatformLogo platform={product.platform} size={16} />
                          </TableCell>
                          <TableCell>
                            {product.category_name ? (
                              <Badge variant="outline" className="text-xs">
                                {product.category_icon && <span className="mr-1">{product.category_icon}</span>}
                                {product.category_name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sem categoria</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-semibold">
                                {formatPrice(product.final_price || product.current_price)}
                                {product.final_price && product.final_price < product.current_price && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Com cupom
                                  </Badge>
                                )}
                              </div>
                              {product.old_price && (
                                <div className="text-sm text-muted-foreground line-through">
                                  {formatPrice(product.old_price)}
                                </div>
                              )}
                              {product.final_price && product.final_price < product.current_price && (
                                <div className="text-xs text-muted-foreground">
                                  Sem cupom: {formatPrice(product.current_price)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.discount_percentage > 0 && (
                              <Badge variant="destructive">
                                {product.discount_percentage}% OFF
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(product.created_at).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(product.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenApprovalDialog(product)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Aprovar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleOpenRejectDialog(product)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Rejeitar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col space-y-3 px-2">
                  {/* Select All Checkbox for Mobile */}
                  {products.length > 0 && (
                    <div className="flex items-center gap-2 px-1 mb-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSelectAll}
                        className={`p-1 h-auto text-xs flex gap-2 ${selectedProducts.size === products.length ? 'text-primary' : 'text-muted-foreground'}`}
                      >
                        {selectedProducts.size === products.length ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                        Selecionar Todos
                      </Button>
                    </div>
                  )}
                  {products.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 border rounded-lg bg-gray-50">
                      Nenhum produto pendente
                    </div>
                  ) : (
                    products.map((product) => (
                      <Card
                        key={product.id}
                        className={`overflow-hidden cursor-pointer transition-colors active:bg-gray-100 ${selectedProducts.has(product.id) ? 'border-primary ring-1 ring-primary' : ''}`}
                        onClick={(e) => {
                          // Prevent opening modal if clicking the checkbox wrapper/button
                          if (e.target.closest('button.select-btn')) return;
                          setSelectedMobileProduct(product);
                          setIsMobileOptionsOpen(true);
                        }}
                      >
                        <div className="p-3 flex gap-3">
                          <div className="pt-1 select-btn">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleProductSelection(product.id);
                              }}
                              className={`h-6 w-6 p-0 ${selectedProducts.has(product.id) ? 'text-primary' : 'text-muted-foreground'}`}
                            >
                              {selectedProducts.has(product.id) ? (
                                <CheckSquare className="h-5 w-5 pointer-events-none" />
                              ) : (
                                <Square className="h-5 w-5 pointer-events-none" />
                              )}
                            </Button>
                          </div>
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-16 h-16 rounded-md object-cover border border-gray-100 flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="font-semibold text-sm line-clamp-2 leading-tight">
                                {product.ai_optimized_title || product.name}
                              </div>
                              <PlatformLogo platform={product.platform} size={16} />
                            </div>

                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="font-bold text-green-600 text-sm">
                                R$ {parseFloat(product.final_price || product.current_price).toFixed(2)}
                              </span>
                              {product.old_price && product.old_price > (product.final_price || product.current_price) && (
                                <span className="text-xs text-muted-foreground line-through">
                                  R$ {parseFloat(product.old_price).toFixed(2)}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1 mt-1">
                              {product.discount_percentage > 0 && (
                                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                                  -{product.discount_percentage}% OFF
                                </Badge>
                              )}
                              {product.category_name && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                  {product.category_icon && <span className="mr-1">{product.category_icon}</span>}
                                  {product.category_name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {pagination.totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={fetchPendingProducts}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Aprovação */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aprovar Produto</DialogTitle>
            <DialogDescription>
              Revise as informações do produto e forneça o link de afiliado convertido
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              {/* Informações do Produto */}
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                <div className={`${isMobile ? 'h-32 bg-gray-50 border rounded-lg p-2 flex items-center justify-center' : ''}`}>
                  <img
                    src={selectedProduct.image_url || 'https://via.placeholder.com/300'}
                    alt={selectedProduct.name}
                    className={`${isMobile ? 'max-h-full max-w-full object-contain rounded' : 'w-full h-64 object-cover rounded-lg'}`}
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <Label>Nome</Label>
                    <p className="font-semibold">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <Label>Plataforma</Label>
                    <div>
                      <PlatformLogo platform={selectedProduct.platform} size={18} />
                    </div>
                  </div>
                  <div>
                    <Label>Preço</Label>
                    <div>
                      <div className="font-semibold text-lg">
                        {formatPrice(selectedProduct.current_price)}
                      </div>
                      {selectedProduct.old_price && (
                        <div className="text-sm text-muted-foreground line-through">
                          {formatPrice(selectedProduct.old_price)}
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedProduct.discount_percentage > 0 && (
                    <div>
                      <Label>Desconto</Label>
                      <div>
                        <Badge variant="destructive" className="text-lg">
                          {selectedProduct.discount_percentage}% OFF
                        </Badge>
                      </div>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="edit-category">Categoria</Label>
                    <select
                      id="edit-category"
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
                    >
                      <option value="">Sem categoria</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Seleção de Cupom */}
              <div>
                <Label htmlFor="coupon">Cupom (opcional)</Label>
                {loadingCoupons ? (
                  <div className="text-sm text-muted-foreground py-2">Carregando cupons...</div>
                ) : (
                  <select
                    id="coupon"
                    value={selectedCouponId}
                    onChange={(e) => {
                      setSelectedCouponId(e.target.value);
                      if (e.target.value && selectedProduct) {
                        calculateFinalPrice(selectedProduct, e.target.value);
                      } else {
                        setFinalPrice(null);
                      }
                    }}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">Nenhum cupom</option>
                    {availableCoupons.map(coupon => {
                      const discountText = coupon.discount_type === 'percentage'
                        ? `${coupon.discount_value}% OFF`
                        : `R$ ${coupon.discount_value.toFixed(2)} OFF`;
                      return (
                        <option key={coupon.id} value={coupon.id}>
                          {coupon.code} - {discountText}
                          {coupon.min_purchase > 0 ? ` (Compra mín: ${formatPrice(coupon.min_purchase)})` : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Selecione um cupom para aplicar desconto adicional ao produto
                </p>

                {/* Preço Final com Cupom */}
                {finalPrice !== null && selectedProduct && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                    <Label className="text-green-800 dark:text-green-200">Preço Final com Cupom</Label>
                    <div className="space-y-1 mt-1">
                      <div className="flex items-baseline gap-2">
                        <div className="text-sm text-muted-foreground line-through">
                          {formatPrice(selectedProduct.current_price)}
                        </div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatPrice(finalPrice)}
                        </div>
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">
                        Economia adicional: {formatPrice(selectedProduct.current_price - finalPrice)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Editar Preços */}
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2'}`}>
                <div>
                  <Label htmlFor="current_price">Preço Atual (R$)</Label>
                  <Input
                    id="current_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editableCurrentPrice}
                    onChange={(e) => setEditableCurrentPrice(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Preço final do produto
                  </p>
                </div>
                <div>
                  <Label htmlFor="old_price">Preço Anterior (R$)</Label>
                  <Input
                    id="old_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editableOldPrice}
                    onChange={(e) => setEditableOldPrice(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Preço antes do desconto
                  </p>
                </div>
              </div>

              {/* Link Original */}
              <div>
                <Label htmlFor="original_link">Link Original</Label>
                <div className="flex gap-2">
                  <Input
                    id="original_link"
                    value={selectedProduct.original_link || selectedProduct.affiliate_link || ''}
                    readOnly
                    className="bg-muted"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const link = selectedProduct.original_link || selectedProduct.affiliate_link || '';
                      if (link) {
                        window.open(link, '_blank');
                      }
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Acesse este link para gerar o link de afiliado convertido
                </p>
              </div>

              {/* Link de Afiliado */}
              <div>
                <Label htmlFor="affiliate_link">Link de Afiliado *</Label>
                <div className="flex gap-2">
                  <Input
                    id="affiliate_link"
                    value={affiliateLink}
                    onChange={(e) => setAffiliateLink(e.target.value)}
                    placeholder="Cole o link de afiliado convertido aqui"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setAffiliateLink(text);
                          toast({
                            title: "Link colado!",
                            description: "Link de afiliado colado do clipboard",
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Erro",
                          description: "Não foi possível acessar o clipboard. Cole manualmente (Ctrl+V)",
                          variant: "destructive"
                        });
                      }
                    }}
                    title="Colar link do clipboard"
                  >
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cole o link de afiliado gerado a partir do link original
                </p>
              </div>

              {/* Informação sobre Modo de Template */}
              <div className="p-3 bg-muted rounded-md border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Modo de Template Ativo</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedCouponId
                        ? 'Este produto será enviado usando o template de "Promoção + Cupom"'
                        : 'Este produto será enviado usando o template de "Nova Promoção"'}
                    </p>
                  </div>
                  <Badge className={getTemplateModeInfo(!!selectedCouponId).color}>
                    {getTemplateModeInfo(!!selectedCouponId).icon} {getTemplateModeInfo(!!selectedCouponId).label}
                  </Badge>
                </div>
                {getTemplateModeInfo(!!selectedCouponId).label === 'IA ADVANCED' && (
                  <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs text-purple-800 dark:text-purple-200">
                    <Brain className="h-3 w-3 inline mr-1" />
                    A IA irá gerar o template automaticamente baseado no produto e contexto
                  </div>
                )}
              </div>

            </div>
          )}

          <DialogFooter className={`flex-wrap gap-2 mt-4 ${isMobile ? 'flex-col sm:flex-row' : ''}`}>
            {/* Botão Cancelar */}
            {!isMobile && (
              <Button
                variant="outline"
                onClick={handleCloseApprovalDialog}
                disabled={approving || shortening || scheduling || approvingOnly}
              >
                Cancelar
              </Button>
            )}

            <div className={`flex gap-2 ${isMobile ? 'flex-col w-full' : ''}`}>
              {/* Botão Encurtar Link */}
              <Button
                variant="outline"
                onClick={() => handleApprove(true)}
                disabled={approving || shortening || scheduling || approvingOnly || !affiliateLink.trim()}
                className={isMobile ? 'w-full mb-1' : ''}
              >
                {shortening ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Encurtando...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Encurtar + Publicar
                  </>
                )}
              </Button>

              {/* Botão Aprovar (SEM publicar) - Verde */}
              <Button
                variant="outline"
                className={`bg-green-50 hover:bg-green-100 text-green-700 border-green-300 ${isMobile ? 'w-full mb-1' : ''}`}
                onClick={handleApproveOnly}
                disabled={approving || shortening || scheduling || approvingOnly || !affiliateLink.trim()}
              >
                {approvingOnly ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aprovando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar
                  </>
                )}
              </Button>

              {/* Botão Principal: Aprovar e Publicar */}
              <Button
                variant="default"
                onClick={() => handleApprove(false)}
                disabled={approving || shortening || scheduling || approvingOnly || !affiliateLink.trim()}
                className={isMobile ? 'w-full mb-1' : ''}
              >
                {approving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Aprovar e Publicar
                  </>
                )}
              </Button>

              {/* Botão IA Agendar - Roxo */}
              <Button
                variant="default"
                className={`bg-purple-600 hover:bg-purple-700 ${isMobile ? 'w-full mb-1' : ''}`}
                onClick={handleApproveAndSchedule}
                disabled={approving || shortening || scheduling || approvingOnly || !affiliateLink.trim()}
              >
                {scheduling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    IA Agendar
                  </>
                )}
              </Button>
            </div>

            {isMobile && (
              <Button
                variant="outline"
                onClick={handleCloseApprovalDialog}
                disabled={approving || shortening || scheduling || approvingOnly}
                className="w-full mt-2"
              >
                Cancelar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Rejeição */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rejeitar Produto</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja rejeitar este produto? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <img
                  src={selectedProduct.image_url || 'https://via.placeholder.com/100'}
                  alt={selectedProduct.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{selectedProduct.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getPlatformName(selectedProduct.platform)}
                  </p>
                  <p className="text-lg font-bold mt-2">
                    {formatPrice(selectedProduct.current_price)}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="reject_reason">Motivo da Rejeição (opcional)</Label>
                <Input
                  id="reject_reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Digite o motivo da rejeição..."
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseRejectDialog}
              disabled={rejecting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejecting}
            >
              {rejecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejeitando...
                </>
              ) : (
                'Confirmar Rejeição'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Captura em Lote */}
      <Dialog open={isBatchCaptureDialogOpen} onOpenChange={setIsBatchCaptureDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Captura em Lote de Produtos</DialogTitle>
            <DialogDescription>
              Cole múltiplos links de afiliado (um por linha) para capturar vários produtos de uma vez
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!batchCaptureResults ? (
              <>
                <div>
                  <Label htmlFor="batch_links">Links de Afiliado</Label>
                  <textarea
                    id="batch_links"
                    value={batchCaptureLinks}
                    onChange={(e) => setBatchCaptureLinks(e.target.value)}
                    placeholder="Cole os links aqui, um por linha&#10;&#10;Exemplo:&#10;https://shopee.com.br/produto1&#10;https://mercadolivre.com.br/produto2&#10;https://amazon.com.br/produto3"
                    className="w-full h-64 px-3 py-2 rounded-md border border-input bg-background resize-none font-mono text-sm"
                    disabled={batchCapturing}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Máximo de 50 links por vez. Plataformas suportadas: Shopee, Mercado Livre, Amazon, AliExpress, Kabum, Magazine Luiza, Pichau
                  </p>
                </div>

                {batchCapturing && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <div className="flex-1">
                        <p className="font-semibold text-blue-900 dark:text-blue-100">
                          Capturando produtos...
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {batchCaptureProgress.current} de {batchCaptureProgress.total} processados
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {batchCaptureResults.total}
                    </div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {batchCaptureResults.success}
                    </div>
                    <div className="text-sm text-muted-foreground">Sucesso</div>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {batchCaptureResults.failed}
                    </div>
                    <div className="text-sm text-muted-foreground">Falhas</div>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Status</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchCaptureResults.results.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {result.success ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-xs truncate">
                            {result.url}
                          </TableCell>
                          <TableCell>
                            {result.success ? (
                              <div className="text-sm">
                                <div className="font-semibold text-green-600">
                                  {result.product.name.substring(0, 50)}...
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {getPlatformName(result.product.platform)} • R$ {result.product.current_price.toFixed(2)}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-red-600">
                                {result.error}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {!batchCaptureResults ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCloseBatchCaptureDialog}
                  disabled={batchCapturing}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleBatchCapture}
                  disabled={batchCapturing || !batchCaptureLinks.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {batchCapturing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Capturando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Iniciar Captura
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={handleCloseBatchCaptureDialog}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Aprovação em Lote */}
      <Dialog open={isBatchApprovalDialogOpen} onOpenChange={setIsBatchApprovalDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Aprovar Produtos em Lote</DialogTitle>
            <DialogDescription className="text-sm">
              Escolha como deseja aprovar os {selectedProducts.size} produtos selecionados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Opção 1: Aprovar e Publicar */}
            <Button
              variant="default"
              className="w-full h-auto py-4 px-4 flex flex-col items-start gap-2 bg-red-500 hover:bg-red-600 text-white"
              onClick={handleBatchApproveAndPublish}
              disabled={batchProcessing}
            >
              <div className="flex items-center gap-3 w-full">
                <Zap className="h-5 w-5 flex-shrink-0" />
                <span className="font-semibold text-base">Aprovar e Publicar</span>
              </div>
              <span className="text-xs text-left text-white/90 font-normal leading-relaxed pl-8">
                Aprova os produtos e publica imediatamente nos canais configurados
              </span>
            </Button>

            {/* Opção 2: Aprovar (sem publicar) */}
            <Button
              variant="outline"
              className="w-full h-auto py-4 px-4 flex flex-col items-start gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-2 border-green-300"
              onClick={handleBatchApproveOnly}
              disabled={batchProcessing}
            >
              <div className="flex items-center gap-3 w-full">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <span className="font-semibold text-base">Aprovar</span>
              </div>
              <span className="text-xs text-left text-green-700/90 font-normal leading-relaxed pl-8">
                Apenas aprova os produtos. Eles aparecerão no app mas não serão publicados
              </span>
            </Button>

            {/* Opção 3: IA Agenda */}
            <Button
              variant="default"
              className="w-full h-auto py-4 px-4 flex flex-col items-start gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleBatchSchedule}
              disabled={batchProcessing}
            >
              <div className="flex items-center gap-3 w-full">
                <Calendar className="h-5 w-5 flex-shrink-0" />
                <span className="font-semibold text-base">IA Agenda</span>
              </div>
              <span className="text-xs text-left text-white/90 font-normal leading-relaxed pl-8">
                A IA define o melhor horário para publicar cada produto
              </span>
            </Button>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsBatchApprovalDialogOpen(false)}
              disabled={batchProcessing}
              className="w-full"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}






