import { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  Plus, Edit, Trash2, MessageSquare, Activity, 
  Play, Square, RefreshCw, CheckCircle2, XCircle,
  ExternalLink, Eye, EyeOff, Settings, Key, Power,
  Send, Shield, AlertCircle, Trash, Brain, Zap, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';

export default function TelegramChannels() {
  const { toast } = useToast();
  
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [channelForm, setChannelForm] = useState({
    name: '',
    username: '',
    channel_id: '',
    is_active: true,
    capture_schedule_start: '',
    capture_schedule_end: '',
    capture_mode: 'new_only',
    platform_filter: 'all',
    example_messages: []
  });
  
  // Dialog de configuração de captura
  const [captureConfigDialog, setCaptureConfigDialog] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [captureConfig, setCaptureConfig] = useState({
    capture_schedule_start: '',
    capture_schedule_end: '',
    capture_mode: 'new_only',
    platform_filter: 'all'
  });
  const [listenerStatus, setListenerStatus] = useState('unknown');
  const [activeTab, setActiveTab] = useState('channels');
  const [aiStatus, setAiStatus] = useState({
    enabled: false,
    coupons_extracted: 0
  });
  const [templateMode, setTemplateMode] = useState('custom');
  
  // Configuração
  const [config, setConfig] = useState({
    api_id: '',
    api_hash: '',
    phone: ''
  });
  const [configLoading, setConfigLoading] = useState(false);
  
  // Autenticação
  const [authStatus, setAuthStatus] = useState({
    is_authenticated: false,
    has_credentials: false,
    has_session: false
  });
  const [authCode, setAuthCode] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [clearingSessions, setClearingSessions] = useState(false);
  
  // Listener
  const [listenerLoading, setListenerLoading] = useState(false);
  const [savingChannel, setSavingChannel] = useState(false);
  const [deletingChannel, setDeletingChannel] = useState({});
  const [savingCaptureConfig, setSavingCaptureConfig] = useState(false);
  const [togglingActive, setTogglingActive] = useState({});

  useEffect(() => {
    loadChannels();
    loadConfig();
    checkAuthStatus();
    checkListenerStatus();
    loadTemplateMode();
    
    // Verificar status periodicamente (aumentado para 15 segundos para evitar muitas requisições)
    const interval = setInterval(() => {
      checkListenerStatus();
      checkAuthStatus();
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const loadTemplateMode = async () => {
    try {
      const response = await api.get('/settings');
      const settings = response.data.data;
      setTemplateMode(settings.template_mode_coupon || 'custom');
    } catch (error) {
      console.error('Erro ao carregar modo de template:', error);
    }
  };

  const getTemplateModeInfo = () => {
    const modeNames = {
      'default': { label: 'Padrão', icon: '📋', color: 'bg-gray-100 text-gray-800' },
      'custom': { label: 'Customizado', icon: '✏️', color: 'bg-blue-100 text-blue-800' },
      'ai_advanced': { label: 'IA ADVANCED', icon: '🤖', color: 'bg-purple-100 text-purple-800' }
    };
    return modeNames[templateMode] || modeNames['custom'];
  };

  const loadChannels = async () => {
    setLoading(true);
    try {
      const response = await api.get('/telegram-channels');
      setChannels(response.data.data || []);
      
      // Atualizar status da IA se disponível
      if (response.data.ai) {
        setAiStatus({
          enabled: response.data.ai.enabled || false,
          coupons_extracted: response.data.ai.coupons_extracted || 0
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar canais",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await api.get('/telegram-collector/config');
      if (response.data.success) {
        const data = response.data.data;
        // Se os valores estão mascarados (contêm "****"), não carregar no input
        // Isso evita que o usuário salve valores mascarados
        const apiId = data.api_id && !data.api_id.includes('****') ? data.api_id : '';
        const apiHash = data.api_hash && !data.api_hash.includes('****') ? data.api_hash : '';
        
        setConfig({
          api_id: apiId,
          api_hash: apiHash,
          phone: data.phone || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const saveConfig = async () => {
    setConfigLoading(true);
    try {
      if (!config.api_id || !config.api_hash) {
        toast({
          title: "Erro",
          description: "API ID e API Hash são obrigatórios",
          variant: "destructive"
        });
        return;
      }

      // Validar formato do API ID (deve ser número)
      const apiIdNum = parseInt(config.api_id);
      if (isNaN(apiIdNum) || apiIdNum <= 0) {
        toast({
          title: "Erro",
          description: "API ID deve ser um número válido",
          variant: "destructive"
        });
        return;
      }

      // Validar formato do API Hash (deve ter pelo menos 32 caracteres)
      if (config.api_hash.length < 32) {
        toast({
          title: "Erro",
          description: "API Hash deve ter pelo menos 32 caracteres",
          variant: "destructive"
        });
        return;
      }

      await api.put('/telegram-collector/config', config);
      toast({
        title: "Sucesso",
        description: "Configuração salva com sucesso",
        variant: "success"
      });
      
      // Recarregar configuração e verificar status
      await loadConfig();
      await checkAuthStatus();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao salvar configuração",
        variant: "destructive"
      });
    } finally {
      setConfigLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/telegram-collector/auth/status');
      if (response.data.success) {
        setAuthStatus(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao verificar status de autenticação:', error);
    }
  };

  // Função para limpar sessões
  const clearSessions = async () => {
    if (!confirm('Tem certeza que deseja limpar todas as sessões do Telegram? Isso irá desconectar o cliente e remover todos os arquivos de sessão. Você precisará autenticar novamente.')) {
      return;
    }

    setClearingSessions(true);
    try {
      const response = await api.delete('/telegram-collector/sessions');
      
      if (response.data.success) {
        toast({
          title: "Sessões limpas",
          description: response.data.message || "Sessões removidas com sucesso",
        });
        
        // Recarregar status de autenticação
        await checkAuthStatus();
      }
    } catch (error) {
      console.error('Erro ao limpar sessões:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao limpar sessões",
        variant: "destructive",
      });
    } finally {
      setClearingSessions(false);
    }
  };

  const sendAuthCode = async () => {
    setAuthLoading(true);
    try {
      if (!config.phone) {
        toast({
          title: "Erro",
          description: "Configure o número de telefone primeiro",
          variant: "destructive"
        });
        return;
      }

      console.log('📱 Enviando código para:', config.phone);
      
      const response = await api.post('/telegram-collector/auth/send-code', {
        phone: config.phone
      });

      console.log('📥 Resposta recebida:', response.data);

      if (response.data.success) {
        setCodeSent(true);
        const message = response.data.message || 'Código enviado com sucesso. Verifique seu Telegram.';
        const timeout = response.data.data?.timeout || 120;
        
        toast({
          title: "Código Enviado",
          description: `${message} Aguarde até ${timeout} segundos. Verifique SMS e chamadas telefônicas.`,
          variant: "success",
          duration: 8000
        });
      } else {
        toast({
          title: "Aviso",
          description: response.data.message || "Resposta inesperada do servidor",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Erro ao enviar código:', error);
      console.error('   Response:', error.response?.data);
      console.error('   Status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         error.message || 
                         "Erro ao enviar código. Verifique os logs do servidor.";
      
      toast({
        title: "Erro ao Enviar Código",
        description: errorMessage,
        variant: "destructive",
        duration: 10000
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyAuthCode = async () => {
    setAuthLoading(true);
    try {
      if (!authCode) {
        toast({
          title: "Erro",
          description: "Digite o código recebido",
          variant: "destructive"
        });
        return;
      }

      const response = await api.post('/telegram-collector/auth/verify-code', {
        code: authCode,
        password: authPassword || null
      });

      if (response.data.success) {
        toast({
          title: "Sucesso",
          description: "Autenticação concluída!",
          variant: "success"
        });
        setCodeSent(false);
        setAuthCode('');
        setAuthPassword('');
        await checkAuthStatus();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao verificar código",
        variant: "destructive"
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const checkListenerStatus = async () => {
    try {
      const response = await api.get('/telegram-collector/listener/status');
      if (response.data.success) {
        setListenerStatus(response.data.data.status);
      }
    } catch (error) {
      console.error('Erro ao verificar status do listener:', error);
      setListenerStatus('error');
    }
  };

  const startListener = async () => {
    setListenerLoading(true);
    try {
      const response = await api.post('/telegram-collector/listener/start');
      if (response.data.success) {
        toast({
          title: "Sucesso",
          description: "Listener iniciado com sucesso",
          variant: "success"
        });
        await checkListenerStatus();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao iniciar listener",
        variant: "destructive"
      });
    } finally {
      setListenerLoading(false);
    }
  };

  const stopListener = async () => {
    setListenerLoading(true);
    try {
      const response = await api.post('/telegram-collector/listener/stop');
      if (response.data.success) {
        toast({
          title: "Sucesso",
          description: "Listener parado com sucesso",
          variant: "success"
        });
        await checkListenerStatus();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao parar listener",
        variant: "destructive"
      });
    } finally {
      setListenerLoading(false);
    }
  };

  const restartListener = async () => {
    setListenerLoading(true);
    try {
      const response = await api.post('/telegram-collector/listener/restart');
      if (response.data.success) {
        toast({
          title: "Sucesso",
          description: "Listener reiniciado com sucesso",
          variant: "success"
        });
        await checkListenerStatus();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao reiniciar listener",
        variant: "destructive"
      });
    } finally {
      setListenerLoading(false);
    }
  };

  const handleSaveChannel = async (e) => {
    e.preventDefault();
    setSavingChannel(true);
    try {
      if (!channelForm.name || (!channelForm.username && !channelForm.channel_id)) {
        toast({
          title: "Erro",
          description: "Nome e username ou ID do canal são obrigatórios",
          variant: "destructive"
        });
        return;
      }

      // Converter strings vazias para null nos campos TIME
      // Filtrar mensagens de exemplo vazias
      const formToSave = {
        ...channelForm,
        capture_schedule_start: channelForm.capture_schedule_start === '' ? null : channelForm.capture_schedule_start,
        capture_schedule_end: channelForm.capture_schedule_end === '' ? null : channelForm.capture_schedule_end,
        example_messages: Array.isArray(channelForm.example_messages) 
          ? channelForm.example_messages.filter(msg => msg && typeof msg === 'string' && msg.trim().length > 0)
          : []
      };

      if (editingChannel) {
        await api.put(`/telegram-channels/${editingChannel.id}`, formToSave);
        toast({
          title: "Sucesso",
          description: "Canal atualizado",
          variant: "success"
        });
      } else {
        await api.post('/telegram-channels', formToSave);
        toast({
          title: "Sucesso",
          description: "Canal criado",
          variant: "success"
        });
      }
      
      setIsDialogOpen(false);
      setEditingChannel(null);
      setChannelForm({ 
        name: '', 
        username: '',
        channel_id: '',
        is_active: true,
        capture_schedule_start: '',
        capture_schedule_end: '',
        capture_mode: 'new_only',
        platform_filter: 'all',
        example_messages: []
      });
      loadChannels();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao salvar canal",
        variant: "destructive"
      });
    } finally {
      setSavingChannel(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este canal?')) return;
    
    setDeletingChannel(prev => ({ ...prev, [id]: true }));
    try {
      await api.delete(`/telegram-channels/${id}`);
      toast({
        title: "Sucesso",
        description: "Canal deletado",
        variant: "success"
      });
      loadChannels();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao deletar canal",
        variant: "destructive"
      });
    } finally {
      setDeletingChannel(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleEdit = (channel) => {
    setEditingChannel(channel);
    setChannelForm({
      name: channel.name,
      username: channel.username || '',
      channel_id: channel.channel_id || '',
      is_active: channel.is_active,
      capture_schedule_start: channel.capture_schedule_start || '',
      capture_schedule_end: channel.capture_schedule_end || '',
      capture_mode: channel.capture_mode || 'new_only',
      platform_filter: channel.platform_filter || 'all',
      example_messages: Array.isArray(channel.example_messages) ? channel.example_messages : []
    });
    setIsDialogOpen(true);
  };
  
  const handleOpenCaptureConfig = (channel) => {
    setSelectedChannel(channel);
    setCaptureConfig({
      capture_schedule_start: channel.capture_schedule_start || '',
      capture_schedule_end: channel.capture_schedule_end || '',
      capture_mode: channel.capture_mode || 'new_only',
      platform_filter: channel.platform_filter || 'all'
    });
    setCaptureConfigDialog(true);
  };
  
  const handleSaveCaptureConfig = async (e) => {
    e.preventDefault();
    setSavingCaptureConfig(true);
    try {
      // Converter strings vazias para null nos campos TIME
      const configToSave = {
        ...captureConfig,
        capture_schedule_start: captureConfig.capture_schedule_start === '' ? null : captureConfig.capture_schedule_start,
        capture_schedule_end: captureConfig.capture_schedule_end === '' ? null : captureConfig.capture_schedule_end
      };
      
      await api.put(`/telegram-channels/${selectedChannel.id}`, configToSave);
      toast({
        title: "Sucesso",
        description: "Configuração de captura salva",
        variant: "success"
      });
      setCaptureConfigDialog(false);
      setSelectedChannel(null);
      loadChannels();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Erro ao salvar configuração";
      
      // Verificar se é erro de migration não executada
      if (errorMessage.includes('migration') || errorMessage.includes('não encontrados')) {
        toast({
          title: "Migration Necessária",
          description: errorMessage + " Execute a migration 028_add_telegram_channel_capture_settings.sql no Supabase.",
          variant: "destructive",
          duration: 10000
        });
      } else {
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setSavingCaptureConfig(false);
    }
  };

  const handleToggleActive = async (channel) => {
    setTogglingActive(prev => ({ ...prev, [channel.id]: true }));
    try {
      await api.put(`/telegram-channels/${channel.id}`, {
        is_active: !channel.is_active
      });
      toast({
        title: "Sucesso",
        description: `Canal ${!channel.is_active ? 'ativado' : 'desativado'}`,
        variant: "success"
      });
      loadChannels();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive"
      });
    } finally {
      setTogglingActive(prev => ({ ...prev, [channel.id]: false }));
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
            <MessageSquare className="h-8 w-8 text-blue-500" />
            Canais Telegram
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure, autentique e gerencie a captura de cupons via Telegram
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadChannels} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingChannel(null);
                setChannelForm({ 
                  name: '', 
                  username: '', 
                  channel_id: '', 
                  is_active: true,
                  capture_schedule_start: '',
                  capture_schedule_end: '',
                  capture_mode: 'new_only',
                  platform_filter: 'all',
                  example_messages: []
                });
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Canal
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingChannel ? 'Editar Canal' : 'Novo Canal'}</DialogTitle>
                <DialogDescription>
                  Adicione um canal do Telegram para monitoramento (público por username ou privado por ID)
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveChannel} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Canal *</Label>
                  <Input
                    id="name"
                    value={channelForm.name}
                    onChange={(e) => setChannelForm({...channelForm, name: e.target.value})}
                    placeholder="Ex: Canal de Cupons"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">Username do Canal (Público)</Label>
                  <Input
                    id="username"
                    value={channelForm.username}
                    onChange={(e) => setChannelForm({...channelForm, username: e.target.value})}
                    placeholder="@canaldecupons ou canaldecupons"
                  />
                  <p className="text-xs text-muted-foreground">
                    Para canais públicos: digite o username (com ou sem @)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channel_id">ID do Canal (Privado) *</Label>
                  <Input
                    id="channel_id"
                    value={channelForm.channel_id}
                    onChange={(e) => setChannelForm({...channelForm, channel_id: e.target.value})}
                    placeholder="-1001234567890"
                  />
                  <p className="text-xs text-muted-foreground">
                    Para canais privados: digite o ID do canal (formato: -1001234567890). 
                    <br />
                    <strong>Obrigatório se não informar username.</strong>
                  </p>
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

                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold text-sm">Configurações de Captura</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="capture_schedule_start">Horário Início</Label>
                      <Input
                        id="capture_schedule_start"
                        type="time"
                        value={channelForm.capture_schedule_start}
                        onChange={(e) => setChannelForm({...channelForm, capture_schedule_start: e.target.value})}
                      />
                      <p className="text-xs text-muted-foreground">
                        Deixe vazio para capturar 24h
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="capture_schedule_end">Horário Fim</Label>
                      <Input
                        id="capture_schedule_end"
                        type="time"
                        value={channelForm.capture_schedule_end}
                        onChange={(e) => setChannelForm({...channelForm, capture_schedule_end: e.target.value})}
                      />
                      <p className="text-xs text-muted-foreground">
                        Deixe vazio para capturar 24h
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="capture_mode">Modo de Captura *</Label>
                    <select
                      id="capture_mode"
                      value={channelForm.capture_mode}
                      onChange={(e) => setChannelForm({...channelForm, capture_mode: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      required
                    >
                      <option value="new_only">Apenas novas mensagens</option>
                      <option value="1_day">Mensagens antigas (máx 1 dia)</option>
                      <option value="2_days">Mensagens antigas (máx 2 dias)</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Define quantas mensagens antigas serão capturadas
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="platform_filter">Filtro de Plataforma *</Label>
                    <select
                      id="platform_filter"
                      value={channelForm.platform_filter}
                      onChange={(e) => setChannelForm({...channelForm, platform_filter: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      required
                    >
                      <option value="all">Todas as plataformas</option>
                      <option value="mercadolivre">Mercado Livre</option>
                      <option value="amazon">Amazon</option>
                      <option value="shopee">Shopee</option>
                      <option value="aliexpress">AliExpress</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Capturar cupons apenas desta plataforma ou todas
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Mensagens de Exemplo (IA)</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Adicione mensagens reais que este canal costuma enviar. A IA usará essas mensagens como referência para melhorar a captura de cupons, aprendendo os padrões específicos de formatação deste canal.
                  </p>
                  {channelForm.example_messages && Array.isArray(channelForm.example_messages) && channelForm.example_messages.length > 0 && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs text-blue-800 dark:text-blue-200">
                      <strong>💡 Dica:</strong> Quanto mais exemplos você adicionar, melhor a IA entenderá o formato deste canal.
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {(!channelForm.example_messages || !Array.isArray(channelForm.example_messages) || channelForm.example_messages.length === 0) ? (
                      <div className="p-3 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                        <Brain className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma mensagem de exemplo adicionada</p>
                        <p className="text-xs mt-1">Adicione mensagens reais do canal para melhorar a precisão da IA</p>
                      </div>
                    ) : (
                      (channelForm.example_messages || []).map((msg, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1">
                            <textarea
                              value={msg}
                              onChange={(e) => {
                                const currentMessages = channelForm.example_messages || [];
                                const newMessages = [...currentMessages];
                                newMessages[index] = e.target.value;
                                setChannelForm({...channelForm, example_messages: newMessages});
                              }}
                              className="w-full px-3 py-2 border rounded-md bg-background text-sm resize-y"
                              rows="3"
                              placeholder="Cole aqui uma mensagem de exemplo do canal..."
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Exemplo {index + 1} de {(channelForm.example_messages || []).length}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentMessages = channelForm.example_messages || [];
                              const newMessages = currentMessages.filter((_, i) => i !== index);
                              setChannelForm({...channelForm, example_messages: newMessages});
                            }}
                            className="mt-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentMessages = channelForm.example_messages || [];
                        setChannelForm({
                          ...channelForm,
                          example_messages: [...currentMessages, '']
                        });
                      }}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Mensagem de Exemplo
                    </Button>
                  </div>
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
          
          {/* Dialog de Configuração de Captura */}
          <Dialog open={captureConfigDialog} onOpenChange={setCaptureConfigDialog}>
            <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configurações de Captura</DialogTitle>
                <DialogDescription>
                  Configure quando e como capturar mensagens do canal {selectedChannel?.name}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveCaptureConfig} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="config_capture_schedule_start">Horário Início</Label>
                    <Input
                      id="config_capture_schedule_start"
                      type="time"
                      value={captureConfig.capture_schedule_start}
                      onChange={(e) => setCaptureConfig({...captureConfig, capture_schedule_start: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground">
                      Deixe vazio para 24h
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="config_capture_schedule_end">Horário Fim</Label>
                    <Input
                      id="config_capture_schedule_end"
                      type="time"
                      value={captureConfig.capture_schedule_end}
                      onChange={(e) => setCaptureConfig({...captureConfig, capture_schedule_end: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground">
                      Deixe vazio para 24h
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="config_capture_mode">Modo de Captura *</Label>
                  <select
                    id="config_capture_mode"
                    value={captureConfig.capture_mode}
                    onChange={(e) => setCaptureConfig({...captureConfig, capture_mode: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    required
                  >
                    <option value="new_only">Apenas novas mensagens</option>
                    <option value="1_day">Mensagens antigas (máx 1 dia)</option>
                    <option value="2_days">Mensagens antigas (máx 2 dias)</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Define quantas mensagens antigas serão capturadas
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="config_platform_filter">Filtro de Plataforma *</Label>
                  <select
                    id="config_platform_filter"
                    value={captureConfig.platform_filter}
                    onChange={(e) => setCaptureConfig({...captureConfig, platform_filter: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    required
                  >
                    <option value="all">Todas as plataformas</option>
                    <option value="mercadolivre">Mercado Livre</option>
                    <option value="amazon">Amazon</option>
                    <option value="shopee">Shopee</option>
                    <option value="aliexpress">AliExpress</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Capturar cupons apenas desta plataforma ou todas
                  </p>
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCaptureConfigDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={savingCaptureConfig}>
                    {savingCaptureConfig ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {['channels', 'config', 'auth', 'listener'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'channels' && <><MessageSquare className="inline mr-2 h-4 w-4" />Canais</>}
            {tab === 'config' && <><Settings className="inline mr-2 h-4 w-4" />Configuração</>}
            {tab === 'auth' && <><Key className="inline mr-2 h-4 w-4" />Autenticação</>}
            {tab === 'listener' && <><Power className="inline mr-2 h-4 w-4" />Listener</>}
          </button>
        ))}
      </div>

      {/* Tab: Configuração */}
      {activeTab === 'config' && (
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Telegram Collector</CardTitle>
            <CardDescription>
              Configure as credenciais da API do Telegram. Obtenha em{' '}
              <a href="https://my.telegram.org/apps" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                https://my.telegram.org/apps
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api_id">API ID *</Label>
              <Input
                id="api_id"
                type="text"
                value={config.api_id}
                onChange={(e) => setConfig({...config, api_id: e.target.value})}
                placeholder="12345678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_hash">API Hash *</Label>
              <Input
                id="api_hash"
                type="text"
                value={config.api_hash}
                onChange={(e) => setConfig({...config, api_hash: e.target.value})}
                placeholder="abcdef1234567890abcdef1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Número de Telefone *</Label>
              <Input
                id="phone"
                type="text"
                value={config.phone}
                onChange={(e) => setConfig({...config, phone: e.target.value})}
                placeholder="+5511999999999"
              />
              <p className="text-xs text-muted-foreground">
                Formato: +5511999999999 (com código do país)
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status das Credenciais:</span>
                <Badge variant={authStatus.has_credentials ? 'success' : 'destructive'}>
                  {authStatus.has_credentials ? (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Configuradas
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-1 h-3 w-3" />
                      Não Configuradas
                    </>
                  )}
                </Badge>
              </div>
            </div>

            <Button onClick={saveConfig} disabled={configLoading} className="w-full">
              {configLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Settings className="mr-2 h-4 w-4" />
                  Salvar Configuração
                </>
              )}
            </Button>
            
            {!authStatus.has_credentials && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="inline mr-1 h-4 w-4" />
                  Preencha todos os campos (API ID, API Hash e Telefone) e clique em "Salvar Configuração" para configurar as credenciais.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Autenticação */}
      {activeTab === 'auth' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Status de Autenticação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Credenciais Configuradas</span>
                  <Badge variant={authStatus.has_credentials ? 'success' : 'destructive'}>
                    {authStatus.has_credentials ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Sim
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" />
                        Não
                      </>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Autenticado</span>
                  <Badge variant={authStatus.is_authenticated ? 'success' : 'destructive'}>
                    {authStatus.is_authenticated ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Sim
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" />
                        Não
                      </>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sessão Criada</span>
                  <Badge variant={authStatus.has_session ? 'success' : 'destructive'}>
                    {authStatus.has_session ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Sim
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" />
                        Não
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {!authStatus.is_authenticated && (
            <Card>
              <CardHeader>
                <CardTitle>Autenticar Telegram</CardTitle>
                <CardDescription>
                  Envie um código de verificação para seu número de telefone
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Limpar Sessões
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Se estiver tendo problemas de conexão, limpe as sessões para forçar uma nova conexão
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={clearSessions}
                      disabled={clearingSessions}
                      className="ml-4"
                    >
                      {clearingSessions ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Limpando...
                        </>
                      ) : (
                        <>
                          <Trash className="mr-2 h-4 w-4" />
                          Limpar Sessões
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {!codeSent ? (
                  <>
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <AlertCircle className="inline mr-2 h-4 w-4" />
                        Certifique-se de que as credenciais estão configuradas antes de autenticar.
                      </p>
                    </div>
                    <Button 
                      onClick={sendAuthCode} 
                      disabled={authLoading || !authStatus.has_credentials}
                      className="w-full"
                    >
                      {authLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Enviar Código de Verificação
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <CheckCircle2 className="inline mr-2 h-4 w-4" />
                        Código enviado! Verifique seu Telegram e digite o código recebido abaixo.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="auth_code">Código de Verificação *</Label>
                      <Input
                        id="auth_code"
                        type="text"
                        value={authCode}
                        onChange={(e) => setAuthCode(e.target.value)}
                        placeholder="12345"
                        maxLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="auth_password">Senha 2FA (se tiver)</Label>
                      <Input
                        id="auth_password"
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Deixe em branco se não tiver 2FA"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={verifyAuthCode} 
                        disabled={authLoading || !authCode}
                        className="flex-1"
                      >
                        {authLoading ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Verificar Código
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setCodeSent(false);
                          setAuthCode('');
                          setAuthPassword('');
                          setAuthPassword('');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Listener */}
      {activeTab === 'listener' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Controle do Listener</span>
              <Badge variant={listenerStatus === 'running' ? 'success' : listenerStatus === 'error' ? 'destructive' : 'secondary'}>
                {listenerStatus === 'running' ? (
                  <>
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Online
                  </>
                ) : listenerStatus === 'error' ? (
                  <>
                    <XCircle className="mr-1 h-3 w-3" />
                    Erro
                  </>
                ) : (
                  <>
                    <Square className="mr-1 h-3 w-3" />
                    Offline
                  </>
                )}
              </Badge>
            </CardTitle>
            <CardDescription>
              Inicie, pare ou reinicie o listener que monitora os canais Telegram
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!authStatus.is_authenticated && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <AlertCircle className="inline mr-2 h-4 w-4" />
                  Você precisa autenticar o Telegram antes de iniciar o listener.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={startListener} 
                disabled={listenerLoading || listenerStatus === 'running' || !authStatus.is_authenticated}
                className="flex-1"
              >
                {listenerLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar Listener
                  </>
                )}
              </Button>
              <Button 
                onClick={stopListener} 
                disabled={listenerLoading || listenerStatus !== 'running'}
                variant="destructive"
                className="flex-1"
              >
                {listenerLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Parando...
                  </>
                ) : (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Parar Listener
                  </>
                )}
              </Button>
              <Button 
                onClick={restartListener} 
                disabled={listenerLoading || !authStatus.is_authenticated}
                variant="outline"
              >
                {listenerLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Reiniciando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reiniciar
                  </>
                )}
              </Button>
            </div>

            <Button 
              onClick={checkListenerStatus} 
              variant="outline" 
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar Status
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tab: Canais */}
      {activeTab === 'channels' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Status do Listener</span>
                <Badge variant={listenerStatus === 'running' ? 'default' : 'destructive'}>
                  {listenerStatus === 'running' ? (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Online
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-1 h-3 w-3" />
                      Offline
                    </>
                  )}
                </Badge>
              </CardTitle>
              <CardDescription>
                O listener monitora os canais ativos e captura cupons automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button onClick={checkListenerStatus} variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar Status
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Módulo de IA
                </span>
                <Badge variant={aiStatus.enabled ? 'success' : 'secondary'}>
                  {aiStatus.enabled ? (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Ativo
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-1 h-3 w-3" />
                      Inativo
                    </>
                  )}
                </Badge>
              </CardTitle>
              <CardDescription>
                Status do módulo de IA para extração inteligente de cupons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className="text-sm font-medium">
                    {aiStatus.enabled ? 'Habilitado e funcionando' : 'Desabilitado - usando método tradicional'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cupons extraídos via IA:</span>
                  <span className="text-sm font-medium">{aiStatus.coupons_extracted}</span>
                </div>
                {!aiStatus.enabled && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      💡 Para ativar a IA, configure o OpenRouter em <strong>Configurações → IA / OpenRouter</strong>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Channels Table */}
          <Card>
        <CardHeader>
          <CardTitle>Canais Monitorados</CardTitle>
          <CardDescription>
            {channels.length} canal(is) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Informação sobre Modo de Template */}
          <div className="mb-4 p-3 bg-muted rounded-md border">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Modo de Template para Cupons Capturados</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Cupons capturados do Telegram serão enviados usando o template de "Novo Cupom"
                </p>
              </div>
              <Badge className={getTemplateModeInfo().color}>
                {getTemplateModeInfo().icon} {getTemplateModeInfo().label}
              </Badge>
            </div>
            {getTemplateModeInfo().label === 'IA ADVANCED' && (
              <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs text-purple-800 dark:text-purple-200">
                <Brain className="h-3 w-3 inline mr-1" />
                A IA irá gerar o template automaticamente baseado no cupom capturado e contexto
              </div>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Configurações</TableHead>
                <TableHead className="text-center">Cupons Capturados</TableHead>
                <TableHead>Última Mensagem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum canal cadastrado. Clique em "Novo Canal" para adicionar.
                  </TableCell>
                </TableRow>
              ) : (
                channels.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell className="font-medium">{channel.name}</TableCell>
                    <TableCell>
                      {channel.username ? (
                        <a
                          href={`https://t.me/${channel.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-1"
                        >
                          @{channel.username}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : channel.channel_id ? (
                        <span className="text-muted-foreground text-xs font-mono">
                          ID: {channel.channel_id}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={channel.is_active ? 'success' : 'destructive'}>
                        {channel.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        {channel.capture_mode && (
                          <Badge variant="outline" className="text-xs">
                            {channel.capture_mode === 'new_only' ? 'Apenas novas' : 
                             channel.capture_mode === '1_day' ? 'Até 1 dia' : 
                             'Até 2 dias'}
                          </Badge>
                        )}
                        {channel.platform_filter && channel.platform_filter !== 'all' && (
                          <Badge variant="outline" className="text-xs">
                            {channel.platform_filter}
                          </Badge>
                        )}
                        {channel.capture_schedule_start && channel.capture_schedule_end && (
                          <span className="text-muted-foreground">
                            {channel.capture_schedule_start} - {channel.capture_schedule_end}
                          </span>
                        )}
                        {channel.example_messages && Array.isArray(channel.example_messages) && channel.example_messages.length > 0 && (
                          <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            <Brain className="inline mr-1 h-3 w-3" />
                            {channel.example_messages.length} exemplo{channel.example_messages.length > 1 ? 's' : ''} IA
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {channel.coupons_captured || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {channel.last_message_at
                        ? new Date(channel.last_message_at).toLocaleString('pt-BR')
                        : 'Nunca'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(channel)}
                          disabled={togglingActive[channel.id] || deletingChannel[channel.id]}
                        >
                          {togglingActive[channel.id] ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Atualizando...
                            </>
                          ) : channel.is_active ? (
                            <>
                              <Square className="mr-1 h-3 w-3" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Ativar
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenCaptureConfig(channel)}
                          title="Configurar captura"
                          disabled={togglingActive[channel.id] || deletingChannel[channel.id]}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(channel)}
                          disabled={togglingActive[channel.id] || deletingChannel[channel.id]}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(channel.id)}
                          disabled={togglingActive[channel.id] || deletingChannel[channel.id]}
                        >
                          {deletingChannel[channel.id] ? (
                            <Loader2 className="h-4 w-4 text-destructive animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
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
        </>
      )}
    </div>
  );
}

