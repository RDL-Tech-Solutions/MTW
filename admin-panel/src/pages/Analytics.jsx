import { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  TrendingUp, TrendingDown, Eye, MousePointerClick, Users, ShoppingBag,
  RefreshCw, Calendar, BarChart3, PieChart as PieChartIcon, Activity, Package
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7days');
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/analytics/detailed?period=${period}`);
      if (response.data && response.data.success) {
        setAnalytics(response.data.data);
      } else {
        setAnalytics(null);
      }
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      
      // Verificar se é erro de conexão
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error') || error.message.includes('CONNECTION_REFUSED')) {
        const errorMsg = 'Backend não está acessível. Verifique se o servidor está rodando na porta 3000.';
        console.warn('⚠️', errorMsg);
        setError(errorMsg);
        setAnalytics(null);
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        const errorMsg = 'Não autorizado. Faça login novamente.';
        console.warn('⚠️', errorMsg);
        setError(errorMsg);
        setAnalytics(null);
      } else {
        // Outros erros
        setError(error.response?.data?.message || error.message || 'Erro ao carregar analytics');
        setAnalytics(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="text-muted-foreground">Carregando analytics...</div>
        </div>
      </div>
    );
  }

  // Mensagem de erro se o backend não estiver disponível
  if (error && !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Análise detalhada de performance
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="text-6xl">⚠️</div>
            <h2 className="text-2xl font-semibold">Erro ao carregar analytics</h2>
            <p className="text-muted-foreground max-w-md">
              {error}
            </p>
            <Button onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Dados reais ou fallback
  const clicksData = analytics?.charts?.clicks_vs_views || [];
  const categoryData = analytics?.charts?.categories || [];
  const conversionData = analytics?.charts?.conversions || [];
  const overview = analytics?.overview || {
    total_views: 0,
    total_clicks: 0,
    conversion_rate: 0,
    active_users: 0,
    clicks_growth: 0,
    views_growth: 0,
    conversion_growth: 0,
    users_growth: 0
  };
  const topProducts = analytics?.top_products || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada de performance e métricas do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2 border rounded-md p-1">
            <button
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                period === '7days'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              7 dias
            </button>
            <button
              onClick={() => setPeriod('30days')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                period === '30days'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              30 dias
            </button>
            <button
              onClick={() => setPeriod('90days')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                period === '90days'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              90 dias
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Visualizações</CardTitle>
            <div className="bg-blue-500 p-2 rounded-lg">
              <Eye className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total_views?.toLocaleString() || 0}</div>
            <div className={`flex items-center text-xs mt-1 ${overview.views_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {overview.views_growth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {overview.views_growth >= 0 ? '+' : ''}{overview.views_growth || 0}% vs período anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cliques em Produtos</CardTitle>
            <div className="bg-green-500 p-2 rounded-lg">
              <MousePointerClick className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total_clicks?.toLocaleString() || 0}</div>
            <div className={`flex items-center text-xs mt-1 ${overview.clicks_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {overview.clicks_growth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {overview.clicks_growth >= 0 ? '+' : ''}{overview.clicks_growth || 0}% vs período anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <div className="bg-orange-500 p-2 rounded-lg">
              <ShoppingBag className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parseFloat(overview.conversion_rate || 0).toFixed(2)}%</div>
            <div className={`flex items-center text-xs mt-1 ${overview.conversion_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {overview.conversion_growth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {overview.conversion_growth >= 0 ? '+' : ''}{overview.conversion_growth || 0}% vs período anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <div className="bg-purple-500 p-2 rounded-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.active_users?.toLocaleString() || 0}</div>
            <div className={`flex items-center text-xs mt-1 ${overview.users_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {overview.users_growth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {overview.users_growth >= 0 ? '+' : ''}{overview.users_growth || 0}% vs período anterior
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Visualizações vs Cliques
            </CardTitle>
            <CardDescription>
              Comparação de visualizações e cliques no período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clicksData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={clicksData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="views" stroke="#8884d8" strokeWidth={2} name="Visualizações" />
                  <Line type="monotone" dataKey="clicks" stroke="#82ca9d" strokeWidth={2} name="Cliques" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum dado disponível</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Produtos por Categoria
            </CardTitle>
            <CardDescription>
              Distribuição de produtos por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <PieChartIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum dado disponível</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversões Mensais - CORRIGIDO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Conversões Mensais
          </CardTitle>
          <CardDescription>
            Número de conversões por mês (últimos 6 meses)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {conversionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} conversões`, 'Conversões']}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Legend />
                <Bar dataKey="conversoes" fill="#8884d8" name="Conversões" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma conversão registrada ainda</p>
                <p className="text-xs mt-1">As conversões aparecerão aqui quando houver cliques convertidos</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Produtos Mais Clicados</CardTitle>
          <CardDescription>
            Produtos com melhor performance no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum produto encontrado</p>
              </div>
            ) : (
              topProducts.map((product, index) => (
                <div key={product.id || index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name || `Produto ${index + 1}`}</p>
                      <p className="text-sm text-muted-foreground">
                        Categoria: {product.category || 'Sem categoria'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{product.clicks || 0} cliques</p>
                    <Badge variant="secondary" className="mt-1">
                      {product.ctr ? `${product.ctr.toFixed(1)}%` : '0%'} CTR
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
