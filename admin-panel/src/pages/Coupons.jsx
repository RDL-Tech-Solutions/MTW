import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await api.get('/coupons/admin/all');
      setCoupons(response.data.data.coupons || []);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Cupons</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-900">{coupon.code}</h3>
              <span className={`px-2 py-1 text-xs rounded ${coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {coupon.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Desconto: {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `R$ ${coupon.discount_value}`}
            </p>
            <p className="text-sm text-gray-600">
              Válido até: {new Date(coupon.valid_until).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Usos: {coupon.current_uses} {coupon.max_uses ? `/ ${coupon.max_uses}` : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
