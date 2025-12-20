import { useEffect, useState } from 'react';
import api from '../services/api';
import { CheckCircle, XCircle, Search, ExternalLink, Clock, Eye, X, Zap, Brain } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';
import { Pagination } from '../components/ui/Pagination';

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
  const [rejecting, setRejecting] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
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

  useEffect(() => {
    fetchPendingProducts(1);
    loadTemplateModes();
  }, []);

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

      const response = await api.get('/products/pending', { params });

      const { products, totalPages, total } = response.data.data;

      setProducts(products || []);
      setPagination(prev => ({
        ...prev,
        page,
        totalPages: totalPages || 1,
        total: total || 0
      }));

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
  }, [searchTerm, platformFilter]);

  const handleOpenApprovalDialog = async (product) => {
    setSelectedProduct(product);
    setAffiliateLink(product.original_link || product.affiliate_link || '');
    setSelectedCouponId(product.coupon_id || '');
    setFinalPrice(null);
    setIsApprovalDialogOpen(true);
    
    // Buscar cupons disponíveis para a plataforma do produto
    await fetchAvailableCoupons(product.platform);
  };

  const handleCloseApprovalDialog = () => {
    setIsApprovalDialogOpen(false);
    setSelectedProduct(null);
    setAffiliateLink('');
    setSelectedCouponId('');
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

  const handleApprove = async () => {
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

    setApproving(true);
    try {
      const payload = {
        affiliate_link: affiliateLink.trim()
      };

      // Adicionar cupom se selecionado
      if (selectedCouponId) {
        payload.coupon_id = selectedCouponId;
      }

      const response = await api.post(`/products/pending/${selectedProduct.id}/approve`, payload);

      toast({
        title: "Sucesso",
        description: "Produto aprovado e publicado com sucesso!",
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

  const getPlatformBadge = (platform) => {
    const colors = {
      mercadolivre: 'bg-yellow-500',
      shopee: 'bg-orange-500',
      amazon: 'bg-blue-500',
      aliexpress: 'bg-red-500'
    };
    return colors[platform] || 'bg-gray-500';
  };

  const getPlatformName = (platform) => {
    const names = {
      mercadolivre: 'Mercado Livre',
      shopee: 'Shopee',
      amazon: 'Amazon',
      aliexpress: 'AliExpress'
    };
    return names[platform] || platform;
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
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
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produtos Pendentes ({pagination.total})</CardTitle>
          <CardDescription>
            {pagination.total} produtos aguardando aprovação
          </CardDescription>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imagem</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <img
                          src={product.image_url || 'https://via.placeholder.com/50'}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge className={getPlatformBadge(product.platform)}>
                          {getPlatformName(product.platform)}
                        </Badge>
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
                        {new Date(product.created_at).toLocaleDateString('pt-BR')}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <img
                    src={selectedProduct.image_url || 'https://via.placeholder.com/300'}
                    alt={selectedProduct.name}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <Label>Nome</Label>
                    <p className="font-semibold">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <Label>Plataforma</Label>
                    <Badge className={getPlatformBadge(selectedProduct.platform)}>
                      {getPlatformName(selectedProduct.platform)}
                    </Badge>
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
                      <Badge variant="destructive" className="text-lg">
                        {selectedProduct.discount_percentage}% OFF
                      </Badge>
                    </div>
                  )}
                  {selectedProduct.category_name && (
                    <div>
                      <Label>Categoria</Label>
                      <p>{selectedProduct.category_name}</p>
                    </div>
                  )}
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
                <Input
                  id="affiliate_link"
                  value={affiliateLink}
                  onChange={(e) => setAffiliateLink(e.target.value)}
                  placeholder="Cole o link de afiliado convertido aqui"
                />
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseApprovalDialog}
              disabled={approving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving || !affiliateLink.trim()}
            >
              {approving ? 'Aprovando...' : 'Aprovar e Publicar'}
            </Button>
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
              {rejecting ? 'Rejeitando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



