import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash2, Search, Copy, Calendar } from 'lucide-react';
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
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    max_uses: '',
    expires_at: ''
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCoupons(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

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
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      max_uses: coupon.max_uses || '',
      expires_at: coupon.expires_at ? format(new Date(coupon.expires_at), 'yyyy-MM-dd') : ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCoupon) {
        await api.put(`/coupons/${editingCoupon.id}`, formData);
      } else {
        await api.post('/coupons', formData);
      }
      setIsDialogOpen(false);
      setEditingCoupon(null);
      setFormData({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        max_uses: '',
        expires_at: ''
      });
      fetchCoupons(1);
    } catch (error) {
      alert('Erro ao salvar cupom');
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
                  description: '',
                  discount_type: 'percentage',
                  discount_value: '',
                  max_uses: '',
                  expires_at: ''
                });
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cupom
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados do cupom abaixo
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="Ex: PROMO10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount_type">Tipo de Desconto *</Label>
                    <select
                      id="discount_type"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    >
                      <option value="percentage">Porcentagem</option>
                      <option value="fixed">Valor Fixo</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do cupom"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount_value">
                      Valor do Desconto * {formData.discount_type === 'percentage' ? '(%)' : '(R$)'}
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_uses">Máximo de Usos</Label>
                    <Input
                      id="max_uses"
                      type="number"
                      value={formData.max_uses}
                      onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                      placeholder="Ilimitado"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires_at">Data de Expiração</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
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
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
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
                          <div className="flex items-center gap-2">
                            <code className="font-mono font-semibold bg-muted px-2 py-1 rounded">
                              {coupon.code}
                            </code>
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
