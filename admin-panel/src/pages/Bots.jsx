import { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  Plus, Edit, Trash2, MessageSquare, Send, Activity, 
  Settings, Bot, CheckCircle, XCircle, Eye, EyeOff,
  Wifi, WifiOff, RefreshCw, Save, AlertCircle
} from 'lucide-react';
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
  
  // Estados
  const [activeTab, setActiveTab] = useState('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState({ telegram: false, whatsapp: false });
  
  // Status dos bots
  const [status, setStatus] = useState({
    telegram: { configured: false, working: false },
    whatsapp: { configured: false, working: false }
  });
  
  // Configurações - garantir valores padrão não-nulos
  const defaultConfig = {
    // Telegram
    telegram_enabled: false,
    telegram_bot_token: '',
    telegram_bot_username: '',
    telegram_parse_mode: 'Markdown',
    telegram_disable_preview: false,
    
    // WhatsApp
    whatsapp_enabled: false,
    whatsapp_api_url: 'https://graph.facebook.com/v18.0',
    whatsapp_api_token: '',
    whatsapp_phone_number_id: '',
    whatsapp_business_account_id: '',
    
    // Notificações
    notify_new_products: true,
    notify_new_coupons: true,
    notify_expired_coupons: false,
    notify_price_drops: true,
    min_discount_to_notify: 20,
    
    // Rate limiting
    rate_limit_per_minute: 20,
    delay_between_messages: 500
  };
  
  const [config, setConfig] = useState(defaultConfig);
  
  // Canais e logs
  const [channels, setChannels] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Mostrar/ocultar tokens
  const [showTokens, setShowTokens] = useState({
    telegram: false,
    whatsapp: false
  });
  
  // Dialog de canal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [channelForm, setChannelForm] = useState({
    platform: 'telegram',
    channel_id: '',
    channel_name: '',
    is_active: true
  });

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchConfig(),
        fetchStatus(),
        fetchChannels(),
        fetchLogs()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await api.get('/bots/config');
      if (response.data.data) {
        // Mesclar com defaults para garantir que não haja valores null
        const fetchedConfig = response.data.data;
        const mergedConfig = { ...defaultConfig };
        
        // Substituir apenas valores não-nulos
        Object.keys(fetchedConfig).forEach(key => {
          if (fetchedConfig[key] !== null && fetchedConfig[key] !== undefined) {
            mergedConfig[key] = fetchedConfig[key];
          }
        });
        
        setConfig(mergedConfig);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await api.get('/bots/status');
      if (response.data.data) {
        setStatus(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    }
  };

  const fetchChannels = async () => {
    try {
      const response = await api.get('/bots/channels');
      setChannels(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar canais:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await api.get('/bots/logs?limit=20');
      setLogs(response.data.data?.logs || response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  };

  // Salvar configurações
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await api.post('/bots/config', config);
      toast({
        title: "Sucesso!",
        description: "Configurações salvas com sucesso.",
        variant: "success"
      });
      await fetchStatus();
    } catch (error) {
      toast({
        title: "Erro!",
        description: "Erro ao salvar configurações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Testar Telegram
  const handleTestTelegram = async () => {
    setTesting(prev => ({ ...prev, telegram: true }));
    try {
      // Não enviar token se estiver mascarado (contém ...)
      const tokenToSend = config.telegram_bot_token?.includes('...') 
        ? null 
        : config.telegram_bot_token;
      
      const response = await api.post('/bots/config/test-telegram', {
        token: tokenToSend
      });
      
      toast({
        title: "✅ Telegram Conectado!",
        description: `Bot: @${response.data.data.bot_username}`,
        variant: "success"
      });
      
      setConfig(prev => ({
        ...prev,
        telegram_bot_username: response.data.data.bot_username
      }));
      
      await fetchStatus();
    } catch (error) {
      toast({
        title: "❌ Erro de Conexão",
        description: error.response?.data?.message || "Falha ao conectar com o Telegram",
        variant: "destructive"
      });
    } finally {
      setTesting(prev => ({ ...prev, telegram: false }));
    }
  };

  // Testar WhatsApp
  const handleTestWhatsApp = async () => {
    setTesting(prev => ({ ...prev, whatsapp: true }));
    try {
      // Não enviar token se estiver mascarado (contém ...)
      const tokenToSend = config.whatsapp_api_token?.includes('...') 
        ? null 
        : config.whatsapp_api_token;
      
      const response = await api.post('/bots/config/test-whatsapp', {
        api_url: config.whatsapp_api_url,
        api_token: tokenToSend,
        phone_number_id: config.whatsapp_phone_number_id
      });
      
      toast({
        title: "✅ WhatsApp Conectado!",
        description: `Número: ${response.data.data.display_phone_number}`,
        variant: "success"
      });
      
      await fetchStatus();
    } catch (error) {
      toast({
        title: "❌ Erro de Conexão",
        description: error.response?.data?.message || "Falha ao conectar com o WhatsApp",
        variant: "destructive"
      });
    } finally {
      setTesting(prev => ({ ...prev, whatsapp: false }));
    }
  };

  // Gerenciamento de canais
  const handleSaveChannel = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        platform: channelForm.platform,
        identifier: channelForm.channel_id,
        name: channelForm.channel_name,
        is_active: channelForm.is_active
      };

      if (editingChannel) {
        await api.put(`/bots/channels/${editingChannel.id}`, payload);
        toast({ title: "Sucesso!", description: "Canal atualizado.", variant: "success" });
      } else {
        await api.post('/bots/channels', payload);
        toast({ title: "Sucesso!", description: "Canal criado.", variant: "success" });
      }
      
      setIsDialogOpen(false);
      setEditingChannel(null);
      setChannelForm({ platform: 'telegram', channel_id: '', channel_name: '', is_active: true });
      fetchChannels();
    } catch (error) {
      toast({
        title: "Erro!",
        description: error.response?.data?.message || "Erro ao salvar canal.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteChannel = async (id) => {
    if (!confirm('Deseja deletar este canal?')) return;
    try {
      await api.delete(`/bots/channels/${id}`);
      toast({ title: "Sucesso!", description: "Canal deletado.", variant: "success" });
      fetchChannels();
    } catch (error) {
      toast({ title: "Erro!", description: "Erro ao deletar canal.", variant: "destructive" });
    }
  };

  const handleEditChannel = (channel) => {
    setEditingChannel(channel);
    setChannelForm({
      platform: channel.platform,
      channel_id: channel.identifier || channel.channel_id,
      channel_name: channel.name || channel.channel_name,
      is_active: channel.is_active
    });
    setIsDialogOpen(true);
  };

  const handleTestChannel = async (id) => {
    try {
      await api.post(`/bots/channels/${id}/test`);
      toast({ title: "✅ Enviado!", description: "Mensagem de teste enviada.", variant: "success" });
      fetchLogs();
    } catch (error) {
      toast({
        title: "❌ Erro!",
        description: error.response?.data?.message || "Falha ao enviar teste.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8" />
            Configuração de Bots
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure e gerencie os bots de Telegram e WhatsApp
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={`border-2 ${status.telegram?.working ? 'border-green-500/50' : status.telegram?.configured ? 'border-yellow-500/50' : 'border-gray-300'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                Telegram
              </span>
              {status.telegram?.working ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" /> Online
                </Badge>
              ) : status.telegram?.configured ? (
                <Badge variant="warning" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Configurado
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" /> Offline
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {status.telegram?.bot_info ? (
                <span>Bot: @{status.telegram.bot_info.username}</span>
              ) : (
                <span>Nenhum bot configurado</span>
              )}
              <span className="block mt-1">
                {status.telegram?.channels || 0} canais ativos
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${status.whatsapp?.working ? 'border-green-500/50' : status.whatsapp?.configured ? 'border-yellow-500/50' : 'border-gray-300'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </span>
              {status.whatsapp?.working ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" /> Online
                </Badge>
              ) : status.whatsapp?.configured ? (
                <Badge variant="warning" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Configurado
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" /> Offline
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <span>{status.whatsapp?.configured ? 'API Meta Business configurada' : 'Nenhuma API configurada'}</span>
              <span className="block mt-1">
                {status.whatsapp?.channels || 0} canais ativos
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {['config', 'channels', 'logs'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'config' && <><Settings className="inline mr-2 h-4 w-4" />Configurações</>}
            {tab === 'channels' && <><MessageSquare className="inline mr-2 h-4 w-4" />Canais</>}
            {tab === 'logs' && <><Activity className="inline mr-2 h-4 w-4" />Logs</>}
          </button>
        ))}
      </div>

      {/* Tab: Configurações */}
      {activeTab === 'config' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Telegram Config */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                Configuração do Telegram
              </CardTitle>
              <CardDescription>
                Configure o bot do Telegram para enviar notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="telegram_enabled">Bot Habilitado</Label>
                <input
                  type="checkbox"
                  id="telegram_enabled"
                  checked={config.telegram_enabled}
                  onChange={(e) => setConfig({...config, telegram_enabled: e.target.checked})}
                  className="h-5 w-5 rounded"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegram_bot_token">Bot Token *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="telegram_bot_token"
                      type={showTokens.telegram ? 'text' : 'password'}
                      value={config.telegram_bot_token}
                      onChange={(e) => setConfig({...config, telegram_bot_token: e.target.value})}
                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTokens({...showTokens, telegram: !showTokens.telegram})}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showTokens.telegram ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Obtenha o token com o @BotFather no Telegram
                </p>
              </div>

              {config.telegram_bot_username && (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    ✅ Bot conectado: @{config.telegram_bot_username}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="telegram_parse_mode">Modo de Parse</Label>
                <select
                  id="telegram_parse_mode"
                  value={config.telegram_parse_mode}
                  onChange={(e) => setConfig({...config, telegram_parse_mode: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="Markdown">Markdown</option>
                  <option value="MarkdownV2">MarkdownV2</option>
                  <option value="HTML">HTML</option>
                </select>
              </div>

              <Button 
                onClick={handleTestTelegram} 
                disabled={!config.telegram_bot_token || testing.telegram}
                variant="outline"
                className="w-full"
              >
                {testing.telegram ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Testando...</>
                ) : (
                  <><Wifi className="mr-2 h-4 w-4" />Testar Conexão</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* WhatsApp Config */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Configuração do WhatsApp
              </CardTitle>
              <CardDescription>
                Configure a API do WhatsApp Business (Meta)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="whatsapp_enabled">API Habilitada</Label>
                <input
                  type="checkbox"
                  id="whatsapp_enabled"
                  checked={config.whatsapp_enabled}
                  onChange={(e) => setConfig({...config, whatsapp_enabled: e.target.checked})}
                  className="h-5 w-5 rounded"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_api_url">URL da API</Label>
                <Input
                  id="whatsapp_api_url"
                  value={config.whatsapp_api_url}
                  onChange={(e) => setConfig({...config, whatsapp_api_url: e.target.value})}
                  placeholder="https://graph.facebook.com/v18.0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_api_token">Access Token *</Label>
                <div className="relative">
                  <Input
                    id="whatsapp_api_token"
                    type={showTokens.whatsapp ? 'text' : 'password'}
                    value={config.whatsapp_api_token}
                    onChange={(e) => setConfig({...config, whatsapp_api_token: e.target.value})}
                    placeholder="EAAxxxxxxx..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTokens({...showTokens, whatsapp: !showTokens.whatsapp})}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showTokens.whatsapp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_phone_number_id">Phone Number ID *</Label>
                <Input
                  id="whatsapp_phone_number_id"
                  value={config.whatsapp_phone_number_id}
                  onChange={(e) => setConfig({...config, whatsapp_phone_number_id: e.target.value})}
                  placeholder="123456789012345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_business_account_id">Business Account ID</Label>
                <Input
                  id="whatsapp_business_account_id"
                  value={config.whatsapp_business_account_id}
                  onChange={(e) => setConfig({...config, whatsapp_business_account_id: e.target.value})}
                  placeholder="123456789012345"
                />
              </div>

              <Button 
                onClick={handleTestWhatsApp} 
                disabled={!config.whatsapp_api_token || !config.whatsapp_phone_number_id || testing.whatsapp}
                variant="outline"
                className="w-full"
              >
                {testing.whatsapp ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Testando...</>
                ) : (
                  <><Wifi className="mr-2 h-4 w-4" />Testar Conexão</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Configurações de Notificação */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Configurações de Notificação
              </CardTitle>
              <CardDescription>
                Defina quando e como as notificações serão enviadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-4">
                  <h4 className="font-medium">Tipos de Notificação</h4>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify_new_products">Novos Produtos</Label>
                    <input
                      type="checkbox"
                      id="notify_new_products"
                      checked={config.notify_new_products}
                      onChange={(e) => setConfig({...config, notify_new_products: e.target.checked})}
                      className="h-5 w-5 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify_new_coupons">Novos Cupons</Label>
                    <input
                      type="checkbox"
                      id="notify_new_coupons"
                      checked={config.notify_new_coupons}
                      onChange={(e) => setConfig({...config, notify_new_coupons: e.target.checked})}
                      className="h-5 w-5 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify_expired_coupons">Cupons Expirando</Label>
                    <input
                      type="checkbox"
                      id="notify_expired_coupons"
                      checked={config.notify_expired_coupons}
                      onChange={(e) => setConfig({...config, notify_expired_coupons: e.target.checked})}
                      className="h-5 w-5 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify_price_drops">Quedas de Preço</Label>
                    <input
                      type="checkbox"
                      id="notify_price_drops"
                      checked={config.notify_price_drops}
                      onChange={(e) => setConfig({...config, notify_price_drops: e.target.checked})}
                      className="h-5 w-5 rounded"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Filtros</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="min_discount_to_notify">Desconto Mínimo (%)</Label>
                    <Input
                      id="min_discount_to_notify"
                      type="number"
                      min="0"
                      max="100"
                      value={config.min_discount_to_notify}
                      onChange={(e) => setConfig({...config, min_discount_to_notify: parseInt(e.target.value)})}
                    />
                    <p className="text-xs text-muted-foreground">
                      Só notificar produtos com desconto acima deste valor
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Rate Limiting</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="rate_limit_per_minute">Mensagens por Minuto</Label>
                    <Input
                      id="rate_limit_per_minute"
                      type="number"
                      min="1"
                      max="60"
                      value={config.rate_limit_per_minute}
                      onChange={(e) => setConfig({...config, rate_limit_per_minute: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delay_between_messages">Delay entre Mensagens (ms)</Label>
                    <Input
                      id="delay_between_messages"
                      type="number"
                      min="100"
                      max="5000"
                      step="100"
                      value={config.delay_between_messages}
                      onChange={(e) => setConfig({...config, delay_between_messages: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleSaveConfig} disabled={saving}>
                  {saving ? (
                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" />Salvar Configurações</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Canais */}
      {activeTab === 'channels' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Canais de Notificação</CardTitle>
              <CardDescription>Gerencie os canais que receberão as notificações</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingChannel(null);
                  setChannelForm({ platform: 'telegram', channel_id: '', channel_name: '', is_active: true });
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Canal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingChannel ? 'Editar Canal' : 'Novo Canal'}</DialogTitle>
                  <DialogDescription>Configure um canal para receber notificações</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveChannel} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="platform">Plataforma *</Label>
                    <select
                      id="platform"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={channelForm.platform}
                      onChange={(e) => setChannelForm({...channelForm, platform: e.target.value})}
                    >
                      <option value="telegram">Telegram</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="channel_id">
                      {channelForm.platform === 'telegram' ? 'Chat ID *' : 'Número do WhatsApp *'}
                    </Label>
                    <Input
                      id="channel_id"
                      value={channelForm.channel_id}
                      onChange={(e) => setChannelForm({...channelForm, channel_id: e.target.value})}
                      placeholder={channelForm.platform === 'telegram' ? '-1001234567890' : '5511999999999'}
                      required
                    />
                    {channelForm.platform === 'telegram' && (
                      <p className="text-xs text-muted-foreground">
                        Use o @userinfobot ou @getidsbot para obter o Chat ID
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="channel_name">Nome do Canal *</Label>
                    <Input
                      id="channel_name"
                      value={channelForm.channel_name}
                      onChange={(e) => setChannelForm({...channelForm, channel_name: e.target.value})}
                      placeholder="Ex: Canal Principal"
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={channelForm.is_active}
                      onChange={(e) => setChannelForm({...channelForm, is_active: e.target.checked})}
                      className="h-4 w-4 rounded"
                    />
                    <Label htmlFor="is_active">Canal ativo</Label>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">{editingChannel ? 'Salvar' : 'Criar'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>ID/Número</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum canal configurado. Clique em "Novo Canal" para adicionar.
                    </TableCell>
                  </TableRow>
                ) : (
                  channels.map((channel) => (
                    <TableRow key={channel.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {channel.platform === 'telegram' ? (
                            <><MessageSquare className="mr-1 h-3 w-3 text-blue-500" />{channel.platform}</>
                          ) : (
                            <><span className="mr-1 text-green-500">📱</span>{channel.platform}</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{channel.name || channel.channel_name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {channel.identifier || channel.channel_id}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={channel.is_active ? 'success' : 'destructive'}>
                          {channel.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleTestChannel(channel.id)}>
                            <Send className="mr-1 h-3 w-3" />
                            Testar
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditChannel(channel)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteChannel(channel.id)}>
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
      )}

      {/* Tab: Logs */}
      {activeTab === 'logs' && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Notificações</CardTitle>
            <CardDescription>Últimas notificações enviadas pelos bots</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma notificação enviada ainda
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={log.id || index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="font-medium">
                          {log.event_type === 'test' ? '🧪 Teste' : 
                           log.event_type === 'new_promotion' ? '🔥 Nova Promoção' :
                           log.event_type === 'new_coupon' ? '🎟 Novo Cupom' :
                           log.event_type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {log.channel_name} • {log.platform}
                        </p>
                        {log.error_message && (
                          <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={log.success ? 'success' : 'destructive'}>
                        {log.success ? <CheckCircle className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                        {log.success ? 'Enviado' : 'Falhou'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
