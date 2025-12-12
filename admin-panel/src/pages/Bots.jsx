import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash2, MessageSquare, Send, Activity } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';

export default function Bots() {
  const { toast } = useToast();
  const [channels, setChannels] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [formData, setFormData] = useState({
    platform: 'telegram',
    channel_id: '',
    channel_name: '',
    is_active: true
  });

  useEffect(() => {
    fetchChannels();
    fetchLogs();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await api.get('/bots/channels');
      setChannels(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar canais:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await api.get('/bots/logs?limit=10');
      setLogs(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente deletar este canal?')) return;
    
    try {
      await api.delete(`/bots/channels/${id}`);
      fetchChannels();
      toast({
        title: "Sucesso!",
        description: "Canal deletado com sucesso.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Erro!",
        description: "Erro ao deletar canal. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (channel) => {
    setEditingChannel(channel);
    setFormData({
      platform: channel.platform,
      channel_id: channel.channel_id,
      channel_name: channel.channel_name,
      is_active: channel.is_active
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingChannel) {
        await api.put(`/bots/channels/${editingChannel.id}`, formData);
        toast({
          title: "Sucesso!",
          description: "Canal atualizado com sucesso.",
          variant: "success",
        });
      } else {
        await api.post('/bots/channels', formData);
        toast({
          title: "Sucesso!",
          description: "Canal criado com sucesso.",
          variant: "success",
        });
      }
      setIsDialogOpen(false);
      setEditingChannel(null);
      setFormData({
        platform: 'telegram',
        channel_id: '',
        channel_name: '',
        is_active: true
      });
      fetchChannels();
    } catch (error) {
      toast({
        title: "Erro!",
        description: "Erro ao salvar canal. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleTestNotification = async (channelId) => {
    try {
      await api.post(`/bots/channels/${channelId}/test`);
      toast({
        title: "Sucesso!",
        description: "Notificação de teste enviada!",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Erro!",
        description: "Erro ao enviar notificação de teste.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando bots...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bots de Notificação</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os canais de WhatsApp e Telegram
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingChannel(null);
              setFormData({
                platform: 'telegram',
                channel_id: '',
                channel_name: '',
                is_active: true
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Canal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingChannel ? 'Editar Canal' : 'Novo Canal'}
              </DialogTitle>
              <DialogDescription>
                Configure um canal para receber notificações
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Plataforma *</Label>
                <select
                  id="platform"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.platform}
                  onChange={(e) => setFormData({...formData, platform: e.target.value})}
                >
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="channel_id">
                  {formData.platform === 'telegram' ? 'Chat ID' : 'Número do WhatsApp'} *
                </Label>
                <Input
                  id="channel_id"
                  value={formData.channel_id}
                  onChange={(e) => setFormData({...formData, channel_id: e.target.value})}
                  placeholder={formData.platform === 'telegram' ? '-1001234567890' : '5511999999999'}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel_name">Nome do Canal *</Label>
                <Input
                  id="channel_name"
                  value={formData.channel_name}
                  onChange={(e) => setFormData({...formData, channel_name: e.target.value})}
                  placeholder="Ex: Canal Principal"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_active">Canal ativo</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingChannel ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Canais</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{channels.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Canais configurados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canais Ativos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {channels.filter(c => c.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recebendo notificações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notificações Enviadas</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Últimas 10 notificações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Canais */}
      <Card>
        <CardHeader>
          <CardTitle>Canais Configurados</CardTitle>
          <CardDescription>
            Gerencie os canais que recebem notificações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plataforma</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>ID do Canal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum canal configurado
                  </TableCell>
                </TableRow>
              ) : (
                channels.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {channel.platform}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{channel.channel_name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {channel.channel_id}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={channel.is_active ? 'success' : 'destructive'}>
                        {channel.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestNotification(channel.id)}
                        >
                          <Send className="mr-1 h-3 w-3" />
                          Testar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(channel)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(channel.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Logs de Notificações */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Notificações</CardTitle>
          <CardDescription>
            Histórico das notificações enviadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma notificação enviada ainda
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-medium">{log.event_type}</p>
                      <p className="text-xs text-muted-foreground">
                        Canal: {log.channel_name} ({log.platform})
                      </p>
                    </div>
                  </div>
                  <Badge variant={log.success ? 'success' : 'destructive'}>
                    {log.success ? 'Enviado' : 'Falhou'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
