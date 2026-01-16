import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import api from '../services/api';
import { RefreshCw, Save, Play, TrendingUp, Package, AlertCircle, Brain, Sparkles, DollarSign, FileText, Filter, Loader2 } from 'lucide-react';

export default function AutoSync() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [runningPlatform, setRunningPlatform] = useState(null);
  const [config, setConfig] = useState({
    shopee_enabled: false,
    mercadolivre_enabled: false,
    amazon_enabled: false,
    aliexpress_enabled: false,
    kabum_enabled: false,
    magazineluiza_enabled: false,
    pichau_enabled: false,
    shopee_auto_publish: false,
    mercadolivre_auto_publish: false,
    amazon_auto_publish: false,
    aliexpress_auto_publish: false,
    kabum_auto_publish: false,
    magazineluiza_auto_publish: false,
    pichau_auto_publish: false,
    shopee_shorten_link: false,
    mercadolivre_shorten_link: false,
    amazon_shorten_link: false,
    aliexpress_shorten_link: false,
    kabum_shorten_link: false,
    magazineluiza_shorten_link: false,
    pichau_shorten_link: false,
    keywords: '',
    min_discount_percentage: 10,
    categories: [],
    cron_interval_minutes: 60,
    is_active: false,
    use_ai_keywords: false
  });
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [aiLoading, setAiLoading] = useState({
    analyze: false,
    optimize: false,
    price: false,
    keywords: false,
    filter: false
  });
  const [aiResults, setAiResults] = useState(null);

  useEffect(() => {
    fetchConfig();
    fetchHistory();
    fetchStats();
    fetchCategories();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/sync/config');
      const data = response.data.data;

      // Garantir que valores numéricos sejam válidos
      setConfig({
        shopee_enabled: data.shopee_enabled || false,
        mercadolivre_enabled: data.mercadolivre_enabled || false,
        amazon_enabled: data.amazon_enabled || false,
        aliexpress_enabled: data.aliexpress_enabled || false,
        kabum_enabled: data.kabum_enabled || false,
        magazineluiza_enabled: data.magazineluiza_enabled || false,
        pichau_enabled: data.pichau_enabled || false,
        shopee_auto_publish: data.shopee_auto_publish || false,
        mercadolivre_auto_publish: data.mercadolivre_auto_publish || false,
        amazon_auto_publish: data.amazon_auto_publish || false,
        aliexpress_auto_publish: data.aliexpress_auto_publish || false,
        kabum_auto_publish: data.kabum_auto_publish || false,
        magazineluiza_auto_publish: data.magazineluiza_auto_publish || false,
        pichau_auto_publish: data.pichau_auto_publish || false,
        shopee_shorten_link: data.shopee_shorten_link || false,
        mercadolivre_shorten_link: data.mercadolivre_shorten_link || false,
        amazon_shorten_link: data.amazon_shorten_link || false,
        aliexpress_shorten_link: data.aliexpress_shorten_link || false,
        kabum_shorten_link: data.kabum_shorten_link || false,
        magazineluiza_shorten_link: data.magazineluiza_shorten_link || false,
        pichau_shorten_link: data.pichau_shorten_link || false,
        keywords: data.keywords || '',
        min_discount_percentage: data.min_discount_percentage || 10,
        categories: data.categories || [],
        cron_interval_minutes: data.cron_interval_minutes || 60,
        is_active: data.is_active || false,
        use_ai_keywords: data.use_ai_keywords || false
      });
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get('/sync/history?limit=20');
      setHistory(response.data.data.logs || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/sync/stats?days=7');
      if (response.data && response.data.success) {
        setStats(response.data.data);
      } else if (response.data && response.data.data) {
        // Se não tiver success, usar data diretamente
        setStats(response.data.data);
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      setStats(null);
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

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      await api.post('/sync/config', config);

      toast({
        title: "Sucesso!",
        description: "Configuração salva com sucesso.",
      });

      fetchConfig();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro!",
        description: error.response?.data?.error || "Erro ao salvar configuração.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRunPlatform = async (platform) => {
    if (!config.keywords || config.keywords.trim() === '') {
      toast({
        title: "Atenção",
        description: "Adicione palavras-chave para buscar produtos.",
        variant: "destructive",
      });
      return;
    }

    try {
      setRunningPlatform(platform);

      // Salvar configuração atual primeiro
      await api.post('/sync/config', config);

      toast({
        title: "Sincronização iniciada",
        description: `Buscando produtos do ${platform}...`,
      });

      // Executar sincronização da plataforma específica
      const response = await api.post(`/sync/run/${platform}`);
      const results = response.data.data;

      toast({
        title: "Sincronização concluída!",
        description: `${results.new || 0} produtos novos de ${results.total || 0} encontrados no ${platform}.`,
        variant: (results.new || 0) > 0 ? "default" : "secondary"
      });

      // Aguardar um pouco antes de atualizar para garantir que os dados foram salvos
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Atualizar dados
      await Promise.all([
        fetchHistory(),
        fetchStats()
      ]);
    } catch (error) {
      console.error(`Erro ao executar sincronização do ${platform}:`, error);
      toast({
        title: "Erro!",
        description: error.response?.data?.error || `Erro ao executar sincronização do ${platform}.`,
        variant: "destructive",
      });
    } finally {
      setRunningPlatform(null);
    }
  };

  const handleRunNow = async () => {
    // Validação básica
    if (!config.shopee_enabled && !config.mercadolivre_enabled && !config.amazon_enabled && !config.aliexpress_enabled && !config.kabum_enabled && !config.magazineluiza_enabled && !config.pichau_enabled) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos uma plataforma para sincronizar.",
        variant: "destructive",
      });
      return;
    }

    if (!config.keywords || config.keywords.trim() === '') {
      toast({
        title: "Atenção",
        description: "Adicione palavras-chave para buscar produtos.",
        variant: "destructive",
      });
      return;
    }

    try {
      setRunning(true);

      // 1. Salvar configuração atual primeiro para garantir que o backend use os dados da tela
      await api.post('/sync/config', config);

      toast({
        title: "Sincronização iniciada",
        description: "Configuração salva. Buscando produtos...",
      });

      // 2. Executar Sincronização
      const response = await api.post('/sync/run-now');
      const results = response.data.data;

      const totalNew = (results.mercadolivre?.new || 0) + (results.shopee?.new || 0) + (results.amazon?.new || 0) + (results.aliexpress?.new || 0) + (results.kabum?.new || 0) + (results.magazineluiza?.new || 0) + (results.pichau?.new || 0);
      const totalFound = (results.mercadolivre?.total || 0) + (results.shopee?.total || 0) + (results.amazon?.total || 0) + (results.aliexpress?.total || 0) + (results.kabum?.total || 0) + (results.magazineluiza?.total || 0) + (results.pichau?.total || 0);

      toast({
        title: "Sincronização concluída!",
        description: `${totalNew} produtos novos de ${totalFound} encontrados.`,
        variant: totalNew > 0 ? "default" : "secondary" // Destaque se achou algo
      });

      // Aguardar um pouco antes de atualizar para garantir que os dados foram salvos
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Atualizar dados
      await Promise.all([
        fetchHistory(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Erro ao executar sincronização:', error);
      toast({
        title: "Erro!",
        description: error.response?.data?.error || "Erro ao executar sincronização.",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  // ============================================
  // Funções de IA
  // ============================================

  const handleAnalyzeProduct = async () => {
    const productName = prompt('Digite o nome do produto para análise:');
    if (!productName) return;

    setAiLoading({ ...aiLoading, analyze: true });
    try {
      const response = await api.post('/sync/ai/analyze-product', {
        product: {
          name: productName,
          current_price: 'R$ 99,90',
          original_price: 'R$ 199,90',
          discount_percentage: 50,
          platform: 'Mercado Livre',
          category: 'Eletrônicos'
        }
      });
      setAiResults({ type: 'analyze', data: response.data.data });
      toast({
        title: "Análise concluída!",
        description: `Score de qualidade: ${(response.data.data.quality_score * 100).toFixed(0)}%`,
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao analisar produto",
        variant: "destructive"
      });
    } finally {
      setAiLoading({ ...aiLoading, analyze: false });
    }
  };

  const handleOptimizeDescription = async () => {
    const productName = prompt('Digite o nome do produto:');
    if (!productName) return;

    setAiLoading({ ...aiLoading, optimize: true });
    try {
      const response = await api.post('/sync/ai/optimize-description', {
        product: {
          name: productName,
          current_price: 'R$ 99,90',
          discount_percentage: 30,
          platform: 'Shopee'
        }
      });
      setAiResults({ type: 'optimize', data: response.data.data });
      toast({
        title: "Descrição otimizada!",
        description: "Verifique o resultado abaixo",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao otimizar descrição",
        variant: "destructive"
      });
    } finally {
      setAiLoading({ ...aiLoading, optimize: false });
    }
  };

  const handleAnalyzePrice = async () => {
    const productName = prompt('Digite o nome do produto:');
    if (!productName) return;

    setAiLoading({ ...aiLoading, price: true });
    try {
      const response = await api.post('/sync/ai/analyze-price', {
        product: {
          name: productName,
          current_price: 'R$ 199,90',
          original_price: 'R$ 299,90',
          discount_percentage: 33,
          platform: 'Mercado Livre'
        }
      });
      setAiResults({ type: 'price', data: response.data.data });
      toast({
        title: "Análise de preço concluída!",
        description: response.data.data.recommendation === 'buy_now' ? 'Recomendado comprar!' : 'Avaliar melhor',
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao analisar preço",
        variant: "destructive"
      });
    } finally {
      setAiLoading({ ...aiLoading, price: false });
    }
  };

  const handleOptimizeKeywords = async () => {
    const productName = prompt('Digite o nome do produto:');
    if (!productName) return;

    setAiLoading({ ...aiLoading, keywords: true });
    try {
      const response = await api.post('/sync/ai/optimize-keywords', {
        product_name: productName,
        current_keywords: 'produto, promoção',
        category: 'Eletrônicos'
      });
      setAiResults({ type: 'keywords', data: response.data.data });
      toast({
        title: "Keywords otimizadas!",
        description: `${response.data.data.optimized_keywords.length} keywords principais`,
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao otimizar keywords",
        variant: "destructive"
      });
    } finally {
      setAiLoading({ ...aiLoading, keywords: false });
    }
  };

  const handleFilterProducts = async () => {
    toast({
      title: "Filtragem Inteligente",
      description: "Esta funcionalidade será usada automaticamente durante a sincronização quando a IA estiver habilitada",
      variant: "default"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automação de Produtos</h1>
          <p className="text-muted-foreground mt-2">
            Capture automaticamente promoções de 7 plataformas: Mercado Livre, Shopee, Amazon, AliExpress, Kabum, Magazine Luiza e Pichau
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await Promise.all([fetchConfig(), fetchHistory(), fetchStats()]);
            toast({
              title: "Atualizado!",
              description: "Dados atualizados com sucesso.",
            });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sincronizados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Novos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.new_products || 0}</div>
            <p className="text-xs text-muted-foreground">Adicionados ao catálogo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mercado Livre</CardTitle>
            <Package className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.mercadolivre || 0}</div>
            <p className="text-xs text-muted-foreground">Produtos capturados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shopee</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.shopee || 0}</div>
            <p className="text-xs text-muted-foreground">Produtos capturados</p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas por Plataforma (Expandido) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amazon</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.amazon || 0}</div>
            <p className="text-xs text-muted-foreground">Produtos capturados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AliExpress</CardTitle>
            <Package className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.aliexpress || 0}</div>
            <p className="text-xs text-muted-foreground">Produtos capturados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kabum</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.kabum || 0}</div>
            <p className="text-xs text-muted-foreground">Produtos capturados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Magazine Luiza</CardTitle>
            <Package className="h-4 w-4 text-blue-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.magazineluiza || 0}</div>
            <p className="text-xs text-muted-foreground">Produtos capturados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pichau</CardTitle>
            <Package className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pichau || 0}</div>
            <p className="text-xs text-muted-foreground">Produtos capturados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviados aos Bots</CardTitle>
            <AlertCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats?.sent_to_bots || 0}</div>
            <p className="text-xs text-muted-foreground">Notificações enviadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.errors || 0}</div>
            <p className="text-xs text-muted-foreground">Sincronizações com erro</p>
          </CardContent>
        </Card>
      </div>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Captura Automática</CardTitle>
          <CardDescription>
            Configure quais plataformas monitorar e defina os critérios de filtragem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ativar/Desativar Sincronização */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Ativar Sincronização Automática</Label>
              <p className="text-sm text-muted-foreground">
                Buscar novos produtos automaticamente no intervalo configurado
              </p>
            </div>
            <Switch
              checked={config.is_active}
              onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
            />
          </div>

          {/* Plataformas */}
          <div className="space-y-4">
            <Label className="text-base">Plataformas</Label>

            <div className="flex items-center space-x-2">
              <Switch
                checked={config.shopee_enabled}
                onCheckedChange={(checked) => setConfig({ ...config, shopee_enabled: checked })}
                id="shopee"
              />
              <Label htmlFor="shopee" className="font-normal">Shopee</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={config.mercadolivre_enabled}
                onCheckedChange={(checked) => setConfig({ ...config, mercadolivre_enabled: checked })}
                id="mercadolivre"
              />
              <Label htmlFor="mercadolivre" className="font-normal">Mercado Livre</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={config.amazon_enabled}
                onCheckedChange={(checked) => setConfig({ ...config, amazon_enabled: checked })}
                id="amazon"
              />
              <Label htmlFor="amazon" className="font-normal">Amazon</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={config.aliexpress_enabled}
                onCheckedChange={(checked) => setConfig({ ...config, aliexpress_enabled: checked })}
                id="aliexpress"
              />
              <Label htmlFor="aliexpress" className="font-normal">AliExpress</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={config.kabum_enabled}
                onCheckedChange={(checked) => setConfig({ ...config, kabum_enabled: checked })}
                id="kabum"
              />
              <Label htmlFor="kabum" className="font-normal">Kabum</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={config.magazineluiza_enabled}
                onCheckedChange={(checked) => setConfig({ ...config, magazineluiza_enabled: checked })}
                id="magazineluiza"
              />
              <Label htmlFor="magazineluiza" className="font-normal">Magazine Luiza</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={config.pichau_enabled}
                onCheckedChange={(checked) => setConfig({ ...config, pichau_enabled: checked })}
                id="pichau"
              />
              <Label htmlFor="pichau" className="font-normal">Pichau</Label>
            </div>
          </div>

          {/* Auto-Publicação por Plataforma */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-1">
              <Label className="text-base">Auto-Publicação com IA</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, a IA analisa estrategicamente cada produto antes de publicar automaticamente nos bots e no app.
                Se não aprovado pela IA, o produto fica em /pending-products para revisão manual.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="mercadolivre_auto_publish" className="font-medium">Mercado Livre</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Publicar automaticamente após análise estratégica da IA
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 border-r pr-4 mr-2">
                    <Label htmlFor="mercadolivre_shorten_link" className="text-xs text-muted-foreground cursor-pointer">Encurtar Link</Label>
                    <Switch
                      checked={config.mercadolivre_shorten_link || false}
                      onCheckedChange={(checked) => setConfig({ ...config, mercadolivre_shorten_link: checked })}
                      id="mercadolivre_shorten_link"
                      className="scale-75"
                    />
                  </div>
                  <Switch
                    checked={config.mercadolivre_auto_publish || false}
                    onCheckedChange={(checked) => setConfig({ ...config, mercadolivre_auto_publish: checked })}
                    id="mercadolivre_auto_publish"
                    disabled={!config.mercadolivre_enabled}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="shopee_auto_publish" className="font-medium">Shopee</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Publicar automaticamente após análise estratégica da IA
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 border-r pr-4 mr-2">
                    <Label htmlFor="shopee_shorten_link" className="text-xs text-muted-foreground cursor-pointer">Encurtar Link</Label>
                    <Switch
                      checked={config.shopee_shorten_link || false}
                      onCheckedChange={(checked) => setConfig({ ...config, shopee_shorten_link: checked })}
                      id="shopee_shorten_link"
                      className="scale-75"
                    />
                  </div>
                  <Switch
                    checked={config.shopee_auto_publish || false}
                    onCheckedChange={(checked) => setConfig({ ...config, shopee_auto_publish: checked })}
                    id="shopee_auto_publish"
                    disabled={!config.shopee_enabled}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="amazon_auto_publish" className="font-medium">Amazon</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Publicar automaticamente após análise estratégica da IA
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 border-r pr-4 mr-2">
                    <Label htmlFor="amazon_shorten_link" className="text-xs text-muted-foreground cursor-pointer">Encurtar Link</Label>
                    <Switch
                      checked={config.amazon_shorten_link || false}
                      onCheckedChange={(checked) => setConfig({ ...config, amazon_shorten_link: checked })}
                      id="amazon_shorten_link"
                      className="scale-75"
                    />
                  </div>
                  <Switch
                    checked={config.amazon_auto_publish || false}
                    onCheckedChange={(checked) => setConfig({ ...config, amazon_auto_publish: checked })}
                    id="amazon_auto_publish"
                    disabled={!config.amazon_enabled}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="aliexpress_auto_publish" className="font-medium">AliExpress</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Publicar automaticamente após análise estratégica da IA
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 border-r pr-4 mr-2">
                    <Label htmlFor="aliexpress_shorten_link" className="text-xs text-muted-foreground cursor-pointer">Encurtar Link</Label>
                    <Switch
                      checked={config.aliexpress_shorten_link || false}
                      onCheckedChange={(checked) => setConfig({ ...config, aliexpress_shorten_link: checked })}
                      id="aliexpress_shorten_link"
                      className="scale-75"
                    />
                  </div>
                  <Switch
                    checked={config.aliexpress_auto_publish || false}
                    onCheckedChange={(checked) => setConfig({ ...config, aliexpress_auto_publish: checked })}
                    id="aliexpress_auto_publish"
                    disabled={!config.aliexpress_enabled}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="kabum_auto_publish" className="font-medium">Kabum</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Publicar automaticamente após análise estratégica da IA
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 border-r pr-4 mr-2">
                    <Label htmlFor="kabum_shorten_link" className="text-xs text-muted-foreground cursor-pointer">Encurtar Link</Label>
                    <Switch
                      checked={config.kabum_shorten_link || false}
                      onCheckedChange={(checked) => setConfig({ ...config, kabum_shorten_link: checked })}
                      id="kabum_shorten_link"
                      className="scale-75"
                    />
                  </div>
                  <Switch
                    checked={config.kabum_auto_publish || false}
                    onCheckedChange={(checked) => setConfig({ ...config, kabum_auto_publish: checked })}
                    id="kabum_auto_publish"
                    disabled={!config.kabum_enabled}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="magazineluiza_auto_publish" className="font-medium">Magazine Luiza</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Publicar automaticamente após análise estratégica da IA
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 border-r pr-4 mr-2">
                    <Label htmlFor="magazineluiza_shorten_link" className="text-xs text-muted-foreground cursor-pointer">Encurtar Link</Label>
                    <Switch
                      checked={config.magazineluiza_shorten_link || false}
                      onCheckedChange={(checked) => setConfig({ ...config, magazineluiza_shorten_link: checked })}
                      id="magazineluiza_shorten_link"
                      className="scale-75"
                    />
                  </div>
                  <Switch
                    checked={config.magazineluiza_auto_publish || false}
                    onCheckedChange={(checked) => setConfig({ ...config, magazineluiza_auto_publish: checked })}
                    id="magazineluiza_auto_publish"
                    disabled={!config.magazineluiza_enabled}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="pichau_auto_publish" className="font-medium">Pichau</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Publicar automaticamente após análise estratégica da IA
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 border-r pr-4 mr-2">
                    <Label htmlFor="pichau_shorten_link" className="text-xs text-muted-foreground cursor-pointer">Encurtar Link</Label>
                    <Switch
                      checked={config.pichau_shorten_link || false}
                      onCheckedChange={(checked) => setConfig({ ...config, pichau_shorten_link: checked })}
                      id="pichau_shorten_link"
                      className="scale-75"
                    />
                  </div>
                  <Switch
                    checked={config.pichau_auto_publish || false}
                    onCheckedChange={(checked) => setConfig({ ...config, pichau_auto_publish: checked })}
                    id="pichau_auto_publish"
                    disabled={!config.pichau_enabled}
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <Brain className="inline mr-2 h-4 w-4" />
                <strong>Como funciona:</strong> A IA analisa qualidade, relevância, preço e competitividade.
                Produtos aprovados são publicados automaticamente. Produtos rejeitados ficam em /pending-products para revisão manual.
              </p>
            </div>
          </div>

          {/* Botões de Sincronização Individual */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-base">Sincronização Individual</Label>
            <p className="text-sm text-muted-foreground">
              Sincronize uma plataforma específica sem executar todas
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <Button
                onClick={() => handleRunPlatform('mercadolivre')}
                disabled={runningPlatform !== null || !config.mercadolivre_enabled}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {runningPlatform === 'mercadolivre' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Mercado Livre
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleRunPlatform('shopee')}
                disabled={runningPlatform !== null || !config.shopee_enabled}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {runningPlatform === 'shopee' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Shopee
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleRunPlatform('amazon')}
                disabled={runningPlatform !== null || !config.amazon_enabled}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {runningPlatform === 'amazon' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Amazon
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleRunPlatform('aliexpress')}
                disabled={runningPlatform !== null || !config.aliexpress_enabled}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {runningPlatform === 'aliexpress' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    AliExpress
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleRunPlatform('kabum')}
                disabled={runningPlatform !== null || !config.kabum_enabled}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {runningPlatform === 'kabum' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Kabum
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleRunPlatform('magazineluiza')}
                disabled={runningPlatform !== null || !config.magazineluiza_enabled}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {runningPlatform === 'magazineluiza' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Magazine Luiza
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleRunPlatform('pichau')}
                disabled={runningPlatform !== null || !config.pichau_enabled}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {runningPlatform === 'pichau' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Pichau
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Palavras-chave & AI Advanced */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <Label htmlFor="use_ai_keywords" className="font-semibold text-base">Palavras-Chave IA Advanced (TrendHunter)</Label>
                </div>
                <p className="text-xs text-muted-foreground mt-1 pr-4">
                  A IA busca automaticamente os produtos "quentes", promoções e termos virais do momento em cada plataforma.
                  <span className="font-bold text-purple-600 dark:text-purple-400"> (Recomendado)</span>
                </p>
              </div>
              <Switch
                checked={config.use_ai_keywords || false}
                onCheckedChange={(checked) => setConfig({ ...config, use_ai_keywords: checked })}
                id="use_ai_keywords"
              />
            </div>

            <div className={`space-y-2 transition-opacity ${config.use_ai_keywords ? 'opacity-50 pointer-events-none' : ''}`}>
              <Label htmlFor="keywords">Palavras-chave Manuais (separadas por vírgula)</Label>
              <Input
                id="keywords"
                placeholder="Ex: fones bluetooth, smartwatch, notebook gamer"
                value={config.keywords}
                onChange={(e) => setConfig({ ...config, keywords: e.target.value })}
                disabled={config.use_ai_keywords}
              />
              <p className="text-sm text-muted-foreground">
                {config.use_ai_keywords
                  ? "Desabilitado: A IA está controlando as buscas automaticamente."
                  : "Os produtos serão buscados especificamente com base nessas palavras-chave."}
              </p>
            </div>
          </div>

          {/* Desconto Mínimo */}
          <div className="space-y-2">
            <Label htmlFor="min_discount">Desconto Mínimo (%)</Label>
            <Input
              id="min_discount"
              type="number"
              min="0"
              max="100"
              value={config.min_discount_percentage || 10}
              onChange={(e) => setConfig({ ...config, min_discount_percentage: parseInt(e.target.value) || 10 })}
            />
            <p className="text-sm text-muted-foreground">
              Apenas produtos com desconto igual ou maior que este valor serão capturados
            </p>
          </div>

          {/* Intervalo do Cron */}
          <div className="space-y-2">
            <Label htmlFor="interval">Intervalo de Sincronização (minutos)</Label>
            <Input
              id="interval"
              type="number"
              min="1"
              max="1440"
              value={config.cron_interval_minutes || 60}
              onChange={(e) => setConfig({ ...config, cron_interval_minutes: parseInt(e.target.value) || 60 })}
            />
            <p className="text-sm text-muted-foreground">
              Com que frequência buscar novos produtos (1-1440 minutos)
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <Button onClick={handleSaveConfig} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configurações
                </>
              )}
            </Button>

            <Button onClick={handleRunNow} disabled={running} variant="outline">
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Rodar Agora
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Promoções Capturadas</CardTitle>
          <CardDescription>
            Histórico das sincronizações mais recentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enviado aos Bots</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma sincronização realizada ainda
                  </TableCell>
                </TableRow>
              ) : (
                history.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="max-w-xs truncate">
                      {log.product_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.platform === 'mercadolivre' ? 'default' : 'secondary'}>
                        {log.platform === 'mercadolivre' ? 'Mercado Livre' : 'Shopee'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600">
                        {log.discount_percentage}% OFF
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.is_new_product ? (
                        <Badge variant="default">Novo</Badge>
                      ) : (
                        <Badge variant="secondary">Já existe</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.sent_to_bots ? (
                        <Badge variant="default">✓ Enviado</Badge>
                      ) : (
                        <Badge variant="secondary">- Não</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(log.created_at)}
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
