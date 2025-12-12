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
import { RefreshCw, Save, Play, TrendingUp, Package, AlertCircle } from 'lucide-react';

export default function AutoSync() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [config, setConfig] = useState({
    shopee_enabled: false,
    mercadolivre_enabled: false,
    keywords: '',
    min_discount_percentage: 10,
    categories: [],
    cron_interval_minutes: 60,
    is_active: false
  });
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);

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
        keywords: data.keywords || '',
        min_discount_percentage: data.min_discount_percentage || 10,
        categories: data.categories || [],
        cron_interval_minutes: data.cron_interval_minutes || 60,
        is_active: data.is_active || false
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
      setStats(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
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

  const handleRunNow = async () => {
    try {
      setRunning(true);
      
      toast({
        title: "Sincronização iniciada",
        description: "Aguarde enquanto buscamos novos produtos...",
      });

      const response = await api.post('/sync/run-now');
      const results = response.data.data;

      const totalNew = results.mercadolivre.new + results.shopee.new;
      const totalFound = results.mercadolivre.total + results.shopee.total;

      toast({
        title: "Sincronização concluída!",
        description: `${totalNew} produtos novos de ${totalFound} encontrados.`,
      });

      fetchHistory();
      fetchStats();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Automação de Produtos</h1>
        <p className="text-muted-foreground mt-2">
          Capture automaticamente promoções da Shopee e Mercado Livre
        </p>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sincronizados</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtos Novos</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.new_products}</div>
              <p className="text-xs text-muted-foreground">Adicionados ao catálogo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mercado Livre</CardTitle>
              <Package className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.mercadolivre}</div>
              <p className="text-xs text-muted-foreground">Produtos capturados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Shopee</CardTitle>
              <Package className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.shopee}</div>
              <p className="text-xs text-muted-foreground">Produtos capturados</p>
            </CardContent>
          </Card>
        </div>
      )}

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
          </div>

          {/* Palavras-chave */}
          <div className="space-y-2">
            <Label htmlFor="keywords">Palavras-chave (separadas por vírgula)</Label>
            <Input
              id="keywords"
              placeholder="Ex: fones bluetooth, smartwatch, notebook gamer"
              value={config.keywords}
              onChange={(e) => setConfig({ ...config, keywords: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              Os produtos serão buscados com base nessas palavras-chave
            </p>
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
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>

            <Button onClick={handleRunNow} disabled={running} variant="outline">
              {running ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {running ? 'Executando...' : 'Rodar Agora'}
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
