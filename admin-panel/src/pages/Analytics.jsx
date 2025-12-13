import { useEffect, useState } from 'react';
import api from '../services/api';
import { TrendingUp, TrendingDown, Eye, MousePointerClick, Users, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7days');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get(`/analytics/detailed?period=${period}`);
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      // Se o endpoint não existir, usar dados mockados
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando analytics...</div>
      </div>
    );
  }

  // Dados reais ou mockados
  const clicksData = analytics?.charts?.clicks_vs_views || [
    { name: 'Seg', clicks: 120, views: 400 },
    { name: 'Ter', clicks: 150, views: 450 },
    { name: 'Qua', clicks: 180, views: 500 },
    { name: 'Qui', clicks: 200, views: 550 },
    { name: 'Sex', clicks: 250, views: 600 },
    { name: 'Sáb', clicks: 300, views: 700 },
    { name: 'Dom', clicks: 280, views: 650 },
  ];

  const categoryData = analytics?.charts?.categories || [
    { name: 'Eletrônicos', value: 400 },
    { name: 'Moda', value: 300 },
    { name: 'Casa', value: 200 },
    { name: 'Esportes', value: 150 },
    { name: 'Livros', value: 100 },
  ];

  const conversionData = analytics?.charts?.conversions || [
    { name: 'Jan', conversoes: 45 },
    { name: 'Fev', conversoes: 52 },
    { name: 'Mar', conversoes: 61 },
    { name: 'Abr', conversoes: 58 },
    { name: 'Mai', conversoes: 70 },
    { name: 'Jun', conversoes: 85 },
  ];

  const overview = analytics?.overview || {
    total_views: 3850,
    total_clicks: 1480,
    conversion_rate: 38.4,
    active_users: 892,
    clicks_growth: 8.2,
    views_growth: 12.5,
    conversion_growth: -2.1,
    users_growth: 15.3
  };

  const topProducts = analytics?.top_products || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada de performance
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('7days')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              period === '7days'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            7 dias
          </button>
          <button
            onClick={() => setPeriod('30days')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              period === '30days'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            30 dias
          </button>
          <button
            onClick={() => setPeriod('90days')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              period === '90days'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            90 dias
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Visualizações</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total_views.toLocaleString()}</div>
            <div className={`flex items-center text-xs mt-1 ${overview.views_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {overview.views_growth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {overview.views_growth >= 0 ? '+' : ''}{overview.views_growth}% vs período anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cliques em Produtos</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total_clicks.toLocaleString()}</div>
            <div className={`flex items-center text-xs mt-1 ${overview.clicks_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {overview.clicks_growth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {overview.clicks_growth >= 0 ? '+' : ''}{overview.clicks_growth}% vs período anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.conversion_rate}%</div>
            <div className={`flex items-center text-xs mt-1 ${overview.conversion_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {overview.conversion_growth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {overview.conversion_growth >= 0 ? '+' : ''}{overview.conversion_growth}% vs período anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.active_users.toLocaleString()}</div>
            <div className={`flex items-center text-xs mt-1 ${overview.users_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {overview.users_growth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {overview.users_growth >= 0 ? '+' : ''}{overview.users_growth}% vs período anterior
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Visualizações vs Cliques</CardTitle>
            <CardDescription>
              Comparação de visualizações e cliques nos últimos 7 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos por Categoria</CardTitle>
            <CardDescription>
              Distribuição de produtos por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversões Mensais</CardTitle>
          <CardDescription>
            Número de conversões por mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="conversoes" fill="#8884d8" name="Conversões" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Produtos Mais Clicados</CardTitle>
          <CardDescription>
            Produtos com melhor performance no período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum produto encontrado
              </div>
            ) : (
              topProducts.map((product, index) => (
                <div key={product.id || index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name || `Produto ${index + 1}`}</p>
                      <p className="text-sm text-muted-foreground">Categoria: {product.category || 'Sem categoria'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{product.clicks || 0} cliques</p>
                    <Badge variant="secondary" className="mt-1">
                      {product.ctr || 0}% CTR
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
