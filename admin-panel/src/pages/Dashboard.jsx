import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Package, Ticket, Users, TrendingUp, Activity, ShoppingBag,
  Bot, MessageSquare, RefreshCw, Clock, AlertCircle, CheckCircle,
  ArrowUp, ArrowDown, Zap, Eye, MousePointerClick, Bell, Calendar,
  DollarSign, Percent, BarChart3, PieChart, TrendingDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { PlatformLogo } from '../utils/platformLogos.jsx';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [botStats, setBotStats] = useState(null);
  const [syncStats, setSyncStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      setLoading(true);

      const [dashboardRes, botStatsRes, syncStatsRes] = await Promise.allSettled([
        api.get(`/analytics/dashboard?days=${period}`),
        api.get('/bots/logs?limit=100'),
        api.get('/sync/stats?days=7')
      ]);

      if (dashboardRes.status === 'fulfilled') {
        setStats(dashboardRes.value.data.data);
      }


      if (botStatsRes.status === 'fulfilled') {
        const logs = botStatsRes.value.data.data?.logs || botStatsRes.value.data.data || [];
        const sent = logs.filter(log => log.status === 'sent' || log.success === true).length;
        const failed = logs.filter(log => log.status === 'failed' || log.success === false).length;
        const total = logs.length;

        setBotStats({
          total,
          sent,
          failed,
          success_rate: total > 0 ? ((sent / total) * 100).toFixed(1) : 0,
          recent_logs: logs.slice(0, 5)
        });
      }

      if (syncStatsRes.status === 'fulfilled') {
        setSyncStats(syncStatsRes.value.data.data);
      }

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="text-muted-foreground">Carregando dashboard...</div>
        </div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const mainMetrics = [
    {
      title: 'Total de Produtos',
      value: stats?.overview?.total_products || 0,
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      iconColor: 'text-blue-600 dark:text-blue-400',
      change: '+12%',
      changeType: 'up',
      description: 'Produtos cadastrados'
    },
    {
      title: 'Cupons Ativos',
      value: stats?.overview?.total_coupons || 0,
      icon: Ticket,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
      iconColor: 'text-green-600 dark:text-green-400',
      change: '+8%',
      changeType: 'up',
      description: 'Cupons disponíveis'
    },
    {
      title: 'Usuários Ativos',
      value: stats?.overview?.total_users || 0,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      iconColor: 'text-purple-600 dark:text-purple-400',
      change: '+15%',
      changeType: 'up',
      description: 'Usuários registrados'
    },
    {
      title: 'Taxa de Conversão',
      value: `${stats?.overview?.conversion_rate || 0}%`,
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      iconColor: 'text-orange-600 dark:text-orange-400',
      change: stats?.overview?.conversion_rate > 0 ? '+2.5%' : '0%',
      changeType: stats?.overview?.conversion_rate > 0 ? 'up' : 'neutral',
      description: 'Cliques convertidos'
    }
  ];

  const engagementMetrics = [
    {
      title: 'Total de Cliques',
      value: stats?.overview?.total_clicks || 0,
      icon: MousePointerClick,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      change: '+22%',
      changeType: 'up'
    },
    {
      title: 'Conversões',
      value: stats?.overview?.total_conversions || 0,
      icon: CheckCircle,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      change: '+18%',
      changeType: 'up'
    },
    {
      title: 'Notificações Enviadas',
      value: botStats?.sent || 0,
      icon: Bell,
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      change: `${botStats?.success_rate || 0}%`,
      changeType: 'neutral'
    },
    {
      title: 'Taxa de Sucesso',
      value: `${botStats?.success_rate || 0}%`,
      icon: Zap,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      change: botStats?.failed > 0 ? `${botStats.failed} falhas` : 'Sem falhas',
      changeType: botStats?.failed > 0 ? 'down' : 'up'
    }
  ];

  const clicksChartData = stats?.most_clicked_products?.slice(0, 10).map((item, index) => ({
    name: `P${index + 1}`,
    cliques: item.click_count || 0,
    fullName: `Produto #${item.product_id}`
  })) || [];

  const couponsChartData = stats?.most_used_coupons?.slice(0, 10).map((coupon) => ({
    name: coupon.code?.substring(0, 8) || 'N/A',
    usos: coupon.current_uses || 0,
    fullCode: coupon.code
  })) || [];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão geral e métricas do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
            className="h-10 px-3 rounded-lg border border-input bg-background text-sm hover:bg-accent transition-colors"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="h-10 px-4 rounded-lg border border-input bg-background hover:bg-accent text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>


      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mainMetrics.map((metric) => (
          <Card key={metric.title} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className={`h-2 bg-gradient-to-r ${metric.color}`}></div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${metric.bgColor} p-3 rounded-xl`}>
                    <metric.icon className={`h-6 w-6 ${metric.iconColor}`} />
                  </div>
                  {metric.changeType !== 'neutral' && (
                    <Badge variant={metric.changeType === 'up' ? 'success' : 'destructive'} className="text-xs">
                      {metric.changeType === 'up' ? (
                        <ArrowUp className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDown className="h-3 w-3 mr-1" />
                      )}
                      {metric.change}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <p className="text-3xl font-bold">{metric.value}</p>
                  {metric.description && (
                    <p className="text-xs text-muted-foreground">{metric.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Métricas de Engajamento */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {engagementMetrics.map((metric) => (
          <Card key={metric.title} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className={`h-1.5 bg-gradient-to-r ${metric.color}`}></div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`${metric.bgColor} p-2.5 rounded-lg`}>
                    <metric.icon className={`h-5 w-5 ${metric.iconColor}`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.change}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos Principais */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Produtos Mais Clicados */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Produtos Mais Clicados
                </CardTitle>
                <CardDescription className="mt-1">
                  Top 10 produtos com mais engajamento
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {clicksChartData.length} produtos
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {clicksChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clicksChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value, name, props) => [value, props.payload.fullName]}
                  />
                  <Bar 
                    dataKey="cliques" 
                    fill="#3b82f6" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Package className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cupons Mais Usados */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-green-600" />
                  Cupons Mais Usados
                </CardTitle>
                <CardDescription className="mt-1">
                  Top 10 cupons com maior utilização
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {couponsChartData.length} cupons
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {couponsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={couponsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value, name, props) => [value, props.payload.fullCode]}
                  />
                  <Bar 
                    dataKey="usos" 
                    fill="#10b981" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Ticket className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Estatísticas de Bots e Sincronização */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Estatísticas de Bots */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-600" />
                  Estatísticas de Notificações
                </CardTitle>
                <CardDescription className="mt-1">
                  Notificações enviadas pelos bots
                </CardDescription>
              </div>
              <Badge 
                variant={botStats?.success_rate >= 90 ? 'success' : botStats?.success_rate >= 70 ? 'warning' : 'destructive'}
                className="text-xs"
              >
                {botStats?.success_rate || 0}% sucesso
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total</p>
                <p className="text-2xl font-bold text-blue-600">{botStats?.total || 0}</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Enviadas</p>
                <p className="text-2xl font-bold text-green-600">{botStats?.sent || 0}</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Falhas</p>
                <p className="text-2xl font-bold text-red-600">{botStats?.failed || 0}</p>
              </div>
            </div>

            {botStats?.recent_logs && botStats.recent_logs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Atividades Recentes
                </h4>
                <div className="space-y-2">
                  {botStats.recent_logs.map((log, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {log.status === 'sent' || log.success ? (
                          <div className="p-1.5 bg-green-100 dark:bg-green-900 rounded-full">
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-red-100 dark:bg-red-900 rounded-full">
                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {log.event_type === 'promotion_new' ? 'Nova Promoção' :
                              log.event_type === 'coupon_new' ? 'Novo Cupom' :
                                log.event_type || 'Notificação'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : 'Agora'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={log.status === 'sent' || log.success ? 'success' : 'destructive'}>
                        {log.status === 'sent' || log.success ? 'Enviado' : 'Falhou'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estatísticas de Sincronização */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-indigo-600" />
                  Sincronização de Produtos
                </CardTitle>
                <CardDescription className="mt-1">
                  Últimas sincronizações automáticas
                </CardDescription>
              </div>
              {syncStats?.last_sync && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(syncStats.last_sync).toLocaleDateString('pt-BR')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {syncStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Sincronizado</p>
                    <p className="text-2xl font-bold text-blue-600">{syncStats.total || 0}</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Novos Produtos</p>
                    <p className="text-2xl font-bold text-green-600">{syncStats.new || 0}</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Erros</p>
                    <p className="text-2xl font-bold text-red-600">{syncStats.errors || 0}</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Taxa de Sucesso</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {syncStats.total > 0 
                        ? ((((syncStats.total - syncStats.errors) / syncStats.total) * 100).toFixed(1))
                        : 0}%
                    </p>
                  </div>
                </div>

                {syncStats.platforms && Object.keys(syncStats.platforms).length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      Por Plataforma
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(syncStats.platforms).map(([platform, data]) => (
                        <div 
                          key={platform} 
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <PlatformLogo platform={platform} size={20} />
                            <span className="text-sm font-medium capitalize">{platform}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {data.new || 0} novos
                            </Badge>
                            <Badge 
                              variant={data.errors > 0 ? 'destructive' : 'success'}
                              className="text-xs"
                            >
                              {data.errors || 0} erros
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <RefreshCw className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">Nenhum dado de sincronização disponível</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Rankings - Top Produtos e Cupons */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Produtos */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  Top 5 Produtos
                </CardTitle>
                <CardDescription className="mt-1">
                  Produtos com mais engajamento
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Por cliques
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.most_clicked_products?.slice(0, 5).map((product, index) => {
                const maxClicks = stats.most_clicked_products[0]?.click_count || 1;
                const percentage = ((product.click_count / maxClicks) * 100).toFixed(0);
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`
                          flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                          ${index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                            index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                            index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}
                        `}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            Produto #{product.product_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.click_count} cliques
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        <MousePointerClick className="h-3 w-3 mr-1" />
                        {product.click_count}
                      </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {(!stats?.most_clicked_products || stats.most_clicked_products.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mb-2 opacity-20" />
                  <p className="text-sm">Nenhum produto encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Cupons */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-green-600" />
                  Top 5 Cupons
                </CardTitle>
                <CardDescription className="mt-1">
                  Cupons mais utilizados
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Por usos
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.most_used_coupons?.slice(0, 5).map((coupon, index) => {
                const maxUses = stats.most_used_coupons[0]?.current_uses || 1;
                const percentage = ((coupon.current_uses / maxUses) * 100).toFixed(0);
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`
                          flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                          ${index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                            index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                            index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                            'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}
                        `}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium font-mono">
                            {coupon.code}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {coupon.current_uses} usos
                          </p>
                        </div>
                      </div>
                      <Badge variant="success" className="text-xs">
                        <Ticket className="h-3 w-3 mr-1" />
                        {coupon.current_uses}
                      </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {(!stats?.most_used_coupons || stats.most_used_coupons.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Ticket className="h-12 w-12 mb-2 opacity-20" />
                  <p className="text-sm">Nenhum cupom encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Rápido */}
      <Card className="hover:shadow-lg transition-shadow border-2">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Resumo Rápido
          </CardTitle>
          <CardDescription>
            Visão geral das principais métricas do período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
              <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">{stats?.overview?.total_products || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Produtos</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg">
              <Ticket className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{stats?.overview?.total_coupons || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Cupons</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">{stats?.overview?.total_users || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Usuários</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold text-orange-600">{stats?.overview?.conversion_rate || 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">Conversão</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
