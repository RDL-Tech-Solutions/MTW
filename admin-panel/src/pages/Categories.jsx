import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash2, Search, Tag, Grid, List, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'table'
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '📦',
    is_active: true
  });
  const [processingActions, setProcessingActions] = useState({
    deleting: new Set(),
    submitting: false
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      // A API retorna { success: true, data: [...] }
      let categoriesData = [];

      if (response.data?.success && response.data?.data) {
        if (Array.isArray(response.data.data)) {
          categoriesData = response.data.data;
        } else if (response.data.data.categories && Array.isArray(response.data.data.categories)) {
          categoriesData = response.data.data.categories;
        }
      } else if (Array.isArray(response.data)) {
        categoriesData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        categoriesData = response.data.data;
      }

      setCategories(categoriesData);
      console.log('✅ Categorias carregadas:', categoriesData.length);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente deletar esta categoria?')) return;

    setProcessingActions(prev => ({
      ...prev,
      deleting: new Set(prev.deleting).add(id)
    }));

    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (error) {
      alert('Erro ao deletar categoria');
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev.deleting);
        newSet.delete(id);
        return { ...prev, deleting: newSet };
      });
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug || '',
      description: category.description || '',
      icon: category.icon || '📦',
      is_active: category.is_active !== false
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessingActions(prev => ({ ...prev, submitting: true }));
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, formData);
      } else {
        await api.post('/categories', formData);
      }
      setIsDialogOpen(false);
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        icon: '📦',
        is_active: true
      });
      fetchCategories();
    } catch (error) {
      alert('Erro ao salvar categoria');
    } finally {
      setProcessingActions(prev => ({ ...prev, submitting: false }));
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando categorias...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Gerencie as categorias de produtos
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 sm:h-10 text-xs sm:text-sm" onClick={() => {
              setEditingCategory(null);
              setFormData({
                name: '',
                slug: '',
                description: '',
                icon: '📦',
                is_active: true
              });
            }}>
              <Plus className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Nova </span>Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da categoria abaixo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Eletrônicos"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="eletronicos"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da categoria"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Ícone (Emoji)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="📦"
                  maxLength={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_active">Categoria ativa</Label>
              </div>

              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={processingActions.submitting}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={processingActions.submitting}
                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingActions.submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingCategory ? 'Salvando...' : 'Criando...'}
                    </>
                  ) : (
                    editingCategory ? 'Salvar' : 'Criar'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">Lista de Categorias</CardTitle>
              <CardDescription className="text-xs">
                {filteredCategories.length} categoria(s) encontrada(s)
              </CardDescription>
            </div>
            <div className="flex w-full sm:w-auto gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCategories.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhuma categoria encontrada
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCategories.map((category) => (
                <Card key={category.id} className="relative group hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="text-5xl">{category.icon || '📦'}</div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{category.name}</h3>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">
                            {category.description}
                          </p>
                        )}
                      </div>
                      <Badge variant={category.is_active ? "default" : "secondary"}>
                        <Tag className="mr-1 h-3 w-3" />
                        {category.product_count || 0} produtos
                      </Badge>
                      {!category.is_active && (
                        <Badge variant="outline" className="text-xs">
                          Inativa
                        </Badge>
                      )}
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleDelete(category.id)}
                        disabled={processingActions.deleting.has(category.id)}
                      >
                        {processingActions.deleting.has(category.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Ícone</th>
                    <th className="text-left p-3">Nome</th>
                    <th className="text-left p-3">Slug</th>
                    <th className="text-left p-3">Descrição</th>
                    <th className="text-center p-3">Produtos</th>
                    <th className="text-center p-3">Status</th>
                    <th className="text-right p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((category) => (
                    <tr key={category.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 text-2xl">{category.icon || '📦'}</td>
                      <td className="p-3 font-medium">{category.name}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        <code className="bg-muted px-2 py-1 rounded text-xs">{category.slug}</code>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground max-w-xs truncate">
                        {category.description || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary">
                          {category.product_count || 0}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={category.is_active ? "default" : "outline"}>
                          {category.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleDelete(category.id)}
                            disabled={processingActions.deleting.has(category.id)}
                          >
                            {processingActions.deleting.has(category.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
