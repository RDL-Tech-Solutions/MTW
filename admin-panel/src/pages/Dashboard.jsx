import { useEffect, useState } from 'react';
import api from '../services/api';
import { Package, Ticket, Users, TrendingUp, Activity, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setStats(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total de Produtos',
      value: stats?.overview?.total_products || 0,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      title: 'Cupons Ativos',
      value: stats?.overview?.total_coupons || 0,
      icon: Ticket,
      color: 'bg-green-500',
    },
    {
      title: 'Usuários',
      value: stats?.overview?.total_users || 0,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      title: 'Taxa de Conversão',
      value: `${stats?.overview?.conversion_rate || 0}%`,
      icon: TrendingUp,
      color: 'bg-primary',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do sistema PreçoCerto</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`${card.color} p-2 rounded-lg`}>
                <card.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Atualizado agora
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
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
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
