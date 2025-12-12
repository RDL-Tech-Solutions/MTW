import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash2, Search, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';

export default function Products() {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [analyzingLink, setAnalyzingLink] = useState(false);
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

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchCoupons();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      console.log('📦 Resposta completa da API:', response.data);
      console.log('📦 Produtos recebidos:', response.data.data.products);
      console.log('📦 Total de produtos:', response.data.data.products?.length);
      setProducts(response.data.data.products || []);
    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error);
      console.error('❌ Detalhes:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data.categories || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
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
      
      // Atualizar lista localmente removendo o produto deletado
      setProducts(products.filter(p => p.id !== id));
      
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

    setAnalyzingLink(true);
    try {
      const response = await api.post('/link-analyzer/analyze', {
        url: formData.affiliate_url
      });

      const productInfo = response.data.data;

      console.log('📦 Dados recebidos do backend:', productInfo);
      console.log('   currentPrice:', productInfo.currentPrice);
      console.log('   oldPrice:', productInfo.oldPrice);

      // Verificar se há desconto real
      const hasDiscount = productInfo.oldPrice && productInfo.oldPrice > productInfo.currentPrice;
      console.log('   Tem desconto?', hasDiscount);

      // Detectar categoria automaticamente baseado no nome do produto
      const detectedCategory = detectCategory(productInfo.name);
      if (detectedCategory) {
        const categoryName = categories.find(c => c.id === detectedCategory)?.name;
        console.log(`🎯 Categoria detectada automaticamente: ${categoryName}`);
      }

      // Definir preços corretamente
      let priceOriginal = productInfo.currentPrice; // Preço padrão
      let priceDiscount = ''; // Vazio por padrão

      if (hasDiscount) {
        priceOriginal = productInfo.oldPrice; // Preço original (antes do desconto)
        priceDiscount = productInfo.currentPrice; // Preço com desconto
      }

      console.log('💰 Preços definidos:');
      console.log('   Preço Original:', priceOriginal);
      console.log('   Preço com Desconto:', priceDiscount);

      setFormData({
        ...formData,
        name: productInfo.name || formData.name,
        description: productInfo.description || formData.description,
        price: priceOriginal,
        discount_price: priceDiscount,
        image_url: productInfo.imageUrl || formData.image_url,
        platform: productInfo.platform || formData.platform,
        category_id: detectedCategory || formData.category_id
      });

      toast({
        title: "Sucesso!",
        description: "Informações extraídas do link com sucesso!",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Erro!",
        description: error.response?.data?.error || "Erro ao analisar link. Verifique se o link está correto.",
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
        if (!priceStr) return null;
        // Remove tudo exceto números
        const cleaned = String(priceStr).replace(/[^\d]/g, '');
        const number = parseFloat(cleaned) || null;
        console.log(`parsePrice("${priceStr}") => cleaned: "${cleaned}" => number: ${number}`);
        return number;
      };

      // Converter campos do formulário para o formato esperado pelo backend
      const productData = {
        name: formData.name,
        image_url: formData.image_url,
        platform: formData.platform,
        current_price: parsePrice(formData.discount_price) || parsePrice(formData.price),
        old_price: formData.discount_price ? parsePrice(formData.price) : null,
        category_id: formData.category_id || null,
        coupon_id: formData.coupon_id || null,
        affiliate_link: formData.affiliate_url,
        stock_available: true
      };

      // Adicionar external_id apenas ao criar (não ao editar)
      if (!editingProduct) {
        const externalId = `${formData.platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('🔑 external_id gerado:', externalId);
        productData.external_id = externalId;
      }

      console.log('📤 Enviando dados do produto:', productData);

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, productData);
        await fetchProducts(); // Atualizar lista antes de fechar modal
        toast({
          title: "Sucesso!",
          description: "Produto atualizado com sucesso.",
          variant: "success",
        });
      } else {
        await api.post('/products', productData);
        await fetchProducts(); // Atualizar lista antes de fechar modal
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
      console.error('❌ Erro ao salvar produto:', error);
      console.error('❌ Resposta do servidor:', error.response?.data);
      if (error.response?.data?.details) {
        console.error('❌ Detalhes dos erros:', error.response.data.details);
      }
      
      let errorMessage;
      const details = error.response?.data?.details;
      
      if (Array.isArray(details)) {
        // Se details for um array, mapear os erros
        errorMessage = details.map(d => `${d.field}: ${d.message}`).join(', ');
      } else if (typeof details === 'string') {
        // Se details for uma string, usar diretamente
        errorMessage = details;
      } else {
        // Caso contrário, usar a mensagem de erro padrão
        errorMessage = error.response?.data?.error || error.response?.data?.message || "Erro ao salvar produto.";
      }
      
      toast({
        title: "Erro!",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Função para detectar categoria automaticamente
  const detectCategory = (productName) => {
    if (!productName) return '';
    const name = productName.toLowerCase();
    
    // Mapear palavras-chave para categorias
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

    // Buscar categoria correspondente
    for (const [categoryName, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        // Encontrar o ID da categoria pelo nome
        const category = categories.find(cat => 
          cat.name.toLowerCase().includes(categoryName) || 
          categoryName.includes(cat.name.toLowerCase())
        );
        return category ? category.id : '';
      }
    }
    
    return '';
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando produtos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os produtos do sistema
          </p>
        </div>
        
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do produto abaixo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Link de Afiliado - PRIMEIRO CAMPO */}
              <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <Label htmlFor="affiliate_url" className="text-blue-900 dark:text-blue-100 font-semibold">
                  🔗 Link de Afiliado (Cole aqui para auto-preencher)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="affiliate_url"
                    type="url"
                    placeholder="https://shopee.com.br/... ou https://mercadolivre.com.br/..."
                    value={formData.affiliate_url}
                    onChange={(e) => setFormData({...formData, affiliate_url: e.target.value})}
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
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
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
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Cole o link do produto e clique em "Auto-Preencher" para extrair automaticamente as informações
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Produto *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Smartphone Samsung Galaxy A54"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform">Plataforma *</Label>
                  <select
                    id="platform"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.platform}
                    onChange={(e) => setFormData({...formData, platform: e.target.value})}
                  >
                    <option value="shopee">Shopee</option>
                    <option value="mercadolivre">Mercado Livre</option>
                    <option value="amazon">Amazon</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  placeholder="Descrição do produto..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço Original *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount_price">Preço com Desconto</Label>
                  <Input
                    id="discount_price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.discount_price}
                    onChange={(e) => setFormData({...formData, discount_price: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">URL da Imagem</Label>
                <Input
                  id="image_url"
                  type="url"
                  placeholder="https://..."
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                />
                {formData.image_url && (
                  <div className="mt-2">
                    <img src={formData.image_url} alt="Preview" className="h-20 w-20 object-cover rounded border" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category_id">Categoria</Label>
                  <select
                    id="category_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coupon_id">Cupom (Opcional)</Label>
                  <select
                    id="coupon_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.coupon_id}
                    onChange={(e) => setFormData({...formData, coupon_id: e.target.value})}
                  >
                    <option value="">Nenhum cupom</option>
                    {coupons.map(coupon => (
                      <option key={coupon.id} value={coupon.id}>
                        {coupon.code} - {coupon.discount_percentage}% OFF
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProduct ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Produtos</CardTitle>
              <CardDescription>
                {filteredProducts.length} produto(s) encontrado(s)
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
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
                      <Badge variant="outline" className="capitalize">
                        {product.platform}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {product.old_price && product.old_price > product.current_price ? (
                          <>
                            <div className="font-medium text-green-600">
                              R$ {parseFloat(product.current_price).toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground line-through">
                              R$ {parseFloat(product.old_price).toFixed(2)}
                            </div>
                          </>
                        ) : (
                          <div className="font-medium">
                            R$ {parseFloat(product.current_price).toFixed(2)}
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
        </CardContent>
      </Card>
    </div>
  );
}
