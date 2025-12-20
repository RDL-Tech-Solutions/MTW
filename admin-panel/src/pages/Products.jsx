import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash2, Search, ExternalLink, Sparkles, Brain, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';
import { Pagination } from '../components/ui/Pagination';

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
      console.log('✅ Categorias carregadas:', categoriesData.length, 'categorias', categoriesData);
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

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente deletar este produto?')) return;

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

    console.log('🔗 Iniciando análise do link:', formData.affiliate_url);
    setAnalyzingLink(true);
    try {
      console.log('📤 Enviando requisição para API...');
      const response = await api.post('/link-analyzer/analyze', {
        url: formData.affiliate_url
      });

      console.log('📦 Resposta completa da API:', response);
      console.log('📦 Dados da resposta:', response.data);
      
      const productInfo = response.data.data || response.data;
      
      console.log('📦 Dados do produto extraídos:', productInfo);

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

      console.log('📝 Dados do formulário atualizados:', updatedFormData);

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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os produtos do sistema ({pagination.total} total)
          </p>
        </div>

        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleBatchDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Deletar ({selectedIds.length})
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
                      placeholder="https://shopee.com.br/... ou https://mercadolivre.com.br/... ou https://aliexpress.com/..."
                      value={formData.affiliate_url}
                      onChange={(e) => setFormData({ ...formData, affiliate_url: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleAnalyzeLink}
                      disabled={analyzingLink || !formData.affiliate_url}
                      variant="secondary"
                      className="whitespace-nowrap"
                    >
                      {analyzingLink ? (
                        <>
                          <Sparkles className="mr-2 h-4 w-4 animate-spin" />
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
                        <div className="text-sm text-muted-foreground text-center py-4" style={{display: 'none'}}>
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
                      <Badge className={getTemplateModeInfo(!!formData.coupon_id).color}>
                        {getTemplateModeInfo(!!formData.coupon_id).icon} {getTemplateModeInfo(!!formData.coupon_id).label}
                      </Badge>
                    </div>
                    {getTemplateModeInfo(!!formData.coupon_id).label === 'IA ADVANCED' && (
                      <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs text-purple-800 dark:text-purple-200">
                        <Brain className="h-3 w-3 inline mr-1" />
                        A IA irá gerar o template automaticamente baseado no produto e contexto
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit">{editingProduct ? 'Salvar' : 'Criar'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Produtos</CardTitle>
              <CardDescription>
                Exibindo página {pagination.page} de {pagination.totalPages}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">Todas as Plataformas</option>
                <option value="mercadolivre">Mercado Livre</option>
                <option value="shopee">Shopee</option>
                <option value="amazon">Amazon</option>
                <option value="aliexpress">AliExpress</option>
                <option value="general">Geral</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex h-10 min-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendentes</option>
                <option value="approved">Aprovados</option>
                <option value="published">Publicados</option>
                <option value="rejected">Rejeitados</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Carregando produtos...</div>
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
                        checked={products.length > 0 && selectedIds.length === products.length}
                        onChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
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
                              <div className="font-medium">{product.name}</div>
                              {product.description && (
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {product.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`capitalize ${
                              product.platform === 'mercadolivre' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                              product.platform === 'shopee' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                              product.platform === 'amazon' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              product.platform === 'aliexpress' ? 'bg-red-100 text-red-800 border-red-300' :
                              'bg-gray-100 text-gray-800 border-gray-300'
                            }`}
                          >
                            {product.platform === 'mercadolivre' ? 'Mercado Livre' :
                             product.platform === 'shopee' ? 'Shopee' :
                             product.platform === 'amazon' ? 'Amazon' :
                             product.platform === 'aliexpress' ? 'AliExpress' :
                             product.platform}
                          </Badge>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(product.id)}
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
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(newPage) => fetchProducts(newPage)}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
