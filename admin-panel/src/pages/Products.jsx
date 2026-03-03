import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash2, Search, ExternalLink, Sparkles, Brain, Zap, Loader2, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';
import { Pagination } from '../components/ui/Pagination';
import { PlatformLogo, getPlatformName } from '../utils/platformLogos.jsx';
import { useIsMobile } from '../hooks/useMediaQuery';

export default function Products() {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [analyzingLink, setAnalyzingLink] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0
  });

  const [selectedIds, setSelectedIds] = useState([]);
  const [processingActions, setProcessingActions] = useState({
    deleting: new Set(),
    submitting: false,
    analyzing: false,
    batchDeleting: false,
    scheduling: false,
    republishing: false,
    autoRepublishing: false
  });

  // Estados para republicação automática
  const [autoRepublishEnabled, setAutoRepublishEnabled] = useState(false);
  const [loadingAutoRepublishStatus, setLoadingAutoRepublishStatus] = useState(true);

  const [isRepublishDialogOpen, setIsRepublishDialogOpen] = useState(false);
  const [republishingProduct, setRepublishingProduct] = useState(null);
  const [republishFormData, setRepublishFormData] = useState({
    coupon_id: ''
  });

  const isMobile = useIsMobile();
  const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);
  const [selectedMobileProduct, setSelectedMobileProduct] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discount_price: '',
    affiliate_url: '',
    image_url: '',
    category_id: '',
    coupon_id: '',
    platform: 'shopee'
  });

  // Filtrar cupons ativos da plataforma selecionada
  // Usar useMemo para recalcular apenas quando coupons ou formData.platform mudarem
  const filteredCoupons = coupons.filter(coupon => {
    // Verificar se está ativo
    if (!coupon.is_active) return false;

    // Verificar se não expirou
    if (coupon.valid_until) {
      const validUntil = new Date(coupon.valid_until);
      const now = new Date();
      if (validUntil < now) return false;
    }

    // Verificar se é da plataforma selecionada ou geral
    const selectedPlatform = formData.platform || 'shopee';
    return coupon.platform === selectedPlatform || coupon.platform === 'general';
  });

  const [templateModes, setTemplateModes] = useState({
    new_promotion: 'custom',
    promotion_with_coupon: 'custom'
  });

  useEffect(() => {
    fetchProducts(1);
    fetchCategories();
    fetchCoupons();
    loadTemplateModes();
    loadAutoRepublishStatus();
  }, []);

  // Limpar cupom selecionado quando a plataforma mudar e o cupom não for compatível
  useEffect(() => {
    if (formData.coupon_id && formData.platform) {
      const selectedCoupon = coupons.find(c => c.id === formData.coupon_id);
      if (selectedCoupon) {
        const isCompatible = selectedCoupon.platform === formData.platform || selectedCoupon.platform === 'general';
        const isActive = selectedCoupon.is_active && (!selectedCoupon.valid_until || new Date(selectedCoupon.valid_until) > new Date());

        if (!isCompatible || !isActive) {
          setFormData(prev => ({ ...prev, coupon_id: '' }));
        }
      }
    }
  }, [formData.platform, coupons, formData.coupon_id]);

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

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      setSelectedIds([]); // Clear selection when changing view/page
      // Incluir parâmetro search se houver
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
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await api.get('/products', { params });

      const { products, totalPages, total } = response.data.data;

      setProducts(products || []);
      setPagination(prev => ({
        ...prev,
        page,
        totalPages: totalPages || 1,
        total: total || 0
      }));

    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar produtos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Debounce search e filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, platformFilter, categoryFilter, statusFilter]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      // A API retorna { success: true, data: [...] }
      // Então response.data = { success: true, data: [...] }
      // E response.data.data = array de categorias
      let categoriesData = [];

      if (response.data?.success && response.data?.data) {
        // Se response.data.data é um array, usar diretamente
        if (Array.isArray(response.data.data)) {
          categoriesData = response.data.data;
        }
        // Se response.data.data tem uma propriedade categories (fallback)
        else if (response.data.data.categories && Array.isArray(response.data.data.categories)) {
          categoriesData = response.data.data.categories;
        }
      } else if (Array.isArray(response.data)) {
        // Fallback: se response.data já é um array
        categoriesData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        // Fallback: se response.data.data é um array
        categoriesData = response.data.data;
      }

      // Filtrar apenas categorias ativas
      categoriesData = categoriesData.filter(cat => cat.is_active !== false);

      setCategories(categoriesData);
    } catch (error) {
      console.error('❌ Erro ao carregar categorias:', error);
      console.error('Resposta completa:', error.response?.data);
      setCategories([]);
    }
  };

  const fetchCoupons = async () => {
    try {
      const response = await api.get('/coupons');
      setCoupons(response.data.data.coupons || []);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
    }
  };

  // Carregar status da republicação automática
  const loadAutoRepublishStatus = async () => {
    try {
      setLoadingAutoRepublishStatus(true);
      const response = await api.get('/auto-republish/status');
      setAutoRepublishEnabled(response.data.data.enabled || false);
    } catch (error) {
      console.error('Erro ao carregar status de republicação automática:', error);
    } finally {
      setLoadingAutoRepublishStatus(false);
    }
  };

  // Alternar republicação automática
  const handleToggleAutoRepublish = async () => {
    try {
      const newState = !autoRepublishEnabled;
      const response = await api.post('/auto-republish/toggle', { enabled: newState });
      
      setAutoRepublishEnabled(newState);
      
      toast({
        title: newState ? "Republicação Automática Ativada! 🤖" : "Republicação Automática Desativada",
        description: newState 
          ? "A IA irá analisar e republicar produtos aprovados automaticamente"
          : "Republicação automática foi desativada",
        variant: "success",
      });
    } catch (error) {
      console.error('Erro ao alternar republicação automática:', error);
      toast({
        title: "Erro!",
        description: error.response?.data?.error || "Erro ao alterar configuração",
        variant: "destructive",
      });
    }
  };

  // Executar republicação automática manualmente
  const handleRunAutoRepublish = async () => {
    if (!autoRepublishEnabled) {
      toast({
        title: "Atenção!",
        description: "Ative a republicação automática primeiro",
        variant: "destructive",
      });
      return;
    }

    setProcessingActions(prev => ({ ...prev, autoRepublishing: true }));
    
    try {
      const response = await api.post('/auto-republish/run');
      const result = response.data.data;
      
      toast({
        title: "Republicação Automática Concluída! 🎉",
        description: result.message || `${result.scheduled} produtos agendados`,
        variant: "success",
      });

      // Recarregar produtos
      fetchProducts(pagination.page);
    } catch (error) {
      console.error('Erro ao executar republicação automática:', error);
      toast({
        title: "Erro!",
        description: error.response?.data?.error || "Erro ao executar republicação automática",
        variant: "destructive",
      });
    } finally {
      setProcessingActions(prev => ({ ...prev, autoRepublishing: false }));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente deletar este produto?')) return;

    setProcessingActions(prev => ({
      ...prev,
      deleting: new Set(prev.deleting).add(id)
    }));

    try {
      await api.delete(`/products/${id}`);

      // Atualizar lista mantendo a página atual
      fetchProducts(pagination.page);

      toast({
        title: "Sucesso!",
        description: "Produto deletado com sucesso.",
        variant: "success",
      });
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      toast({
        title: "Erro!",
        description: error.response?.data?.error || "Erro ao deletar produto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev.deleting);
        newSet.delete(id);
        return { ...prev, deleting: newSet };
      });
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.old_price || product.current_price,
      discount_price: product.old_price ? product.current_price : '',
      affiliate_url: product.affiliate_link || '',
      image_url: product.image_url || '',
      category_id: product.category_id || '',
      coupon_id: product.coupon_id || '',
      platform: product.platform || 'shopee'
    });
    setIsDialogOpen(true);
  };

  const handleRepublish = (product) => {
    setRepublishingProduct(product);
    setRepublishFormData({
      coupon_id: product.coupon_id || ''
    });
    setIsRepublishDialogOpen(true);
  };

  const handleRepublishSubmit = async () => {
    if (!republishingProduct) return;

    setProcessingActions(prev => ({ ...prev, republishing: true }));
    try {
      const response = await api.post(`/products/${republishingProduct.id}/republish`, {
        coupon_id: republishFormData.coupon_id || null
      });

      const { publishResult } = response.data.data;

      if (publishResult.success) {
        toast({
          title: "Sucesso!",
          description: "Produto republicado com sucesso.",
          variant: "success",
        });
        fetchProducts(pagination.page);
      } else {
        toast({
          title: "Aviso",
          description: response.data.message || "Produto atualizado, mas houve falha no envio para alguns canais.",
          variant: "warning",
        });
      }
      setIsRepublishDialogOpen(false);
    } catch (error) {
      console.error('Erro ao republicar produto:', error);
      toast({
        title: "Erro!",
        description: error.response?.data?.error || "Erro ao republicar produto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setProcessingActions(prev => ({ ...prev, republishing: false }));
    }
  };

  const handleAnalyzeLink = async () => {
    if (!formData.affiliate_url) {
      toast({
        title: "Atenção!",
        description: "Digite o link de afiliado primeiro.",
        variant: "destructive",
      });
      return;
    }

    // Validar URL básica
    try {
      new URL(formData.affiliate_url);
    } catch {
      toast({
        title: "URL Inválida",
        description: "Por favor, insira uma URL válida.",
        variant: "destructive",
      });
      return;
    }

    setAnalyzingLink(true);
    setProcessingActions(prev => ({ ...prev, analyzing: true }));
    try {
      const response = await api.post('/link-analyzer/analyze', {
        url: formData.affiliate_url
      });

      const productInfo = response.data.data || response.data;

      // Verificar se há erro na resposta
      if (productInfo.error) {
        toast({
          title: "Erro na Análise",
          description: productInfo.error || "Erro ao extrair informações do link",
          variant: "destructive",
        });
        setAnalyzingLink(false);
        return;
      }

      // Verificar se os dados essenciais estão presentes
      const hasName = productInfo.name && productInfo.name.trim().length > 0;
      const hasPrice = productInfo.currentPrice && productInfo.currentPrice > 0;

      if (!hasName && !hasPrice) {
        toast({
          title: "Aviso",
          description: "Não foi possível extrair informações do link. Tente novamente ou preencha manualmente.",
          variant: "destructive",
        });
        setAnalyzingLink(false);
        return;
      }

      // Verificar se há desconto real
      // oldPrice deve ser maior que currentPrice para haver desconto
      const hasDiscount = productInfo.oldPrice &&
        productInfo.oldPrice > 0 &&
        productInfo.currentPrice > 0 &&
        productInfo.oldPrice > productInfo.currentPrice;

      // Detectar categoria automaticamente baseado no nome do produto
      const detectedCategory = productInfo.name ? detectCategory(productInfo.name) : '';

      // Definir preços corretamente
      // price = preço original (sem desconto)
      // discount_price = preço com desconto (se houver)
      let priceOriginal = productInfo.currentPrice || 0; // Preço padrão (pode ser com ou sem desconto)
      let priceDiscount = ''; // Vazio por padrão

      if (hasDiscount) {
        // Se há desconto: oldPrice é o original, currentPrice é o com desconto
        priceOriginal = productInfo.oldPrice; // Preço original (antes do desconto)
        priceDiscount = productInfo.currentPrice; // Preço com desconto
      } else {
        // Se não há desconto: currentPrice é o preço normal (sem desconto)
        priceOriginal = productInfo.currentPrice || 0;
        priceDiscount = ''; // Sem desconto
      }

      // Preparar dados atualizados
      const updatedFormData = {
        ...formData,
        name: productInfo.name || formData.name || '',
        description: productInfo.description || formData.description || '',
        price: priceOriginal,
        discount_price: priceDiscount,
        image_url: productInfo.imageUrl || formData.image_url || '',
        platform: productInfo.platform || formData.platform || 'shopee',
        category_id: detectedCategory || formData.category_id || ''
      };

      setFormData(updatedFormData);

      // Mensagem de sucesso mais informativa
      const extractedFields = [];
      if (updatedFormData.name) extractedFields.push('nome');
      if (updatedFormData.price > 0) extractedFields.push('preço');
      if (updatedFormData.image_url) extractedFields.push('imagem');

      const successMessage = extractedFields.length > 0
        ? `Informações extraídas: ${extractedFields.join(', ')}`
        : 'Link processado';

      toast({
        title: "Sucesso!",
        description: `${successMessage}. Plataforma: ${productInfo.platform || 'Shopee'}`,
        variant: "success",
      });
    } catch (error) {
      console.error('❌ Erro ao analisar link:', error);
      console.error('❌ Resposta do erro:', error.response);

      const errorMessage = error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Erro ao analisar link. Verifique se o link está correto e tente novamente.";

      toast({
        title: "Erro na Análise",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setAnalyzingLink(false);
      setProcessingActions(prev => ({ ...prev, analyzing: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessingActions(prev => ({ ...prev, submitting: true }));
    try {
      // Função para converter preço string para número
      const parsePrice = (priceStr) => {
        if (!priceStr && priceStr !== 0) return null;
        if (typeof priceStr === 'number') return priceStr;
        const normalized = String(priceStr).replace(',', '.');
        const cleaned = normalized.replace(/[^\d.]/g, '');
        const number = parseFloat(cleaned);
        return isNaN(number) ? null : number;
      };

      // Converter campos do formulário para o formato esperado pelo backend
      const productData = {
        name: formData.name,
        image_url: formData.image_url,
        platform: formData.platform,
        current_price: parsePrice(formData.discount_price) || parsePrice(formData.price),
        old_price: formData.discount_price ? parsePrice(formData.price) : null,
        category_id: formData.category_id && formData.category_id.trim() !== '' ? formData.category_id : null,
        coupon_id: formData.coupon_id && formData.coupon_id.trim() !== '' ? formData.coupon_id : null,
        affiliate_link: formData.affiliate_url,
        stock_available: true
      };

      if (!editingProduct) {
        const externalId = `${formData.platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        productData.external_id = externalId;
      }

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, productData);
        await fetchProducts(pagination.page);
        toast({
          title: "Sucesso!",
          description: "Produto atualizado com sucesso.",
          variant: "success",
        });
      } else {
        await api.post('/products', productData);
        await fetchProducts(1); // Voltar para primeira página ao criar
        toast({
          title: "Sucesso!",
          description: "Produto criado com sucesso.",
          variant: "success",
        });
      }
      setIsDialogOpen(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        discount_price: '',
        affiliate_url: '',
        image_url: '',
        category_id: '',
        coupon_id: '',
        platform: 'shopee'
      });
    } catch (error) {
      // ... existing error handling ...
      toast({
        title: "Erro!",
        description: "Erro ao salvar produto.",
        variant: "destructive",
      });
    } finally {
      setProcessingActions(prev => ({ ...prev, submitting: false }));
    }
  };

  // Novo método: Salvar SEM publicar
  const handleSaveOnly = async () => {
    setProcessingActions(prev => ({ ...prev, saving: true }));
    try {
      const parsePrice = (priceStr) => {
        if (!priceStr && priceStr !== 0) return null;
        if (typeof priceStr === 'number') return priceStr;
        const normalized = String(priceStr).replace(',', '.');
        const cleaned = normalized.replace(/[^\d.]/g, '');
        const number = parseFloat(cleaned);
        return isNaN(number) ? null : number;
      };

      const productData = {
        name: formData.name,
        image_url: formData.image_url,
        platform: formData.platform,
        current_price: parsePrice(formData.discount_price) || parsePrice(formData.price),
        old_price: formData.discount_price ? parsePrice(formData.price) : null,
        category_id: formData.category_id && formData.category_id.trim() !== '' ? formData.category_id : null,
        coupon_id: formData.coupon_id && formData.coupon_id.trim() !== '' ? formData.coupon_id : null,
        affiliate_link: formData.affiliate_url,
        stock_available: true,
        external_id: `${formData.platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      await api.post('/products/save', productData);
      await fetchProducts(1);
      toast({
        title: "Produto Salvo! 💾",
        description: "Produto salvo com sucesso! Ele aparecerá no app mas não foi publicado nos canais.",
        variant: "success",
      });
      setIsDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        price: '',
        discount_price: '',
        affiliate_url: '',
        image_url: '',
        category_id: '',
        coupon_id: '',
        platform: 'shopee'
      });
    } catch (error) {
      toast({
        title: "Erro!",
        description: "Erro ao salvar produto.",
        variant: "destructive",
      });
    } finally {
      setProcessingActions(prev => ({ ...prev, saving: false }));
    }
  };

  // Toggle selection
  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p.id));
    }
  };

  // Batch delete logic
  const handleBatchDelete = async () => {
    if (!confirm(`Deseja deletar ${selectedIds.length} produtos?`)) return;

    setProcessingActions(prev => ({ ...prev, batchDeleting: true }));
    try {
      await api.post('/products/batch-delete', { ids: selectedIds });
      setSelectedIds([]);
      fetchProducts(pagination.page);
      toast({
        title: "Sucesso!",
        description: "Produtos deletados com sucesso.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Erro!",
        description: "Erro ao deletar produtos em lote.",
        variant: "destructive",
      });
    } finally {
      setProcessingActions(prev => ({ ...prev, batchDeleting: false }));
    }
  };

  // Função para detectar categoria automaticamente
  const detectCategory = (productName) => {
    if (!productName) return '';
    const name = productName.toLowerCase();
    const categoryMap = {
      'eletrônicos': ['celular', 'smartphone', 'tablet', 'notebook', 'computador', 'fone', 'headphone', 'mouse', 'teclado', 'monitor', 'tv', 'televisão', 'camera', 'câmera'],
      'moda': ['camisa', 'camiseta', 'calça', 'shorts', 'vestido', 'saia', 'jaqueta', 'casaco', 'sapato', 'tênis', 'sandália', 'bota', 'roupa', 'blusa'],
      'casa': ['mesa', 'cadeira', 'sofá', 'cama', 'armário', 'estante', 'luminária', 'tapete', 'cortina', 'travesseiro', 'edredom', 'lençol'],
      'beleza': ['perfume', 'maquiagem', 'creme', 'shampoo', 'condicionador', 'hidratante', 'batom', 'base', 'esmalte'],
      'esportes': ['bola', 'raquete', 'bicicleta', 'esteira', 'haltere', 'peso', 'academia', 'fitness', 'yoga'],
      'livros': ['livro', 'revista', 'gibi', 'quadrinho', 'manga'],
      'brinquedos': ['boneca', 'carrinho', 'lego', 'quebra-cabeça', 'jogo', 'brinquedo'],
      'alimentos': ['chocolate', 'café', 'chá', 'biscoito', 'suco', 'refrigerante']
    };

    for (const [categoryName, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        const category = categories.find(cat =>
          cat.name.toLowerCase().includes(categoryName) ||
          categoryName.includes(cat.name.toLowerCase())
        );
        return category ? category.id : '';
      }
    }
    return '';
  };

  // Removido filteredProducts pois a filtragem é feita no backend agora
  // const filteredProducts = products; 

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Gerencie produtos ({pagination.total})
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Botões de Republicação Automática */}
          <div className="flex gap-2 items-center">
            <Button
              variant={autoRepublishEnabled ? "default" : "outline"}
              size="sm"
              onClick={handleToggleAutoRepublish}
              disabled={loadingAutoRepublishStatus}
              className={autoRepublishEnabled ? "bg-purple-600 hover:bg-purple-700" : ""}
            >
              {loadingAutoRepublishStatus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  {autoRepublishEnabled ? "IA Ativa" : "Ativar IA"}
                </>
              )}
            </Button>

            {autoRepublishEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunAutoRepublish}
                disabled={processingActions.autoRepublishing}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                {processingActions.autoRepublishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Republicar Agora
                  </>
                )}
              </Button>
            )}
          </div>

          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleBatchDelete}
              disabled={processingActions.batchDeleting}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processingActions.batchDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deletando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deletar ({selectedIds.length})
                </>
              )}
            </Button>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingProduct(null);
                setFormData({
                  name: '',
                  description: '',
                  price: '',
                  discount_price: '',
                  affiliate_url: '',
                  image_url: '',
                  category_id: '',
                  coupon_id: '',
                  platform: 'shopee'
                });
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Manter conteúdo original do Dialog (já está no código existente) - simplificado aqui para brevidade da diff */}
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados do produto abaixo
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campos do form copiados da versão original para não perder nada */}
                <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <Label htmlFor="affiliate_url" className="text-blue-900 dark:text-blue-100 font-semibold">
                    🔗 Link de Afiliado (Cole aqui para auto-preencher)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="affiliate_url"
                      type="url"
                      placeholder="https://shopee.com.br/... ou https://mercadolivre.com.br/... ou https://kabum.com.br/... ou https://magazineluiza.com.br/..."
                      value={formData.affiliate_url}
                      onChange={(e) => setFormData({ ...formData, affiliate_url: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleAnalyzeLink}
                      disabled={processingActions.analyzing || !formData.affiliate_url}
                      variant="secondary"
                      className="whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingActions.analyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Auto-Preencher
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Produto *</Label>
                    <Input id="name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Plataforma *</Label>
                    <select id="platform" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.platform} onChange={(e) => setFormData({ ...formData, platform: e.target.value })}>
                      <option value="shopee">Shopee</option>
                      <option value="mercadolivre">Mercado Livre</option>
                      <option value="amazon">Amazon</option>
                      <option value="aliexpress">AliExpress</option>
                      <option value="kabum">Kabum</option>
                      <option value="magazineluiza">Magazine Luiza</option>
                      <option value="pichau">Pichau</option>
                      <option value="general">Geral</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço Original *</Label>
                    <Input id="price" type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount_price">Preço com Desconto</Label>
                    <Input id="discount_price" type="number" step="0.01" value={formData.discount_price} onChange={(e) => setFormData({ ...formData, discount_price: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url">URL da Imagem</Label>
                  <Input id="image_url" type="url" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} />
                  {formData.image_url && (
                    <div className="mt-2">
                      <div className="text-sm text-muted-foreground mb-2">Preview:</div>
                      <div className="border rounded-lg p-2 bg-gray-50 dark:bg-gray-900">
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          className="max-w-full h-32 object-contain rounded"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div className="text-sm text-muted-foreground text-center py-4" style={{ display: 'none' }}>
                          Imagem não encontrada ou URL inválida
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Categoria</Label>
                    <select id="category_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
                      <option value="">Selecione uma categoria</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coupon_id">Cupom (Opcional)</Label>
                    <select id="coupon_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.coupon_id} onChange={(e) => setFormData({ ...formData, coupon_id: e.target.value })}>
                      <option value="">Nenhum cupom</option>
                      {filteredCoupons.length > 0 ? (
                        filteredCoupons.map(coupon => {
                          // Calcular desconto para exibição
                          let discountText = '';
                          if (coupon.discount_type === 'percentage') {
                            discountText = `${coupon.discount_value}% OFF`;
                          } else {
                            discountText = `R$ ${parseFloat(coupon.discount_value || 0).toFixed(2)} OFF`;
                          }

                          return (
                            <option key={coupon.id} value={coupon.id}>
                              {coupon.code} - {discountText}
                              {coupon.platform === 'general' ? ' (Geral)' : ''}
                            </option>
                          );
                        })
                      ) : (
                        <option value="" disabled>Nenhum cupom ativo disponível para {formData.platform || 'esta plataforma'}</option>
                      )}
                    </select>
                    {filteredCoupons.length === 0 && formData.platform && (
                      <p className="text-xs text-muted-foreground">
                        Não há cupons ativos para a plataforma "{formData.platform}". Selecione outra plataforma ou crie um novo cupom.
                      </p>
                    )}
                  </div>
                </div>

                {/* Informação sobre Modo de Template */}
                {!editingProduct && (
                  <div className="p-3 bg-muted rounded-md border">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-semibold">Modo de Template Ativo</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formData.coupon_id
                            ? 'Este produto será enviado usando o template de "Promoção + Cupom"'
                            : 'Este produto será enviado usando o template de "Nova Promoção"'}
                        </p>
                      </div>
                      <PlatformLogo platform={formData.coupon_id ? 'ai_advanced' : 'default'} size={18} />
                    </div>
                    {getTemplateModeInfo(!!formData.coupon_id).label === 'IA ADVANCED' && (
                      <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs text-purple-800 dark:text-purple-200">
                        <Brain className="h-3 w-3 inline mr-1" />
                        A IA irá gerar o template automaticamente baseado no produto e contexto
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter className="flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={processingActions.submitting || processingActions.scheduling || processingActions.saving}>Cancelar</Button>
                  {!editingProduct && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700"
                        disabled={processingActions.submitting || processingActions.scheduling || processingActions.saving || !formData.name || !formData.price}
                        onClick={handleSaveOnly}
                      >
                        {processingActions.saving ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                        ) : (
                          <>💾 Salvar</>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={processingActions.submitting || processingActions.scheduling || processingActions.saving || !formData.name || !formData.price}
                        onClick={async () => {
                          setProcessingActions(prev => ({ ...prev, scheduling: true }));
                          try {
                            const parsePrice = (priceStr) => {
                              if (!priceStr && priceStr !== 0) return null;
                              if (typeof priceStr === 'number') return priceStr;
                              const normalized = String(priceStr).replace(',', '.');
                              const cleaned = normalized.replace(/[^\d.]/g, '');
                              return parseFloat(cleaned) || null;
                            };
                            const productData = {
                              name: formData.name,
                              image_url: formData.image_url,
                              platform: formData.platform,
                              current_price: parsePrice(formData.discount_price) || parsePrice(formData.price),
                              old_price: formData.discount_price ? parsePrice(formData.price) : null,
                              category_id: formData.category_id?.trim() || null,
                              coupon_id: formData.coupon_id?.trim() || null,
                              affiliate_link: formData.affiliate_url,
                              stock_available: true,
                              external_id: `${formData.platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                              schedule_mode: true // Ativa modo agendamento com IA
                            };
                            const response = await api.post('/products', productData);
                            await fetchProducts(1);
                            toast({
                              title: "Produto Agendado! 📅",
                              description: response.data?.message || "A IA definiu o melhor horário. Verifique em Agendamentos.",
                            });
                            setIsDialogOpen(false);
                            setFormData({ name: '', description: '', price: '', discount_price: '', affiliate_url: '', image_url: '', category_id: '', coupon_id: '', platform: 'shopee' });
                          } catch (error) {
                            toast({ title: "Erro!", description: "Erro ao agendar produto.", variant: "destructive" });
                          } finally {
                            setProcessingActions(prev => ({ ...prev, scheduling: false }));
                          }
                        }}
                      >
                        {processingActions.scheduling ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Agendando...</>
                        ) : (
                          <><Calendar className="mr-2 h-4 w-4" />Criar + IA Agendar</>
                        )}
                      </Button>
                    </>
                  )}
                  <Button
                    type="submit"
                    disabled={processingActions.submitting || processingActions.scheduling || processingActions.saving}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingActions.submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingProduct ? 'Salvando...' : 'Criando...'}
                      </>
                    ) : (
                      editingProduct ? 'Salvar' : 'Criar e Publicar'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Card Informativo sobre Republicação Automática */}
      {autoRepublishEnabled && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                  Republicação Automática com IA Ativada
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  A IA está analisando produtos aprovados e criando uma estratégia inteligente de republicação. 
                  Os produtos serão distribuídos ao longo dos próximos dias em horários estratégicos para maximizar o alcance.
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-purple-600 dark:text-purple-400">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Prioriza melhores ofertas
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Distribui ao longo de 7 dias
                  </span>
                  <span className="flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    Evita repetições
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-3">
            {/* Título */}
            <div>
              <CardTitle className="text-base sm:text-lg">Lista de Produtos</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Página {pagination.page} de {pagination.totalPages}
              </CardDescription>
            </div>

            {/* Filtros Responsivos */}
            <div className="flex flex-col gap-2 sm:gap-3">
              {/* Busca */}
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>

              {/* Filtros em Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs sm:text-sm"
                >
                  <option value="all">Plataformas</option>
                  <option value="mercadolivre">ML</option>
                  <option value="shopee">Shopee</option>
                  <option value="amazon">Amazon</option>
                  <option value="aliexpress">Ali</option>
                  <option value="kabum">Kabum</option>
                  <option value="magazineluiza">Magalu</option>
                  <option value="pichau">Pichau</option>
                  <option value="general">Geral</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs sm:text-sm"
                >
                  <option value="all">Categorias</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs sm:text-sm col-span-2 sm:col-span-1"
                >
                  <option value="all">Status</option>
                  <option value="pending">Pendentes</option>
                  <option value="approved">Aprovados</option>
                  <option value="published">Publicados</option>
                  <option value="rejected">Rejeitados</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground text-sm">Carregando produtos...</div>
            </div>
          ) : (
            <>
              {/* Wrapper com scroll horizontal para mobile OU lista de cards no mobile */}
              {!isMobile ? (
                <div className="overflow-x-auto -mx-0 sm:mx-0">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 sm:w-12">
                          <input
                            type="checkbox"
                            className="translate-y-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-gray-300"
                            checked={products.length > 0 && selectedIds.length === products.length}
                            onChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="text-xs sm:text-sm">Produto</TableHead>
                        <TableHead className="text-xs sm:text-sm">Plataforma</TableHead>
                        <TableHead className="text-xs sm:text-sm">Preço</TableHead>
                        <TableHead className="text-xs sm:text-sm">Desconto</TableHead>
                        <TableHead className="text-xs sm:text-sm">Score</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhum produto encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                className="translate-y-0.5 w-4 h-4 rounded border-gray-300"
                                checked={selectedIds.includes(product.id)}
                                onChange={() => toggleSelection(product.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {product.image_url && (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                )}
                                <div>
                                  <div className="font-medium">
                                    {product.ai_optimized_title || product.name}
                                    {product.ai_optimized_title && (
                                      <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700">
                                        <Brain className="h-3 w-3 inline mr-1" />
                                        IA
                                      </Badge>
                                    )}
                                  </div>
                                  {product.ai_optimized_title && (
                                    <div className="text-xs text-muted-foreground line-through">
                                      {product.name}
                                    </div>
                                  )}
                                  {product.description && (
                                    <div className="text-sm text-muted-foreground line-clamp-1">
                                      {product.ai_generated_description || product.description}
                                    </div>
                                  )}
                                  {product.offer_priority && (
                                    <Badge
                                      variant="outline"
                                      className={`mt-1 text-xs ${product.offer_priority === 'high' ? 'bg-red-100 text-red-800' :
                                        product.offer_priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}
                                    >
                                      {product.offer_priority === 'high' ? '🔥 Alta' :
                                        product.offer_priority === 'medium' ? '⚡ Média' :
                                          '📌 Baixa'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <PlatformLogo platform={product.platform} size={16} />
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {product.old_price && product.old_price > (product.final_price || product.current_price) ? (
                                  <>
                                    <div className="font-medium text-green-600">
                                      R$ {parseFloat(product.final_price || product.current_price).toFixed(2)}
                                      {product.final_price && product.final_price < product.current_price && (
                                        <Badge variant="outline" className="ml-2 text-xs">
                                          Com cupom
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground line-through">
                                      R$ {parseFloat(product.old_price).toFixed(2)}
                                    </div>
                                    {product.final_price && product.final_price < product.current_price && (
                                      <div className="text-xs text-muted-foreground">
                                        Sem cupom: R$ {parseFloat(product.current_price).toFixed(2)}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="font-medium">
                                    R$ {parseFloat(product.final_price || product.current_price).toFixed(2)}
                                    {product.final_price && product.final_price < product.current_price && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        Com cupom
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {product.discount_percentage > 0 && (
                                <Badge variant="success">
                                  -{product.discount_percentage}%
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {product.offer_score !== null && product.offer_score !== undefined ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full ${product.offer_score >= 70
                                          ? 'bg-green-500'
                                          : product.offer_score >= 50
                                            ? 'bg-yellow-500'
                                            : 'bg-red-500'
                                          }`}
                                        style={{ width: `${product.offer_score}%` }}
                                      />
                                    </div>
                                  </div>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {product.offer_score.toFixed(0)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                              {product.is_featured_offer && (
                                <Badge variant="default" className="mt-1 text-xs bg-yellow-500 hover:bg-yellow-600">
                                  ⭐ Oferta do Dia
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {product.affiliate_url && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    asChild
                                  >
                                    <a href={product.affiliate_url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                                {(product.status === 'approved' || product.status === 'published') && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRepublish(product)}
                                    title="Republicar"
                                    className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                  >
                                    <Zap className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(product)}
                                  title="Editar"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(product.id)}
                                  disabled={processingActions.deleting.has(product.id)}
                                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Deletar"
                                >
                                  {processingActions.deleting.has(product.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col space-y-3 px-2">
                  {/* Select All Checkbox for Mobile */}
                  {products.length > 0 && (
                    <div className="flex items-center gap-2 px-1 mb-1">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300"
                        checked={selectedIds.length === products.length}
                        onChange={toggleSelectAll}
                        id="selectAllMobile"
                      />
                      <label htmlFor="selectAllMobile" className="text-xs font-medium">Selecionar Todos</label>
                    </div>
                  )}
                  {products.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 border rounded-lg bg-gray-50">
                      Nenhum produto encontrado
                    </div>
                  ) : (
                    products.map((product) => (
                      <Card
                        key={product.id}
                        className={`overflow-hidden cursor-pointer transition-colors active:bg-gray-100 ${selectedIds.includes(product.id) ? 'border-primary ring-1 ring-primary' : ''}`}
                        onClick={(e) => {
                          // Prevent opening modal if clicking the checkbox
                          if (e.target.type === 'checkbox') return;
                          setSelectedMobileProduct(product);
                          setIsMobileOptionsOpen(true);
                        }}
                      >
                        <div className="p-3 flex gap-3">
                          <div className="pt-1">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-gray-300"
                              checked={selectedIds.includes(product.id)}
                              onChange={() => toggleSelection(product.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
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
                                  -{product.discount_percentage}%
                                </Badge>
                              )}
                              {product.final_price && product.final_price < product.current_price && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-green-50 border-green-200">
                                  Com cupom
                                </Badge>
                              )}
                              {product.is_featured_offer && (
                                <Badge variant="default" className="text-[10px] px-1 py-0 h-4 bg-yellow-500">
                                  ⭐ Oferta
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

              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(newPage) => fetchProducts(newPage)}
              />

              {/* Modal de Republicação */}
              <Dialog open={isRepublishDialogOpen} onOpenChange={setIsRepublishDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Republicar Produto</DialogTitle>
                    <DialogDescription>
                      Deseja republicar o produto "{republishingProduct?.name}"?
                      Você pode opcionalmente vincular um cupom abaixo.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="republish_coupon_id">Vincular Cupom (Opcional)</Label>
                      <select
                        id="republish_coupon_id"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={republishFormData.coupon_id}
                        onChange={(e) => setRepublishFormData({ coupon_id: e.target.value })}
                      >
                        <option value="">Nenhum cupom</option>
                        {coupons
                          .filter(c => c.is_active && (c.platform === republishingProduct?.platform || c.platform === 'general'))
                          .map(coupon => {
                            let discountText = coupon.discount_type === 'percentage'
                              ? `${coupon.discount_value}% OFF`
                              : `R$ ${parseFloat(coupon.discount_value || 0).toFixed(2)} OFF`;

                            return (
                              <option key={coupon.id} value={coupon.id}>
                                {coupon.code} - {discountText}
                              </option>
                            );
                          })}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {republishFormData.coupon_id
                          ? 'O produto será republicado usando o template de "Promoção + Cupom".'
                          : 'O produto será republicado usando o template de "Nova Promoção".'}
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRepublishDialogOpen(false)} disabled={processingActions.republishing}>
                      Cancelar
                    </Button>
                    <Button onClick={handleRepublishSubmit} disabled={processingActions.republishing}>
                      {processingActions.republishing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Republicando...
                        </>
                      ) : (
                        'Confirmar Republicação'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Mobile Options Modal */}
              {isMobile && selectedMobileProduct && (
                <Dialog open={isMobileOptionsOpen} onOpenChange={setIsMobileOptionsOpen}>
                  <DialogContent className="w-[95vw] rounded-xl p-4 sm:max-w-md">
                    <DialogHeader className="text-left mb-4">
                      <DialogTitle className="text-base line-clamp-2 leading-tight">
                        {selectedMobileProduct.ai_optimized_title || selectedMobileProduct.name}
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        Escolha uma ação para este produto
                      </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3">
                      {selectedMobileProduct.affiliate_url && (
                        <Button
                          variant="outline"
                          className="w-full justify-start h-12 text-black bg-gray-50 dark:bg-gray-900 dark:text-gray-100"
                          asChild
                        >
                          <a href={selectedMobileProduct.affiliate_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-3 h-5 w-5 text-gray-500" />
                            Abrir Link na Loja
                          </a>
                        </Button>
                      )}

                      {(selectedMobileProduct.status === 'approved' || selectedMobileProduct.status === 'published') && (
                        <Button
                          variant="outline"
                          className="w-full justify-start h-12 text-orange-600 bg-orange-50 hover:bg-orange-100 border-orange-200"
                          onClick={() => {
                            setIsMobileOptionsOpen(false);
                            handleRepublish(selectedMobileProduct);
                          }}
                        >
                          <Zap className="mr-3 h-5 w-5" />
                          Republicar Oferta
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        className="w-full justify-start h-12 text-blue-600 bg-blue-50 border-blue-200"
                        onClick={() => {
                          setIsMobileOptionsOpen(false);
                          handleEdit(selectedMobileProduct);
                        }}
                      >
                        <Edit className="mr-3 h-5 w-5" />
                        Editar Produto
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full justify-start h-12 text-red-600 bg-red-50 border-red-200"
                        onClick={() => {
                          setIsMobileOptionsOpen(false);
                          handleDelete(selectedMobileProduct.id);
                        }}
                        disabled={processingActions.deleting.has(selectedMobileProduct.id)}
                      >
                        {processingActions.deleting.has(selectedMobileProduct.id) ? (
                          <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                        ) : (
                          <Trash2 className="mr-3 h-5 w-5" />
                        )}
                        Excluir Produto
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
