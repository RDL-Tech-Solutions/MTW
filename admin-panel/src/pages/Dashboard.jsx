import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Package, Ticket, Users, TrendingUp, Activity, ShoppingBag,
  Bot, MessageSquare, RefreshCw, Clock, AlertCircle, CheckCircle,
  ArrowUp, ArrowDown, Zap, Eye, MousePointerClick, Bell
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [botStats, setBotStats] = useState(null);
  const [syncStats, setSyncStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Buscar dados em paralelo
      const [dashboardRes, botStatsRes, syncStatsRes, productStatsRes, userStatsRes] = await Promise.allSettled([
        api.get(`/analytics/dashboard?days=${period}`),
        api.get('/bots/logs?limit=100'),
        api.get('/sync/stats?days=7'),
        api.get('/products/stats'),
        api.get('/users/stats')
      ]);

      // Processar dashboard
      if (dashboardRes.status === 'fulfilled') {
        setStats(dashboardRes.value.data.data);
      }

      // Processar estatísticas de bots
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

      // Processar estatísticas de sincronização
      if (syncStatsRes.status === 'fulfilled') {
        setSyncStats(syncStatsRes.value.data.data);
      }

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="text-muted-foreground">Carregando dashboard...</div>
        </div>
      </div>
    );
  }

  // Preparar dados para gráficos
  const clicksChartData = stats?.most_clicked_products?.slice(0, 7).map((item, index) => ({
    name: `Produto ${index + 1}`,
    cliques: item.click_count || 0
  })) || [];

  const couponsChartData = stats?.most_used_coupons?.slice(0, 7).map((coupon, index) => ({
    name: coupon.code || `Cupom ${index + 1}`,
    usos: coupon.current_uses || 0
  })) || [];

  // Cards principais
  const mainCards = [
    {
      title: 'Total de Produtos',
      value: stats?.overview?.total_products || 0,
      icon: Package,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'up'
    },
    {
      title: 'Cupons Ativos',
      value: stats?.overview?.total_coupons || 0,
      icon: Ticket,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'up'
    },
    {
      title: 'Usuários',
      value: stats?.overview?.total_users || 0,
      icon: Users,
      color: 'bg-purple-500',
      change: '+15%',
      changeType: 'up'
    },
    {
      title: 'Taxa de Conversão',
      value: `${stats?.overview?.conversion_rate || 0}%`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: stats?.overview?.conversion_rate > 0 ? '+2.5%' : '0%',
      changeType: stats?.overview?.conversion_rate > 0 ? 'up' : 'neutral'
    },
    {
      title: 'Total de Cliques',
      value: stats?.overview?.total_clicks || 0,
      icon: MousePointerClick,
      color: 'bg-indigo-500',
      change: '+22%',
      changeType: 'up'
    },
    {
      title: 'Conversões',
      value: stats?.overview?.total_conversions || 0,
      icon: CheckCircle,
      color: 'bg-emerald-500',
      change: '+18%',
      changeType: 'up'
    }
  ];

  // Cards de bots
  const botCards = [
    {
      title: 'Notificações Enviadas',
      value: botStats?.sent || 0,
      icon: Bell,
      color: 'bg-green-500',
      subtitle: `${botStats?.success_rate || 0}% de sucesso`
    },
    {
      title: 'Notificações Falhadas',
      value: botStats?.failed || 0,
      icon: AlertCircle,
      color: 'bg-red-500',
      subtitle: `${botStats?.total || 0} total`
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Responsivo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Visão geral do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
            className="h-9 sm:h-10 px-2 sm:px-3 rounded-md border border-input bg-background text-xs sm:text-sm flex-1 sm:flex-none"
          >
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
            <option value={90}>90 dias</option>
          </select>
          <button
            onClick={fetchDashboardData}
            className="h-9 sm:h-10 px-3 sm:px-4 rounded-md border border-input bg-background hover:bg-accent text-sm flex-shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cards Principais - Grid Responsivo */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {mainCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`${card.color} p-1.5 sm:p-2 rounded-lg`}>
                <card.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{card.value}</div>
              <div className="flex items-center text-[10px] sm:text-xs mt-1">
                {card.changeType === 'up' && (
                  <span className="text-green-600 flex items-center">
                    <ArrowUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                    {card.change}
                  </span>
                )}
                {card.changeType === 'down' && (
                  <span className="text-red-600 flex items-center">
                    <ArrowDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                    {card.change}
                  </span>
                )}
                {card.changeType === 'neutral' && (
                  <span className="text-muted-foreground">{card.change}</span>
                )}
                <span className="text-muted-foreground ml-1 sm:ml-2 hidden sm:inline">vs anterior</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos - Responsivos */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-sm sm:text-base">Produtos Mais Clicados</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Top produtos com mais engajamento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {clicksChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200} className="sm:!h-[280px]">
                <BarChart data={clicksChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="cliques" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] sm:h-[280px] text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-sm sm:text-base">Cupons Mais Usados</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Cupons com maior taxa de utilização
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {couponsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200} className="sm:!h-[280px]">
                <BarChart data={couponsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="usos" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] sm:h-[280px] text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas de Bots e Sincronização */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Estatísticas de Bots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Estatísticas de Bots
            </CardTitle>
            <CardDescription>
              Notificações enviadas pelos bots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              {botCards.map((card) => (
                <div key={card.title} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{card.title}</span>
                    <div className={`${card.color} p-2 rounded-lg`}>
                      <card.icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                </div>
              ))}
            </div>

            {botStats?.recent_logs && botStats.recent_logs.length > 0 && (
              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-medium">Atividades Recentes</h4>
                <div className="space-y-2">
                  {botStats.recent_logs.map((log, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        {log.status === 'sent' || log.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-muted-foreground">
                          {log.event_type === 'promotion_new' ? 'Nova Promoção' :
                            log.event_type === 'coupon_new' ? 'Novo Cupom' :
                              log.event_type || 'Notificação'}
                        </span>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Estatísticas de Sincronização
            </CardTitle>
            <CardDescription>
              Últimas sincronizações de produtos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {syncStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sincronizado</p>
                    <p className="text-2xl font-bold">{syncStats.total || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Novos Produtos</p>
                    <p className="text-2xl font-bold text-green-600">{syncStats.new || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Erros</p>
                    <p className="text-2xl font-bold text-red-600">{syncStats.errors || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Última Sincronização</p>
                    <p className="text-sm font-medium">
                      {syncStats.last_sync
                        ? new Date(syncStats.last_sync).toLocaleString('pt-BR')
                        : 'Nunca'}
                    </p>
                  </div>
                </div>

                {syncStats.platforms && Object.keys(syncStats.platforms).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Por Plataforma</h4>
                    <div className="space-y-2">
                      {Object.entries(syncStats.platforms).map(([platform, data]) => (
                        <div key={platform} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                          <span className="capitalize">{platform}</span>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">{data.new || 0} novos</Badge>
                            <Badge variant={data.errors > 0 ? 'destructive' : 'success'}>
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
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Nenhum dado de sincronização disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Produtos e Cupons */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Clicados</CardTitle>
            <CardDescription>
              Top 5 produtos com mais engajamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.most_clicked_products?.slice(0, 5).map((product, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm mr-3">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Produto #{product.product_id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {product.click_count} cliques
                    </p>
                  </div>
                  <Badge variant="secondary">
                    <Activity className="mr-1 h-3 w-3" />
                    {product.click_count}
                  </Badge>
                </div>
              ))}
              {(!stats?.most_clicked_products || stats.most_clicked_products.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum produto encontrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cupons Mais Usados</CardTitle>
            <CardDescription>
              Cupons com maior taxa de utilização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.most_used_coupons?.slice(0, 5).map((coupon, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {coupon.code}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {coupon.current_uses} usos
                    </p>
                  </div>
                  <Badge variant="success">
                    <Ticket className="mr-1 h-3 w-3" />
                    {coupon.current_uses}
                  </Badge>
                </div>
              ))}
              {(!stats?.most_used_coupons || stats.most_used_coupons.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum cupom encontrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
