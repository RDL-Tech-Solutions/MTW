import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import QRCode from 'react-qr-code'; // Ensure this is installed
import {
  Plus, Edit, Trash2, MessageSquare, Send, Activity,
  Settings, Bot, CheckCircle, XCircle, Eye, EyeOff,
  Wifi, WifiOff, RefreshCw, Save, AlertCircle, FileText, Loader2,
  List, Copy, Search, ExternalLink
} from 'lucide-react';
import BotTemplates from '../components/BotTemplates';
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
  const [savingChannel, setSavingChannel] = useState(false);
  const [deletingChannel, setDeletingChannel] = useState({});
  const [testingChannel, setTestingChannel] = useState({});

  // WhatsApp Web Auth
  const [connectionMethod, setConnectionMethod] = useState('code'); // 'code' or 'qr'
  const [qrCode, setQrCode] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  // Chat List
  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [showChatsModal, setShowChatsModal] = useState(false);
  const [chatSearch, setChatSearch] = useState('');

  const [pairingCode, setPairingCode] = useState(null);
  const qrIntervalRef = useRef(null);

  // Status dos bots
  const [status, setStatus] = useState({
    telegram: { configured: false, working: false },
    whatsapp: { configured: false, working: false },
    whatsapp_web: { configured: false, working: false, info: null }
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

    // WhatsApp Web (Pessoal)
    whatsapp_web_enabled: false,
    whatsapp_web_pairing_number: '',
    whatsapp_web_admin_numbers: '',

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
  const [categories, setCategories] = useState([]);

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
    is_active: true,
    only_coupons: false,
    no_coupons: false,
    category_filter: []
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
        fetchLogs(),
        fetchCategories()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQrCode = async () => {
    setLoadingQr(true);
    try {
      const res = await api.get('/bots/config/whatsapp-web/qr');
      if (res.data.success && res.data.data.qr) {
        setQrCode(res.data.data.qr);
      }
    } catch (e) {
      console.error('Erro ao buscar QR Code', e);
    } finally {
      setLoadingQr(false);
    }
  };

  // Polling para QR Code e detecção de conexão
  useEffect(() => {
    // Se conectou, parar geração e limpar QR/Código
    if (status.whatsapp_web?.working) {
      if (isGeneratingQr) setIsGeneratingQr(false);
      if (qrCode) setQrCode(null);
      if (pairingCode) {
        setPairingCode(null);
        toast({
          title: "Conectado!",
          description: "WhatsApp Web conectado via código com sucesso.",
          variant: "default",
        });
      }
      return;
    }

    if (isGeneratingQr && !status.whatsapp_web?.working) {
      fetchQrCode(); // Initial fetch
      qrIntervalRef.current = setInterval(() => {
        fetchQrCode();
        fetchStatus(); // Também atualizar status para detectar conexão rapidamente
      }, 3000); // Polling mais rápido (3s)
    } else {
      if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
    }
    return () => {
      if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
    };
  }, [connectionMethod, isGeneratingQr, status.whatsapp_web?.working]);

  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      const res = await api.get('/bots/config/whatsapp-web/chats');
      if (res.data.success) {
        setChats(res.data.data);
      }
    } catch (e) {
      toast({
        title: "Erro ao listar chats",
        description: e.response?.data?.message || "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setLoadingChats(false);
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

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      let categoriesData = [];

      if (response.data?.success && response.data?.data) {
        if (Array.isArray(response.data.data)) {
          categoriesData = response.data.data;
        } else if (response.data.data.categories && Array.isArray(response.data.data.categories)) {
          categoriesData = response.data.data.categories;
        }
      } else if (Array.isArray(response.data)) {
        categoriesData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        categoriesData = response.data.data;
      }

      categoriesData = categoriesData.filter(cat => cat.is_active !== false);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategories([]);
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
    setSavingChannel(true);
    try {
      const payload = {
        platform: channelForm.platform,
        identifier: channelForm.channel_id,
        name: channelForm.channel_name,
        is_active: channelForm.is_active,
        only_coupons: channelForm.only_coupons || false,
        no_coupons: channelForm.no_coupons || false,
        category_filter: channelForm.category_filter && channelForm.category_filter.length > 0
          ? channelForm.category_filter
          : null
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
      setChannelForm({ platform: 'telegram', channel_id: '', channel_name: '', is_active: true, only_coupons: false, no_coupons: false, category_filter: [] });
      fetchChannels();
    } catch (error) {
      toast({
        title: "Erro!",
        description: error.response?.data?.message || "Erro ao salvar canal.",
        variant: "destructive"
      });
    } finally {
      setSavingChannel(false);
    }
  };

  const handleDeleteChannel = async (id) => {
    if (!confirm('Deseja deletar este canal?')) return;
    setDeletingChannel(prev => ({ ...prev, [id]: true }));
    try {
      await api.delete(`/bots/channels/${id}`);
      toast({ title: "Sucesso!", description: "Canal deletado.", variant: "success" });
      fetchChannels();
    } catch (error) {
      toast({ title: "Erro!", description: "Erro ao deletar canal.", variant: "destructive" });
    } finally {
      setDeletingChannel(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleEditChannel = (channel) => {
    setEditingChannel(channel);

    // Processar category_filter (pode ser array ou JSON string)
    let categoryFilter = [];
    if (channel.category_filter) {
      if (Array.isArray(channel.category_filter)) {
        categoryFilter = channel.category_filter;
      } else if (typeof channel.category_filter === 'string') {
        try {
          categoryFilter = JSON.parse(channel.category_filter);
        } catch (e) {
          categoryFilter = [];
        }
      }
    }

    setChannelForm({
      platform: channel.platform || 'telegram',
      channel_id: channel.identifier || channel.channel_id || '',
      channel_name: channel.name || channel.channel_name || '',
      is_active: channel.is_active !== undefined ? channel.is_active : true,
      only_coupons: channel.only_coupons || false,
      no_coupons: channel.no_coupons || false,
      category_filter: categoryFilter
    });
    setIsDialogOpen(true);
  };

  const handleTestChannel = async (id) => {
    setTestingChannel(prev => ({ ...prev, [id]: true }));
    try {
      const response = await api.post(`/bots/channels/${id}/test`);
      toast({
        title: "✅ Enviado!",
        description: response.data?.message || "Mensagem de teste enviada com sucesso.",
        variant: "success"
      });
      fetchLogs();
    } catch (error) {
      console.error('Erro ao testar canal:', error);
      console.error('Response:', error.response?.data);

      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Falha ao enviar teste. Verifique os logs do servidor.";

      toast({
        title: "❌ Erro ao Enviar Teste",
        description: errorMessage,
        variant: "destructive",
        duration: 8000
      });
    } finally {
      setTestingChannel(prev => ({ ...prev, [id]: false }));
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header Responsivo */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 sm:h-8 sm:w-8" />
            Configuração de Bots
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Configure Telegram e WhatsApp
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm" className="self-start sm:self-auto">
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Status Cards - Grid Responsivo */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        <Card className={`border-2 ${status.telegram?.working ? 'border-green-500/50' : status.telegram?.configured ? 'border-yellow-500/50' : 'border-gray-300'}`}>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-sm sm:text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                Telegram
              </span>
              {status.telegram?.working ? (
                <Badge variant="success" className="flex items-center gap-1 text-xs">
                  <Wifi className="h-3 w-3" /> Online
                </Badge>
              ) : status.telegram?.configured ? (
                <Badge variant="warning" className="flex items-center gap-1 text-xs">
                  <AlertCircle className="h-3 w-3" /> Config
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                  <WifiOff className="h-3 w-3" /> Off
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xs sm:text-sm text-muted-foreground">
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

        {/* Status Card: WhatsApp Web */}
        <Card className={`border-2 ${status.whatsapp_web?.working ? 'border-green-500/50' : status.whatsapp_web?.configured ? 'border-yellow-500/50' : 'border-gray-300'}`}>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-sm sm:text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp Web
              </span>
              {status.whatsapp_web?.working ? (
                <Badge variant="success" className="flex items-center gap-1 text-xs">
                  <Wifi className="h-3 w-3" /> Online
                </Badge>
              ) : status.whatsapp_web?.configured ? (
                <Badge variant="warning" className="flex items-center gap-1 text-xs">
                  <AlertCircle className="h-3 w-3" /> Conectando
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                  <WifiOff className="h-3 w-3" /> Off
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xs sm:text-sm text-muted-foreground">
              {status.whatsapp_web?.info?.wid?.user ? (
                <span>Número: {status.whatsapp_web.info.wid.user}</span>
              ) : (
                <span>Não pareado</span>
              )}
              <span className="block mt-1">
                {/* Aqui poderíamos mostrar canais do whatsapp se tivéssemos um contador separado no status, mas por hora mostramos o status geral */}
                {status.whatsapp_web?.working ? 'Pronto para enviar' : 'Desconectado'}
              </span>
            </div>
          </CardContent>
        </Card>


      </div>

      {/* Tabs Responsivas */}
      <div className="flex bg-muted p-1 rounded-md overflow-x-auto scrollbar-hide px-1 gap-1">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'config'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-background/50'
            }`}
        >
          <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Configuração</span>
          <span className="sm:hidden">Geral</span>
        </button>
        <button
          onClick={() => setActiveTab('channels')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'channels'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-background/50'
            }`}
        >
          <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Canais
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'templates'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-background/50'
            }`}
        >
          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'logs'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-background/50'
            }`}
        >
          <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Logs
        </button>
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
                  onChange={(e) => setConfig({ ...config, telegram_enabled: e.target.checked })}
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
                      onChange={(e) => setConfig({ ...config, telegram_bot_token: e.target.value })}
                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTokens({ ...showTokens, telegram: !showTokens.telegram })}
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
                  onChange={(e) => setConfig({ ...config, telegram_parse_mode: e.target.value })}
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

          {/* WhatsApp Web (Pessoal) Config */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp Web (Pessoal)
              </CardTitle>
              <CardDescription>
                Conecte seu número pessoal para enviar notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="whatsapp_web_enabled">Habilitado</Label>
                <input
                  type="checkbox"
                  id="whatsapp_web_enabled"
                  checked={config.whatsapp_web_enabled}
                  onChange={(e) => setConfig({ ...config, whatsapp_web_enabled: e.target.checked })}
                  className="h-5 w-5 rounded"
                />
              </div>

              {/* Status Display */}
              {status.whatsapp_web?.working ? (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      ✅ Conectado
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {status.whatsapp_web.info?.wid?.user || 'Sessão Ativa'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchChats();
                      setShowChatsModal(true);
                    }}
                    className="h-8 border-green-200 hover:bg-green-50 text-green-700"
                  >
                    <Search className="h-3.5 w-3.5 mr-1" />
                    Consultar IDs
                  </Button>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    ⚠️ Não conectado
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchChats();
                      setShowChatsModal(true);
                    }}
                    className="h-8 border-yellow-200 hover:bg-yellow-100 text-yellow-800 dark:border-yellow-900 dark:hover:bg-yellow-900 dark:text-yellow-200"
                  >
                    <Search className="h-3.5 w-3.5 mr-1" />
                    Consultar IDs
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="whatsapp_web_pairing_number">Seu Número de Celular (com DDD)</Label>
                <Input
                  id="whatsapp_web_pairing_number"
                  value={config.whatsapp_web_pairing_number || ''}
                  onChange={(e) => setConfig({ ...config, whatsapp_web_pairing_number: e.target.value })}
                  placeholder="5511999999999"
                  disabled={status.whatsapp_web?.working}
                />
                <p className="text-xs text-muted-foreground">
                  Apenas números, inclua 55+DDD (ex: 5511999999999)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_web_admin_numbers">Números Admins (Opcional)</Label>
                <Input
                  id="whatsapp_web_admin_numbers"
                  value={config.whatsapp_web_admin_numbers || ''}
                  onChange={(e) => setConfig({ ...config, whatsapp_web_admin_numbers: e.target.value })}
                  placeholder="5511888888888, 5511777777777"
                />
                <p className="text-xs text-muted-foreground">
                  Números autorizados a enviar comandos (separados por vírgula)
                </p>
              </div>

              {/* Seletor de Método de Conexão */}
              {!status.whatsapp_web?.working && (
                <div className="space-y-4 pt-2 border-t mt-4">
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="connectionMethod"
                        value="qr"
                        checked={connectionMethod === 'qr'}
                        onChange={() => setConnectionMethod('qr')}
                      />
                      <span className="text-sm font-medium">QR Code</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="connectionMethod"
                        value="code"
                        checked={connectionMethod === 'code'}
                        onChange={() => setConnectionMethod('code')}
                      />
                      <span className="text-sm font-medium">Código de Pareamento</span>
                    </label>
                  </div>

                  {connectionMethod === 'code' ? (
                    <div className="space-y-4">
                      {pairingCode && (
                        <div className="p-6 bg-primary/5 border-2 border-dashed border-primary/20 rounded-xl flex flex-col items-center justify-center space-y-3 animate-in fade-in zoom-in duration-300">
                          <span className="text-sm font-medium text-primary">Seu Código de Pareamento:</span>
                          <div className="text-4xl font-mono font-black tracking-widest text-primary bg-white px-6 py-3 rounded-lg shadow-sm border">
                            {pairingCode}
                          </div>
                          <p className="text-xs text-center text-muted-foreground max-w-[280px]">
                            1. No celular: Aparelhos Conectados > Conectar com número de telefone
                            <br />
                            2. Digite este código no seu WhatsApp.
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPairingCode(null)}
                            className="text-xs h-7 text-muted-foreground hover:text-red-500"
                          >
                            Limpar Código
                          </Button>
                        </div>
                      )}

                      <Button
                        onClick={async () => {
                          try {
                            setTesting(prev => ({ ...prev, whatsapp_web: true }));
                            const res = await api.post('/bots/config/whatsapp-web/pair', {
                              phoneNumber: config.whatsapp_web_pairing_number
                            });

                            const code = res.data.data?.code;
                            if (code) {
                              setPairingCode(code);
                              toast({
                                title: "Código Gerado!",
                                description: `Código: ${code}`,
                                variant: "default",
                              });
                            } else {
                              throw new Error("Código não retornado pelo servidor");
                            }
                          } catch (e) {
                            toast({
                              title: "Erro",
                              description: e.response?.data?.message || e.message || "Erro ao solicitar código",
                              variant: "destructive"
                            });
                          } finally {
                            setTesting(prev => ({ ...prev, whatsapp_web: false }));
                          }
                        }}
                        disabled={!config.whatsapp_web_pairing_number || testing.whatsapp_web}
                        className="w-full"
                      >
                        {testing.whatsapp_web ? (
                          <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Gerando Código...</>
                        ) : (
                          <><Wifi className="mr-2 h-4 w-4" />{pairingCode ? 'Gerar Novo Código' : 'Gerar Código de Pareamento'}</>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-3">
                      {!isGeneratingQr ? (
                        <Button
                          onClick={() => setIsGeneratingQr(true)}
                          disabled={testing.whatsapp_web}
                          className="w-full"
                        >
                          <Wifi className="mr-2 h-4 w-4" />
                          Gerar QR Code
                        </Button>
                      ) : (
                        <>
                          <div className="p-4 bg-white rounded-lg border shadow-sm">
                            {qrCode ? (
                              <div style={{ background: 'white', padding: '16px' }}>
                                <QRCode value={qrCode} size={200} />
                              </div>
                            ) : (
                              <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 text-gray-400">
                                {loadingQr ? <Loader2 className="h-8 w-8 animate-spin" /> : 'Iniciando...'}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-center text-muted-foreground w-full">
                            Abra o WhatsApp &gt; Menu &gt; Aparelhos Conectados &gt; Conectar Aparelho
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchQrCode}
                            disabled={loadingQr}
                          >
                            <RefreshCw className={`mr-2 h-3 w-3 ${loadingQr ? 'animate-spin' : ''}`} /> Atualizar QR
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsGeneratingQr(false);
                              setQrCode(null);
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                      onChange={(e) => setConfig({ ...config, notify_new_products: e.target.checked })}
                      className="h-5 w-5 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify_new_coupons">Novos Cupons</Label>
                    <input
                      type="checkbox"
                      id="notify_new_coupons"
                      checked={config.notify_new_coupons}
                      onChange={(e) => setConfig({ ...config, notify_new_coupons: e.target.checked })}
                      className="h-5 w-5 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify_expired_coupons">Cupons Expirando</Label>
                    <input
                      type="checkbox"
                      id="notify_expired_coupons"
                      checked={config.notify_expired_coupons}
                      onChange={(e) => setConfig({ ...config, notify_expired_coupons: e.target.checked })}
                      className="h-5 w-5 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify_price_drops">Quedas de Preço</Label>
                    <input
                      type="checkbox"
                      id="notify_price_drops"
                      checked={config.notify_price_drops}
                      onChange={(e) => setConfig({ ...config, notify_price_drops: e.target.checked })}
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
                      onChange={(e) => setConfig({ ...config, min_discount_to_notify: parseInt(e.target.value) })}
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
                      onChange={(e) => setConfig({ ...config, rate_limit_per_minute: parseInt(e.target.value) })}
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
                      onChange={(e) => setConfig({ ...config, delay_between_messages: parseInt(e.target.value) })}
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
      )
      }

      {/* Tab: Canais */}
      {
        activeTab === 'channels' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Canais de Notificação</CardTitle>
                <CardDescription>Gerencie os canais que receberão as notificações</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    fetchChats();
                    setShowChatsModal(true);
                  }}
                  className="hidden sm:flex"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Consultar IDs WhatsApp
                </Button>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingChannel(null);
                      setChannelForm({ platform: 'telegram', channel_id: '', channel_name: '', is_active: true, only_coupons: false, category_filter: [] });
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Canal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
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
                          onChange={(e) => setChannelForm({ ...channelForm, platform: e.target.value })}
                        >
                          <option value="telegram">Telegram</option>
                          {/* <option value="whatsapp">WhatsApp (Cloud API)</option> REMOVED */}
                          <option value="whatsapp_web">WhatsApp Web (Pessoal)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="channel_id">
                          {channelForm.platform === 'telegram' ? 'Chat ID *' : 'Número do WhatsApp *'}
                        </Label>
                        <Input
                          id="channel_id"
                          value={channelForm.channel_id}
                          onChange={(e) => setChannelForm({ ...channelForm, channel_id: e.target.value })}
                          placeholder={
                            channelForm.platform === 'telegram' ? '-1001234567890' :
                              channelForm.platform === 'whatsapp_web' ? '12036312345678@g.us' :
                                '5511999999999'
                          }
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
                          onChange={(e) => setChannelForm({ ...channelForm, channel_name: e.target.value })}
                          placeholder="Ex: Canal Principal"
                          required
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={channelForm.is_active}
                          onChange={(e) => setChannelForm({ ...channelForm, is_active: e.target.checked })}
                          className="h-4 w-4 rounded"
                        />
                        <Label htmlFor="is_active">Canal ativo</Label>
                      </div>

                      <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                        <h4 className="font-medium text-sm">Configurações de Conteúdo</h4>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="only_coupons"
                            checked={channelForm.only_coupons}
                            onChange={(e) => setChannelForm({ ...channelForm, only_coupons: e.target.checked, no_coupons: false, category_filter: [] })}
                            className="h-4 w-4 rounded"
                          />
                          <Label htmlFor="only_coupons" className="cursor-pointer">
                            Apenas cupons (não recebe produtos)
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          Se marcado, este canal só receberá notificações de cupons, nunca de produtos
                        </p>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="no_coupons"
                            checked={channelForm.no_coupons}
                            disabled={channelForm.only_coupons}
                            onChange={(e) => setChannelForm({ ...channelForm, no_coupons: e.target.checked, only_coupons: false })}
                            className="h-4 w-4 rounded disabled:opacity-50"
                          />
                          <Label htmlFor="no_coupons" className={`cursor-pointer ${channelForm.only_coupons ? 'opacity-50' : ''}`}>
                            Não recebe cupons (apenas produtos)
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          Se marcado, este canal só receberá notificações de produtos, nunca de cupons
                        </p>

                        {!channelForm.only_coupons && (
                          <div className="space-y-2">
                            <Label>
                              Categorias de Produtos (máximo 10)
                            </Label>
                            <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 space-y-2">
                              {categories.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                  Carregando categorias...
                                </p>
                              ) : (
                                categories.map(category => {
                                  const isSelected = channelForm.category_filter.includes(category.id);
                                  const canSelect = isSelected || channelForm.category_filter.length < 10;

                                  return (
                                    <div key={category.id} className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`category_${category.id}`}
                                        checked={isSelected}
                                        disabled={!canSelect && !isSelected}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            if (channelForm.category_filter.length < 10) {
                                              setChannelForm({
                                                ...channelForm,
                                                category_filter: [...channelForm.category_filter, category.id]
                                              });
                                            }
                                          } else {
                                            setChannelForm({
                                              ...channelForm,
                                              category_filter: channelForm.category_filter.filter(id => id !== category.id)
                                            });
                                          }
                                        }}
                                        className="h-4 w-4 rounded"
                                      />
                                      <Label
                                        htmlFor={`category_${category.id}`}
                                        className={`cursor-pointer flex-1 ${!canSelect && !isSelected ? 'opacity-50' : ''}`}
                                      >
                                        <span className="mr-1">{category.icon}</span>
                                        {category.name}
                                      </Label>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {channelForm.category_filter.length > 0
                                ? `Selecionadas: ${channelForm.category_filter.length} categoria(s). ${channelForm.category_filter.length < 10 ? 'Você pode selecionar mais.' : 'Limite atingido.'}`
                                : 'Selecione até 10 categorias. Se nenhuma for selecionada, o canal receberá produtos de todas as categorias.'
                              }
                            </p>
                            {channelForm.category_filter.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {channelForm.category_filter.map(catId => {
                                  const category = categories.find(c => c.id === catId);
                                  return category ? (
                                    <Badge key={catId} variant="secondary" className="cursor-pointer" onClick={() => {
                                      setChannelForm({
                                        ...channelForm,
                                        category_filter: channelForm.category_filter.filter(id => id !== catId)
                                      });
                                    }}>
                                      {category.icon} {category.name} ×
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={savingChannel}>
                          {savingChannel ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            editingChannel ? 'Salvar' : 'Criar'
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 overflow-hidden">
              <div className="overflow-x-auto scrollbar-hide">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Plataforma</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden sm:table-cell">Identificador</TableHead>
                      <TableHead className="hidden md:table-cell">Configuração</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channels.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum canal configurado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      channels.map((channel) => {
                        // Processar category_filter
                        let categoryFilter = [];
                        if (channel.category_filter) {
                          if (Array.isArray(channel.category_filter)) {
                            categoryFilter = channel.category_filter;
                          } else if (typeof channel.category_filter === 'string') {
                            try {
                              categoryFilter = JSON.parse(channel.category_filter);
                            } catch (e) {
                              categoryFilter = [];
                            }
                          }
                        }

                        return (
                          <TableRow key={channel.id}>
                            <TableCell>
                              <Badge variant="outline" className="capitalize text-[10px] sm:text-xs">
                                {channel.platform === 'telegram' ? (
                                  <><MessageSquare className="mr-1 h-3 w-3 text-blue-400" />Telegram</>
                                ) : channel.platform === 'whatsapp_web' ? (
                                  <><span className="mr-1 text-green-500">📱</span>WhatsApp Web</>
                                ) : (
                                  <><span className="mr-1 text-green-600">🏢</span>WhatsApp API</>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-xs sm:text-sm max-w-[120px] truncate">
                              {channel.name || channel.channel_name}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <code className="text-[10px] bg-muted px-2 py-1 rounded">
                                {channel.identifier || channel.channel_id}
                              </code>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex flex-col gap-1">
                                {channel.only_coupons ? (
                                  <Badge variant="secondary" className="w-fit text-[10px]">
                                    🎟️ Apenas Cupons
                                  </Badge>
                                ) : (
                                  <>
                                    {categoryFilter.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {categoryFilter.slice(0, 3).map(catId => {
                                          const category = categories.find(c => c.id === catId);
                                          return category ? (
                                            <Badge key={catId} variant="outline" className="text-[10px]">
                                              {category.icon} {category.name}
                                            </Badge>
                                          ) : null;
                                        })}
                                        {categoryFilter.length > 3 && (
                                          <Badge variant="outline" className="text-[10px]">+{categoryFilter.length - 3}</Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <Badge variant="outline" className="w-fit text-[10px]">
                                        📦 Todas categorias
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={channel.is_active ? 'success' : 'destructive'} className="text-[10px] sm:text-xs">
                                {channel.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 sm:gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-[10px] sm:text-xs"
                                  onClick={() => handleTestChannel(channel.id)}
                                  disabled={testingChannel[channel.id]}
                                >
                                  {testingChannel[channel.id] ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <><Send className="mr-1 h-3 w-3" /> <span className="hidden sm:inline">Testar</span></>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditChannel(channel)}
                                  disabled={savingChannel || deletingChannel[channel.id] || testingChannel[channel.id]}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDeleteChannel(channel.id)}
                                  disabled={savingChannel || deletingChannel[channel.id] || testingChannel[channel.id]}
                                >
                                  {deletingChannel[channel.id] ? (
                                    <Loader2 className="h-3.5 w-3.5 text-destructive animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      }

      {/* Tab: Templates */}
      {
        activeTab === 'templates' && (
          <BotTemplates />
        )
      }

      {/* Tab: Logs */}
      {
        activeTab === 'logs' && (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Histórico de Notificações</CardTitle>
              <CardDescription className="text-sm">Últimas notificações enviadas</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3">
                {logs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhuma notificação enviada ainda
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={log.id || index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${status.whatsapp_web?.working ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="font-medium">
                            {status.whatsapp_web?.working ? 'Conectado' : 'Desconectado'}
                          </span>
                          {status.whatsapp_web?.working && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs ml-2"
                              onClick={() => {
                                setShowChatsModal(true);
                                fetchChats();
                              }}
                            >
                              <List className="h-3 w-3 mr-1" /> Consultar IDs
                            </Button>
                          )}
                        </div>
                        {/* ... existing badge code ... */}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">
                            {log.event_type === 'test' ? '🧪 Teste' :
                              log.event_type === 'new_promotion' ? '🔥 Nova Promoção' :
                                log.event_type === 'new_coupon' ? '🎟 Novo Cupom' :
                                  log.event_type}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {log.channel_name} • {log.platform}
                          </p>
                          {log.error_message && (
                            <p className="text-[10px] sm:text-xs text-destructive mt-1 italic">{log.error_message}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center sm:flex-col justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 gap-2">
                        <Badge variant={log.success ? 'success' : 'destructive'} className="text-[10px] sm:text-xs h-6">
                          {log.success ? <CheckCircle className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                          {log.success ? 'Enviado' : 'Falhou'}
                        </Badge>
                        <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                          {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      <Dialog open={showChatsModal} onOpenChange={setShowChatsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Listagem de Chats/Grupos do WhatsApp</DialogTitle>
            <DialogDescription>
              Copie o ID do grupo para configurar nos Canais.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center space-x-2 py-4">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar por nome..."
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="border rounded-md flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>ID (Copie este valor)</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingChats ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="text-xs text-muted-foreground mt-2">Carregando chats...</p>
                    </TableCell>
                  </TableRow>
                ) : chats.filter(c => c.name.toLowerCase().includes(chatSearch.toLowerCase())).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum chat encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  chats.filter(c => c.name.toLowerCase().includes(chatSearch.toLowerCase())).map((chat) => (
                    <TableRow key={chat.id}>
                      <TableCell className="font-medium">{chat.name}</TableCell>
                      <TableCell>
                        {chat.isChannel ? (
                          <Badge className="bg-purple-500 hover:bg-purple-600 text-white border-none">
                            Canal
                          </Badge>
                        ) : (
                          <Badge variant={chat.isGroup ? 'secondary' : 'outline'}>
                            {chat.isGroup ? 'Grupo' : 'Privado'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[200px]" title={chat.id}>
                        {chat.id}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            navigator.clipboard.writeText(chat.id);
                            toast({ title: "ID Copiado!", duration: 1500 });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
