import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Categories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {categories.map((category) => (
          <div key={category.id} className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl mb-2">{category.icon}</div>
            <h3 className="font-semibold text-gray-900">{category.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{category.product_count || 0} produtos</p>
          </div>
        ))}
      </div>
    </div>
  );
}
