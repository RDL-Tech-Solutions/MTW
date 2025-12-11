import { useEffect, useState } from 'react';
import api from '../services/api';
import { Package, Ticket, Users, TrendingUp } from 'lucide-react';

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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.title} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {card.value}
                </p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Produtos Mais Clicados
          </h3>
          <div className="space-y-3">
            {stats?.most_clicked_products?.slice(0, 5).map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Produto #{product.product_id}</span>
                <span className="text-sm font-medium text-gray-900">
                  {product.click_count} cliques
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Cupons Mais Usados
          </h3>
          <div className="space-y-3">
            {stats?.most_used_coupons?.slice(0, 5).map((coupon, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{coupon.code}</span>
                <span className="text-sm font-medium text-gray-900">
                  {coupon.current_uses} usos
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
