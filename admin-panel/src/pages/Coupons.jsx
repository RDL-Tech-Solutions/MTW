import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash2, Search, Copy, Calendar, Zap, Brain } from 'lucide-react';
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
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0
  });

  const [formData, setFormData] = useState({
    code: '',
    platform: 'general',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    min_purchase: '',
    max_discount_value: '',
    is_general: true,
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
      fetchCoupons(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

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
          
          if (platform && platform !== 'general' && ['mercadolivre', 'shopee', 'amazon', 'aliexpress'].includes(platform)) {
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
                  is_general: coupon.is_general !== undefined ? coupon.is_general : true,
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
                  is_general: coupon.is_general !== undefined ? coupon.is_general : true,
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

  const fetchCoupons = async (page = 1) => {
    try {
      setLoading(true);
      setSelectedIds([]); // Clear selection when changing view/page
      const params = {
        page,
        limit: 20,
        search: searchTerm
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
      is_general: coupon.is_general !== undefined ? coupon.is_general : true,
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

    if (!formData.valid_until || formData.valid_until.trim() === '') {
      setErrors({ valid_until: 'Data de expiração é obrigatória' });
      return;
    }

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
        valid_until: new Date(formData.valid_until + 'T23:59:59').toISOString(),
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
        is_general: true,
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

  // Toggle selection
  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedIds.length === coupons.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(coupons.map(c => c.id));
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cupons</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os cupons de desconto ({pagination.total} total)
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
                setEditingCoupon(null);
                setFormData({
                  code: '',
                  platform: 'general',
                  description: '',
                  discount_type: 'percentage',
                  discount_value: '',
                  min_purchase: '',
                  max_discount_value: '',
                  is_general: true,
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
                <Plus className="mr-2 h-4 w-4" />
                Novo Cupom
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
                    value={formData.is_general ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, is_general: e.target.value === 'true' })}
                  >
                    <option value="true">Todos os Produtos</option>
                    <option value="false">Produtos Selecionados</option>
                  </select>
                  {!formData.is_general && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ⚠️ Para produtos selecionados, você precisará associar os produtos após criar o cupom.
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
                    <Label htmlFor="valid_until">Data de Expiração *</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={formData.valid_until || ''}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      required
                    />
                    {errors.valid_until && <p className="text-sm text-red-500">{errors.valid_until}</p>}
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Cupons</CardTitle>
              <CardDescription>
                Exibindo página {pagination.page} de {pagination.totalPages}
              </CardDescription>
            </div>
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
                        checked={coupons.length > 0 && selectedIds.length === coupons.length}
                        onChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Nenhum cupom encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    coupons.map((coupon) => (
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
                              'bg-gray-100 text-gray-800 border-gray-300'
                            }
                          >
                            {coupon.platform === 'mercadolivre' ? 'Mercado Livre' :
                             coupon.platform === 'shopee' ? 'Shopee' :
                             coupon.platform === 'amazon' ? 'Amazon' :
                             coupon.platform === 'aliexpress' ? 'AliExpress' :
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
                          <div className="text-sm">
                            {coupon.current_uses} / {coupon.max_uses || '∞'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {coupon.expires_at ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(coupon.expires_at), 'dd/MM/yyyy')}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sem validade</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={coupon.is_active ? 'success' : 'destructive'}>
                            {coupon.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
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
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(newPage) => fetchCoupons(newPage)}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
