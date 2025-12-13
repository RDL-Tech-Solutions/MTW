import { useEffect, useState } from 'react';
import api from '../services/api';
import { Bell, Send, Search, Filter, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    pending: 0,
    failed: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Buscar estatísticas de notificações
      const response = await api.get('/notifications/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const getTypeBadge = (type) => {
    const types = {
      new_product: { label: 'Novo Produto', variant: 'default' },
      new_coupon: { label: 'Novo Cupom', variant: 'success' },
      coupon_expiring: { label: 'Cupom Expirando', variant: 'warning' },
      favorite_discount: { label: 'Desconto Favorito', variant: 'info' },
    };
    const typeInfo = types[type] || { label: type, variant: 'default' };
    return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notificações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie notificações push e preferências dos usuários
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Notificações</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
            <Send className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            <p className="text-xs text-muted-foreground">Com sucesso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Aguardando envio</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhas</CardTitle>
            <Bell className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Erros no envio</p>
          </CardContent>
        </Card>
      </div>

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle>Sistema de Notificações</CardTitle>
          <CardDescription>
            O sistema de notificações push está configurado para enviar alertas baseados nas preferências dos usuários.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Como funciona:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Usuários podem configurar preferências por categoria, palavra-chave ou nome de produto</li>
              <li>Quando um novo produto é publicado, o sistema verifica as preferências de cada usuário</li>
              <li>Notificações são enviadas apenas para usuários que correspondem aos critérios</li>
              <li>As notificações são enviadas via Expo Push Notifications</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Preferências dos Usuários:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Categorias:</strong> Usuários podem selecionar categorias para receber notificações</li>
              <li><strong>Palavras-chave:</strong> Usuários podem adicionar palavras-chave para filtrar produtos</li>
              <li><strong>Nomes de Produtos:</strong> Usuários podem adicionar nomes específicos de produtos</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

