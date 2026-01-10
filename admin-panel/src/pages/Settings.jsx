import { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../hooks/use-toast';
import { Settings as SettingsIcon, Save, Eye, EyeOff, ShoppingCart, Store, Package, Bell, RefreshCw, Key, Brain, Globe, DollarSign, Sparkles, Loader2, Activity } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { OPENROUTER_MODELS, getModelsByType } from '../config/openrouterModels.js';

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meliCode, setMeliCode] = useState('');
  const [gettingRefreshToken, setGettingRefreshToken] = useState(false);
  const [generatingAccessToken, setGeneratingAccessToken] = useState(false);
  const [settings, setSettings] = useState({
    // Mercado Livre
    meli_client_id: '',
    meli_client_secret: '',
    meli_access_token: '',
    meli_refresh_token: '',
    meli_redirect_uri: '',
    meli_affiliate_code: '',
    meli_affiliate_tag: '',

    // Shopee
    shopee_partner_id: '',
    shopee_partner_key: '',

    // Amazon
    amazon_access_key: '',
    amazon_secret_key: '',
    amazon_partner_tag: '',
    amazon_marketplace: 'www.amazon.com.br',

    // AliExpress
    aliexpress_api_url: 'https://api-sg.aliexpress.com/rest',
    aliexpress_app_key: '',
    aliexpress_app_secret: '',
    aliexpress_tracking_id: '',
    aliexpress_product_origin: 'both',

    // Expo
    expo_access_token: '',

    // OpenRouter / IA
    openrouter_api_key: '',
    openrouter_model: 'mistralai/mistral-7b-instruct',
    openrouter_enabled: false,

    // Configurações de IA Avançadas
    ai_auto_publish_confidence_threshold: 0.90,
    ai_enable_auto_publish: true,
    ai_enable_product_editing: true,
    ai_enable_duplicate_detection: true,
    ai_enable_quality_scoring: true
  });

  // Novos estados para teste de modelos de IA
  const [modelStatus, setModelStatus] = useState([]);
  const [lastTest, setLastTest] = useState(null);
  const [testingModels, setTestingModels] = useState(false);
  const [canTest, setCanTest] = useState(true);


  const [showSecrets, setShowSecrets] = useState({
    meli_client_secret: false,
    meli_access_token: false,
    meli_refresh_token: false,
    shopee_partner_key: false,
    amazon_secret_key: false,
    aliexpress_app_secret: false,
    expo_access_token: false,
    openrouter_api_key: false
  });

  // Estado para rastrear quais campos têm valores salvos (mas estão mascarados)
  const [hasSavedValue, setHasSavedValue] = useState({
    meli_client_secret: false,
    meli_access_token: false,
    meli_refresh_token: false,
    shopee_partner_key: false,
    amazon_secret_key: false,
    aliexpress_app_secret: false,
    expo_access_token: false,
    openrouter_api_key: false
  });

  // Estados para auto-exclusão
  const [cleanupSchedule, setCleanupSchedule] = useState({
    hour: 3,
    lastRun: null,
    nextRun: null
  });
  const [loadingCleanup, setLoadingCleanup] = useState(false);

  useEffect(() => {
    loadSettings();
    loadModelStatus();
  }, []);

  const loadModelStatus = async () => {
    try {
      const response = await api.get('/ai/models/status');
      if (response.data.success) {
        setModelStatus(response.data.models || []);
        setLastTest(response.data.lastTest);
        setCanTest(response.data.canTest);
      }
    } catch (error) {
      console.warn('Erro ao carregar status dos modelos:', error);
    }
  };

  const handleTestModels = async () => {
    if (!settings.openrouter_api_key && !hasSavedValue.openrouter_api_key) {
      toast({
        title: "Erro",
        description: "Configure a API Key do OpenRouter antes de testar.",
        variant: "destructive"
      });
      return;
    }

    setTestingModels(true);
    try {
      const response = await api.post('/ai/models/test');
      if (response.data.success) {
        toast({
          title: "Teste Concluído",
          description: "A disponibilidade dos modelos foi verificada.",
        });
        loadModelStatus();
      }
    } catch (error) {
      toast({
        title: "Erro no Teste",
        description: error.response?.data?.error || "Falha ao testar modelos.",
        variant: "destructive"
      });
    } finally {
      setTestingModels(false);
    }
  };


  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings');
      if (response.data.success) {
        // Garantir que todos os valores sejam strings (nunca null ou undefined)
        const data = response.data.data || {};

        // Lista de campos sensíveis que precisam ser carregados do banco
        const sensitiveFields = [
          'meli_client_secret',
          'meli_access_token',
          'meli_refresh_token',
          'shopee_partner_key',
          'amazon_secret_key',
          'aliexpress_app_secret',
          'expo_access_token',
          'backend_api_key',
          'openrouter_api_key'
        ];

        // Identificar quais campos têm valores salvos (mascarados como '***')
        const fieldsWithValues = sensitiveFields.filter(field => data[field] === '***');

        // Carregar valores reais dos campos sensíveis que têm valores salvos
        let realValues = {};
        if (fieldsWithValues.length > 0) {
          try {
            const revealResponse = await api.get(`/settings/reveal?fields=${fieldsWithValues.join(',')}`);
            if (revealResponse.data.success) {
              realValues = revealResponse.data.data || {};
            }
          } catch (revealError) {
            console.warn('Erro ao carregar valores sensíveis:', revealError);
            // Continuar sem os valores reais se houver erro
          }
        }

        // Rastrear quais campos têm valores salvos
        setHasSavedValue({
          meli_client_secret: data.meli_client_secret === '***' || !!realValues.meli_client_secret,
          meli_access_token: data.meli_access_token === '***' || !!realValues.meli_access_token,
          meli_refresh_token: data.meli_refresh_token === '***' || !!realValues.meli_refresh_token,
          shopee_partner_key: data.shopee_partner_key === '***' || !!realValues.shopee_partner_key,
          amazon_secret_key: data.amazon_secret_key === '***' || !!realValues.amazon_secret_key,
          aliexpress_app_secret: data.aliexpress_app_secret === '***' || !!realValues.aliexpress_app_secret,
          expo_access_token: data.expo_access_token === '***' || !!realValues.expo_access_token,
          backend_api_key: data.backend_api_key === '***' || !!realValues.backend_api_key,
          openrouter_api_key: data.openrouter_api_key === '***' || !!realValues.openrouter_api_key
        });

        // Carregar todos os valores, incluindo os reais dos campos sensíveis
        setSettings({
          meli_client_id: data.meli_client_id || '',
          meli_client_secret: realValues.meli_client_secret || '',
          meli_access_token: realValues.meli_access_token || '',
          meli_refresh_token: realValues.meli_refresh_token || '',
          meli_redirect_uri: data.meli_redirect_uri || 'https://api.precocerto.app/',
          meli_affiliate_code: data.meli_affiliate_code || '',
          meli_affiliate_tag: data.meli_affiliate_tag || '',
          shopee_partner_id: data.shopee_partner_id || '',
          shopee_partner_key: realValues.shopee_partner_key || '',
          amazon_access_key: data.amazon_access_key || '',
          amazon_secret_key: realValues.amazon_secret_key || '',
          amazon_partner_tag: data.amazon_partner_tag || '',
          amazon_marketplace: data.amazon_marketplace || 'www.amazon.com.br',
          aliexpress_api_url: data.aliexpress_api_url || 'https://api-sg.aliexpress.com/rest',
          aliexpress_app_key: data.aliexpress_app_key || '',
          aliexpress_app_secret: realValues.aliexpress_app_secret || '',
          aliexpress_tracking_id: data.aliexpress_tracking_id || '',
          expo_access_token: realValues.expo_access_token || '',
          telegram_collector_rate_limit_delay: data.telegram_collector_rate_limit_delay ?? 1.0,
          telegram_collector_max_retries: data.telegram_collector_max_retries ?? 3,
          telegram_collector_reconnect_delay: data.telegram_collector_reconnect_delay ?? 30,
          backend_url: data.backend_url || 'http://localhost:3000',
          backend_api_key: realValues.backend_api_key || '',
          openrouter_api_key: realValues.openrouter_api_key || '',
          openrouter_model: data.openrouter_model || 'mistralai/mistral-7b-instruct',
          openrouter_enabled: data.openrouter_enabled ?? false,
          ai_auto_publish_confidence_threshold: data.ai_auto_publish_confidence_threshold ?? 0.90,
          ai_enable_auto_publish: data.ai_enable_auto_publish !== undefined ? data.ai_enable_auto_publish : true,
          ai_enable_product_editing: data.ai_enable_product_editing !== undefined ? data.ai_enable_product_editing : true,
          ai_enable_duplicate_detection: data.ai_enable_duplicate_detection !== undefined ? data.ai_enable_duplicate_detection : true,
          ai_enable_quality_scoring: data.ai_enable_quality_scoring !== undefined ? data.ai_enable_quality_scoring : true
        });

        // Salvar valores sensíveis no sessionStorage para persistência
        if (Object.keys(realValues).length > 0) {
          sessionStorage.setItem('settings_saved_values', JSON.stringify(realValues));
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar configurações.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Preparar dados para envio: não enviar campos vazios (para não sobrescrever valores existentes)
      const dataToSend = { ...settings };

      // Remover campos vazios de secrets/tokens (para não sobrescrever valores existentes)
      if (!dataToSend.meli_client_secret || dataToSend.meli_client_secret.trim() === '') {
        delete dataToSend.meli_client_secret;
      }
      if (!dataToSend.meli_access_token || dataToSend.meli_access_token.trim() === '') {
        delete dataToSend.meli_access_token;
      }
      if (!dataToSend.meli_refresh_token || dataToSend.meli_refresh_token.trim() === '') {
        delete dataToSend.meli_refresh_token;
      }
      if (!dataToSend.shopee_partner_key || dataToSend.shopee_partner_key.trim() === '') {
        delete dataToSend.shopee_partner_key;
      }
      if (!dataToSend.amazon_secret_key || dataToSend.amazon_secret_key.trim() === '') {
        delete dataToSend.amazon_secret_key;
      }
      if (!dataToSend.aliexpress_app_secret || dataToSend.aliexpress_app_secret.trim() === '') {
        delete dataToSend.aliexpress_app_secret;
      }
      if (!dataToSend.expo_access_token || dataToSend.expo_access_token.trim() === '') {
        delete dataToSend.expo_access_token;
      }
      if (!dataToSend.backend_api_key || dataToSend.backend_api_key.trim() === '') {
        delete dataToSend.backend_api_key;
      }
      if (!dataToSend.openrouter_api_key || dataToSend.openrouter_api_key.trim() === '') {
        delete dataToSend.openrouter_api_key;
      }

      const response = await api.put('/settings', dataToSend);
      if (response.data.success) {
        toast({
          title: "Sucesso",
          description: "Configurações salvas com sucesso!",
        });

        // Atualizar apenas campos não-sensíveis do response
        // Manter valores locais de secrets/tokens (não recarregar do servidor)
        const responseData = response.data.data || {};

        // Atualizar hasSavedValue para campos que foram salvos
        setHasSavedValue(prev => ({
          ...prev,
          meli_client_secret: dataToSend.meli_client_secret ? true : prev.meli_client_secret,
          meli_access_token: dataToSend.meli_access_token ? true : prev.meli_access_token,
          meli_refresh_token: dataToSend.meli_refresh_token ? true : prev.meli_refresh_token,
          shopee_partner_key: dataToSend.shopee_partner_key ? true : prev.shopee_partner_key,
          amazon_secret_key: dataToSend.amazon_secret_key ? true : prev.amazon_secret_key,
          aliexpress_app_secret: dataToSend.aliexpress_app_secret ? true : prev.aliexpress_app_secret,
          expo_access_token: dataToSend.expo_access_token ? true : prev.expo_access_token,
          backend_api_key: dataToSend.backend_api_key ? true : prev.backend_api_key,
          openrouter_api_key: dataToSend.openrouter_api_key ? true : prev.openrouter_api_key
        }));

        // Atualizar settings mantendo TODOS os valores que foram salvos
        setSettings(prev => ({
          ...prev,
          // Atualizar campos não-sensíveis do response
          meli_client_id: responseData.meli_client_id !== undefined ? responseData.meli_client_id : prev.meli_client_id,
          meli_redirect_uri: responseData.meli_redirect_uri !== undefined ? responseData.meli_redirect_uri : prev.meli_redirect_uri,
          meli_affiliate_code: responseData.meli_affiliate_code !== undefined ? responseData.meli_affiliate_code : prev.meli_affiliate_code,
          meli_affiliate_tag: responseData.meli_affiliate_tag !== undefined ? responseData.meli_affiliate_tag : prev.meli_affiliate_tag,
          shopee_partner_id: responseData.shopee_partner_id !== undefined ? responseData.shopee_partner_id : prev.shopee_partner_id,
          amazon_access_key: responseData.amazon_access_key !== undefined ? responseData.amazon_access_key : prev.amazon_access_key,
          amazon_partner_tag: responseData.amazon_partner_tag !== undefined ? responseData.amazon_partner_tag : prev.amazon_partner_tag,
          amazon_marketplace: responseData.amazon_marketplace !== undefined ? responseData.amazon_marketplace : prev.amazon_marketplace,
          aliexpress_api_url: responseData.aliexpress_api_url !== undefined ? responseData.aliexpress_api_url : prev.aliexpress_api_url,
          aliexpress_app_key: responseData.aliexpress_app_key !== undefined ? responseData.aliexpress_app_key : prev.aliexpress_app_key,
          aliexpress_tracking_id: responseData.aliexpress_tracking_id !== undefined ? responseData.aliexpress_tracking_id : prev.aliexpress_tracking_id,
          aliexpress_product_origin: responseData.aliexpress_product_origin !== undefined ? responseData.aliexpress_product_origin : prev.aliexpress_product_origin,
          telegram_collector_rate_limit_delay: responseData.telegram_collector_rate_limit_delay !== undefined ? responseData.telegram_collector_rate_limit_delay : prev.telegram_collector_rate_limit_delay,
          telegram_collector_max_retries: responseData.telegram_collector_max_retries !== undefined ? responseData.telegram_collector_max_retries : prev.telegram_collector_max_retries,
          telegram_collector_reconnect_delay: responseData.telegram_collector_reconnect_delay !== undefined ? responseData.telegram_collector_reconnect_delay : prev.telegram_collector_reconnect_delay,
          backend_url: responseData.backend_url !== undefined ? responseData.backend_url : prev.backend_url,
          // MANTER valores de secrets/tokens que foram salvos (não limpar)
          // Se foi enviado e salvo, manter o valor; se não foi enviado, manter o valor anterior
          meli_client_secret: dataToSend.meli_client_secret ? prev.meli_client_secret : prev.meli_client_secret,
          meli_access_token: dataToSend.meli_access_token ? prev.meli_access_token : prev.meli_access_token,
          meli_refresh_token: dataToSend.meli_refresh_token ? prev.meli_refresh_token : prev.meli_refresh_token,
          shopee_partner_key: dataToSend.shopee_partner_key ? prev.shopee_partner_key : prev.shopee_partner_key,
          amazon_secret_key: dataToSend.amazon_secret_key ? prev.amazon_secret_key : prev.amazon_secret_key,
          aliexpress_app_secret: dataToSend.aliexpress_app_secret ? prev.aliexpress_app_secret : prev.aliexpress_app_secret,
          expo_access_token: dataToSend.expo_access_token ? prev.expo_access_token : prev.expo_access_token,
          backend_api_key: dataToSend.backend_api_key ? prev.backend_api_key : prev.backend_api_key,
          openrouter_api_key: dataToSend.openrouter_api_key ? prev.openrouter_api_key : prev.openrouter_api_key,
          openrouter_model: responseData.openrouter_model !== undefined ? responseData.openrouter_model : prev.openrouter_model,
          openrouter_enabled: responseData.openrouter_enabled !== undefined ? responseData.openrouter_enabled : prev.openrouter_enabled,
          ai_auto_publish_confidence_threshold: responseData.ai_auto_publish_confidence_threshold !== undefined ? responseData.ai_auto_publish_confidence_threshold : prev.ai_auto_publish_confidence_threshold,
          ai_enable_auto_publish: responseData.ai_enable_auto_publish !== undefined ? responseData.ai_enable_auto_publish : prev.ai_enable_auto_publish,
          ai_enable_product_editing: responseData.ai_enable_product_editing !== undefined ? responseData.ai_enable_product_editing : prev.ai_enable_product_editing,
          ai_enable_duplicate_detection: responseData.ai_enable_duplicate_detection !== undefined ? responseData.ai_enable_duplicate_detection : prev.ai_enable_duplicate_detection,
          ai_enable_quality_scoring: responseData.ai_enable_quality_scoring !== undefined ? responseData.ai_enable_quality_scoring : prev.ai_enable_quality_scoring
        }));

        // Salvar valores sensíveis no sessionStorage para persistir após recarregar
        const sensitiveValues = {};
        if (dataToSend.meli_client_secret) sensitiveValues.meli_client_secret = prev.meli_client_secret;
        if (dataToSend.meli_access_token) sensitiveValues.meli_access_token = prev.meli_access_token;
        if (dataToSend.meli_refresh_token) sensitiveValues.meli_refresh_token = prev.meli_refresh_token;
        if (dataToSend.shopee_partner_key) sensitiveValues.shopee_partner_key = prev.shopee_partner_key;
        if (dataToSend.amazon_secret_key) sensitiveValues.amazon_secret_key = prev.amazon_secret_key;
        if (dataToSend.aliexpress_app_secret) sensitiveValues.aliexpress_app_secret = prev.aliexpress_app_secret;
        if (dataToSend.expo_access_token) sensitiveValues.expo_access_token = prev.expo_access_token;
        if (dataToSend.backend_api_key) sensitiveValues.backend_api_key = prev.backend_api_key;
        if (dataToSend.openrouter_api_key) sensitiveValues.openrouter_api_key = prev.openrouter_api_key;

        if (Object.keys(sensitiveValues).length > 0) {
          const existing = sessionStorage.getItem('settings_saved_values');
          const existingValues = existing ? JSON.parse(existing) : {};
          sessionStorage.setItem('settings_saved_values', JSON.stringify({ ...existingValues, ...sensitiveValues }));
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Falha ao salvar configurações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSecret = (key) => {
    // Apenas alternar visibilidade - os valores já estão carregados
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Estado inicial com Redirect URI correto
  // ... (manter o restante do loadSettings como estava, apenas garantindo que se não tiver valor, use o correto)

  const handleGetRefreshToken = async () => {
    if (!settings.meli_client_id || !settings.meli_client_secret || !settings.meli_redirect_uri) {
      toast({
        title: "Erro",
        description: "Preencha Client ID, Client Secret e Redirect URI antes de obter o refresh token.",
        variant: "destructive"
      });
      return;
    }

    setGettingRefreshToken(true);
    try {
      // Usar a URL direta de autorização
      const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${settings.meli_client_id}&redirect_uri=${encodeURIComponent(settings.meli_redirect_uri)}`;

      // Abrir em nova aba
      window.open(authUrl, '_blank');

      toast({
        title: "Autorização Iniciada",
        description: "1. Autorize no Mercado Livre. 2. Quando for redirecionado (mesmo se der erro), COPIE A URL COMPLETA da barra de endereço e cole no campo abaixo.",
        duration: 10000,
      });

      setGettingRefreshToken(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao abrir janela de autorização.",
        variant: "destructive"
      });
      setGettingRefreshToken(false);
    }
  };

  const handleExchangeCode = async () => {
    let codeToExchange = meliCode;

    // Extrair código se o usuário colou uma URL completa
    if (codeToExchange.includes('code=')) {
      try {
        const url = new URL(codeToExchange);
        codeToExchange = url.searchParams.get('code');
      } catch (e) {
        // Fallback simples se não for uma URL válida mas conter code=
        codeToExchange = codeToExchange.split('code=')[1].split('&')[0];
      }
    }

    // Limpar espaços
    codeToExchange = codeToExchange ? codeToExchange.trim() : '';

    if (!codeToExchange || !settings.meli_client_id || !settings.meli_client_secret || !settings.meli_redirect_uri) {
      toast({
        title: "Erro",
        description: "Cole a URL ou o código de autorização.",
        variant: "destructive"
      });
      return;
    }

    setGettingRefreshToken(true);
    try {
      const response = await api.post('/settings/meli/exchange-code', {
        code: codeToExchange,
        client_id: settings.meli_client_id,
        client_secret: settings.meli_client_secret,
        redirect_uri: settings.meli_redirect_uri
      });

      if (response.data.success) {
        // Atualizar tokens nos settings
        setSettings(prev => ({
          ...prev,
          meli_access_token: response.data.data.access_token,
          meli_refresh_token: response.data.data.refresh_token
        }));

        // Atualizar hasSavedValue
        setHasSavedValue(prev => ({
          ...prev,
          meli_access_token: true,
          meli_refresh_token: true
        }));

        // Salvar no sessionStorage
        const savedValues = sessionStorage.getItem('settings_saved_values');
        const existingValues = savedValues ? JSON.parse(savedValues) : {};
        sessionStorage.setItem('settings_saved_values', JSON.stringify({
          ...existingValues,
          meli_access_token: response.data.data.access_token,
          meli_refresh_token: response.data.data.refresh_token
        }));

        setMeliCode('');
        toast({
          title: "✅ Sucesso Absoluto!",
          description: "Integração com Mercado Livre renovada e salva com sucesso.",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao trocar token",
        description: error.response?.data?.message || "Verifique se o código não expirou (ele dura apenas 10 minutos e é de uso único). Tente gerar um novo.",
        variant: "destructive"
      });
    } finally {
      setGettingRefreshToken(false);
    }
  };

  const handleGenerateAccessToken = async () => {
    if (!settings.meli_refresh_token) {
      toast({
        title: "Erro",
        description: "Refresh token não encontrado. Obtenha um refresh token primeiro.",
        variant: "destructive"
      });
      return;
    }

    setGeneratingAccessToken(true);
    try {
      const response = await api.post('/settings/meli/refresh-token');

      if (response.data.success) {
        // Atualizar access token nos settings
        setSettings(prev => ({
          ...prev,
          meli_access_token: response.data.data.access_token,
          meli_refresh_token: response.data.data.refresh_token || prev.meli_refresh_token
        }));

        // Atualizar hasSavedValue
        setHasSavedValue(prev => ({
          ...prev,
          meli_access_token: true,
          meli_refresh_token: true
        }));

        // Salvar no sessionStorage
        const savedValues = sessionStorage.getItem('settings_saved_values');
        const existingValues = savedValues ? JSON.parse(savedValues) : {};
        sessionStorage.setItem('settings_saved_values', JSON.stringify({
          ...existingValues,
          meli_access_token: response.data.data.access_token,
          meli_refresh_token: response.data.data.refresh_token || existingValues.meli_refresh_token
        }));

        toast({
          title: "Sucesso",
          description: `Access token gerado com sucesso! Expira em ${Math.floor(response.data.data.expires_in / 3600)} horas.`,
        });
      }
    } catch (error) {
      const errorData = error.response?.data || {};
      const errorMessage = errorData.message || "Falha ao gerar access token.";
      const suggestions = errorData.suggestions || [];

      // Verificar se é erro de refresh token inválido/expirado
      const isInvalidGrant = errorMessage?.includes('invalid_grant') ||
        errorMessage?.includes('invalid_token') ||
        errorMessage?.includes('Refresh token inválido') ||
        errorMessage?.includes('expirado');

      let description = errorMessage;
      if (suggestions.length > 0) {
        description += '\n\n' + suggestions.join('\n');
      }

      if (isInvalidGrant) {
        description += '\n\n💡 O refresh token expirou ou foi usado. Você precisa obter um novo refresh token usando o fluxo de autorização acima.';
      }

      toast({
        title: "Erro ao renovar token",
        description: description,
        variant: "destructive",
        duration: 10000 // Mostrar por mais tempo para mensagens importantes
      });
    } finally {
      setGeneratingAccessToken(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8" />
            Configurações
          </h1>
          <p className="text-sm text-gray-600 mt-0.5 sm:mt-1">
            Integração com APIs e serviços externos
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto h-10">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Todas
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="meli" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-max sm:w-auto flex">
            <TabsTrigger value="meli" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Mercado Livre
            </TabsTrigger>
            <TabsTrigger value="shopee" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
              <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Shopee
            </TabsTrigger>
            <TabsTrigger value="amazon" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
              <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Amazon
            </TabsTrigger>
            <TabsTrigger value="aliexpress" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              AliExpress
            </TabsTrigger>
            <TabsTrigger value="expo" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Expo / Push
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
              <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              IA / OpenRouter
            </TabsTrigger>
            <TabsTrigger value="other" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
              <SettingsIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Outros
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Mercado Livre */}
        <TabsContent value="meli">
          <Card>
            <CardHeader>
              <CardTitle>Mercado Livre</CardTitle>
              <CardDescription>
                Configure as credenciais da API do Mercado Livre
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="meli_client_id">Client ID</Label>
                  <Input
                    id="meli_client_id"
                    value={settings.meli_client_id}
                    onChange={(e) => setSettings({ ...settings, meli_client_id: e.target.value })}
                    placeholder="Seu Client ID"
                  />
                </div>
                <div>
                  <Label htmlFor="meli_client_secret">Client Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      id="meli_client_secret"
                      type={showSecrets.meli_client_secret ? 'text' : 'password'}
                      value={settings.meli_client_secret || ''}
                      onChange={(e) => setSettings({ ...settings, meli_client_secret: e.target.value })}
                      placeholder={hasSavedValue.meli_client_secret ? "Valor salvo no banco de dados" : "Seu Client Secret"}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSecret('meli_client_secret')}
                    >
                      {showSecrets.meli_client_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="meli_access_token">Access Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="meli_access_token"
                      type={showSecrets.meli_access_token ? 'text' : 'password'}
                      value={settings.meli_access_token || ''}
                      onChange={(e) => setSettings({ ...settings, meli_access_token: e.target.value })}
                      placeholder={hasSavedValue.meli_access_token ? "Valor salvo (clique para editar)" : "Access Token (atualizado automaticamente)"}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSecret('meli_access_token')}
                    >
                      {showSecrets.meli_access_token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="meli_refresh_token">Refresh Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="meli_refresh_token"
                      type={showSecrets.meli_refresh_token ? 'text' : 'password'}
                      value={settings.meli_refresh_token || ''}
                      onChange={(e) => setSettings({ ...settings, meli_refresh_token: e.target.value })}
                      placeholder={hasSavedValue.meli_refresh_token ? "Valor salvo no banco de dados" : "Refresh Token"}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSecret('meli_refresh_token')}
                    >
                      {showSecrets.meli_refresh_token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="meli_redirect_uri">Redirect URI</Label>
                  <Input
                    id="meli_redirect_uri"
                    value={settings.meli_redirect_uri || ''}
                    onChange={(e) => setSettings({ ...settings, meli_redirect_uri: e.target.value })}
                    placeholder="https://seu-dominio.com/callback"
                  />
                </div>
                <div>
                  <Label htmlFor="meli_affiliate_code">Código de Afiliado</Label>
                  <Input
                    id="meli_affiliate_code"
                    value={settings.meli_affiliate_code || ''}
                    onChange={(e) => setSettings({ ...settings, meli_affiliate_code: e.target.value })}
                    placeholder="Código de afiliado"
                  />
                </div>
                <div>
                  <Label htmlFor="meli_affiliate_tag">Tag de Afiliado</Label>
                  <Input
                    id="meli_affiliate_tag"
                    value={settings.meli_affiliate_tag || ''}
                    onChange={(e) => setSettings({ ...settings, meli_affiliate_tag: e.target.value })}
                    placeholder="Tag de afiliado"
                  />
                </div>
              </div>

              {/* Seção de gerenciamento de tokens */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Gerenciamento de Tokens</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="meli_auth_code">Código de Autorização</Label>
                    <div className="flex gap-2">
                      <Input
                        id="meli_auth_code"
                        value={meliCode}
                        onChange={(e) => setMeliCode(e.target.value)}
                        placeholder="Cole o código recebido após autorizar no Mercado Livre"
                      />
                      <Button
                        onClick={handleGetRefreshToken}
                        disabled={gettingRefreshToken || !settings.meli_client_id || !settings.meli_client_secret || !settings.meli_redirect_uri}
                        variant="outline"
                      >
                        {gettingRefreshToken ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Abrindo...
                          </>
                        ) : (
                          <>
                            <Key className="h-4 w-4 mr-2" />
                            Obter Refresh Token
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Click em "Obter Refresh Token" para abrir o Mercado Livre. Autorize o app.
                      Quando for redirecionado (mesmo se der erro de página),
                      COPIE A URL DA BARRA DE ENDEREÇO e cole no campo acima.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleExchangeCode}
                      disabled={gettingRefreshToken || !meliCode || !settings.meli_client_id || !settings.meli_client_secret || !settings.meli_redirect_uri}
                      variant="default"
                    >
                      {gettingRefreshToken ? (
                        <>
                          <Loader2 className="h-4 mr-2 animate-spin" />
                          Trocando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 mr-2" />
                          Trocar por Tokens
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleGenerateAccessToken}
                      disabled={generatingAccessToken || !settings.meli_refresh_token}
                      variant="default"
                    >
                      {generatingAccessToken ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Gerar Access Token
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Use "Gerar Access Token" para renovar automaticamente o access token usando o refresh token salvo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shopee */}
        <TabsContent value="shopee">
          <Card>
            <CardHeader>
              <CardTitle>Shopee</CardTitle>
              <CardDescription>
                Configure as credenciais da API da Shopee
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shopee_partner_id">AppID (Partner ID)</Label>
                  <Input
                    id="shopee_partner_id"
                    value={settings.shopee_partner_id || ''}
                    onChange={(e) => setSettings({ ...settings, shopee_partner_id: e.target.value })}
                    placeholder="Digite o AppID da Shopee (ex: 18349000441)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    O AppID fornecido pela Shopee é o mesmo que Partner ID
                  </p>
                </div>
                <div>
                  <Label htmlFor="shopee_partner_key">Secret (Partner Key)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="shopee_partner_key"
                      type={showSecrets.shopee_partner_key ? 'text' : 'password'}
                      value={settings.shopee_partner_key || ''}
                      onChange={(e) => setSettings({ ...settings, shopee_partner_key: e.target.value })}
                      placeholder={hasSavedValue.shopee_partner_key ? "Valor salvo no banco de dados" : "Digite o Secret da Shopee"}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSecret('shopee_partner_key')}
                    >
                      {showSecrets.shopee_partner_key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    O Secret fornecido pela Shopee é o mesmo que Partner Key
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Amazon */}
        <TabsContent value="amazon">
          <Card>
            <CardHeader>
              <CardTitle>Amazon</CardTitle>
              <CardDescription>
                Configure as credenciais da API da Amazon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amazon_access_key">Access Key</Label>
                  <Input
                    id="amazon_access_key"
                    value={settings.amazon_access_key || ''}
                    onChange={(e) => setSettings({ ...settings, amazon_access_key: e.target.value })}
                    placeholder="Sua Access Key"
                  />
                </div>
                <div>
                  <Label htmlFor="amazon_secret_key">Secret Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="amazon_secret_key"
                      type={showSecrets.amazon_secret_key ? 'text' : 'password'}
                      value={settings.amazon_secret_key || ''}
                      onChange={(e) => setSettings({ ...settings, amazon_secret_key: e.target.value })}
                      placeholder={hasSavedValue.amazon_secret_key ? "Valor salvo no banco de dados" : "Sua Secret Key"}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSecret('amazon_secret_key')}
                    >
                      {showSecrets.amazon_secret_key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="amazon_partner_tag">Partner Tag</Label>
                  <Input
                    id="amazon_partner_tag"
                    value={settings.amazon_partner_tag || ''}
                    onChange={(e) => setSettings({ ...settings, amazon_partner_tag: e.target.value })}
                    placeholder="Sua Partner Tag"
                  />
                </div>
                <div>
                  <Label htmlFor="amazon_marketplace">Marketplace</Label>
                  <Input
                    id="amazon_marketplace"
                    value={settings.amazon_marketplace || 'www.amazon.com.br'}
                    onChange={(e) => setSettings({ ...settings, amazon_marketplace: e.target.value })}
                    placeholder="www.amazon.com.br"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AliExpress */}
        <TabsContent value="aliexpress">
          <Card>
            <CardHeader>
              <CardTitle>AliExpress</CardTitle>
              <CardDescription>
                Configure as credenciais da API do AliExpress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="aliexpress_api_url">API URL</Label>
                  <Input
                    id="aliexpress_api_url"
                    value={settings.aliexpress_api_url || 'https://api-sg.aliexpress.com/rest'}
                    onChange={(e) => setSettings({ ...settings, aliexpress_api_url: e.target.value })}
                    placeholder="https://api-sg.aliexpress.com/rest"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL base da API do AliExpress
                  </p>
                </div>
                <div>
                  <Label htmlFor="aliexpress_app_key">App Key</Label>
                  <Input
                    id="aliexpress_app_key"
                    value={settings.aliexpress_app_key || ''}
                    onChange={(e) => setSettings({ ...settings, aliexpress_app_key: e.target.value })}
                    placeholder="Sua App Key do AliExpress"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    App Key obtida no painel de desenvolvedor do AliExpress
                  </p>
                </div>
                <div>
                  <Label htmlFor="aliexpress_app_secret">App Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      id="aliexpress_app_secret"
                      type={showSecrets.aliexpress_app_secret ? 'text' : 'password'}
                      value={settings.aliexpress_app_secret || ''}
                      onChange={(e) => setSettings({ ...settings, aliexpress_app_secret: e.target.value })}
                      placeholder={hasSavedValue.aliexpress_app_secret ? "Valor salvo no banco de dados" : "Sua App Secret do AliExpress"}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSecret('aliexpress_app_secret')}
                    >
                      {showSecrets.aliexpress_app_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    App Secret obtida no painel de desenvolvedor do AliExpress
                  </p>
                </div>
                <div>
                  <Label htmlFor="aliexpress_tracking_id">Tracking ID</Label>
                  <Input
                    id="aliexpress_tracking_id"
                    value={settings.aliexpress_tracking_id || ''}
                    onChange={(e) => setSettings({ ...settings, aliexpress_tracking_id: e.target.value })}
                    placeholder="Seu Tracking ID para links de afiliado"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tracking ID usado para gerar links de afiliado do AliExpress
                  </p>
                </div>
                <div>
                  <Label htmlFor="aliexpress_product_origin">Origem dos Produtos</Label>
                  <select
                    id="aliexpress_product_origin"
                    value={settings.aliexpress_product_origin || 'both'}
                    onChange={(e) => setSettings({ ...settings, aliexpress_product_origin: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="brazil">🇧🇷 Apenas Brasil</option>
                    <option value="international">🌍 Apenas Internacional</option>
                    <option value="both">🌎 Brasil + Internacional</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Escolha se deseja capturar produtos do Brasil, internacionais ou ambos no auto-sync
                  </p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Como obter as credenciais</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Acesse o painel de desenvolvedor do AliExpress</li>
                  <li>Crie uma aplicação para obter App Key e App Secret</li>
                  <li>Configure o Tracking ID no programa de afiliados</li>
                  <li>As credenciais são necessárias para usar a API do AliExpress</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expo */}
        <TabsContent value="expo">
          <Card>
            <CardHeader>
              <CardTitle>Expo / Push Notifications</CardTitle>
              <CardDescription>
                Configure o token de acesso do Expo para envio de notificações push
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="expo_access_token">Access Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="expo_access_token"
                    type={showSecrets.expo_access_token ? 'text' : 'password'}
                    value={settings.expo_access_token || ''}
                    onChange={(e) => setSettings({ ...settings, expo_access_token: e.target.value })}
                    placeholder={hasSavedValue.expo_access_token ? "Valor salvo no banco de dados" : "Seu Expo Access Token"}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleSecret('expo_access_token')}
                  >
                    {showSecrets.expo_access_token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OpenRouter / IA */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>IA / OpenRouter</CardTitle>
              <CardDescription>
                Configure o módulo de IA para extração inteligente de cupons do Telegram
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="openrouter_enabled"
                  checked={settings.openrouter_enabled || false}
                  onChange={(e) => setSettings({ ...settings, openrouter_enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="openrouter_enabled" className="cursor-pointer">
                  Ativar módulo de IA para extração de cupons
                </Label>
              </div>
              <p className="text-sm text-gray-500">
                Quando ativado, o sistema usará IA para analisar mensagens do Telegram e extrair informações de cupons de forma mais precisa.
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="openrouter_api_key">API Key do OpenRouter</Label>
                  <div className="flex gap-2">
                    <Input
                      id="openrouter_api_key"
                      type={showSecrets.openrouter_api_key ? 'text' : 'password'}
                      value={settings.openrouter_api_key || ''}
                      onChange={(e) => setSettings({ ...settings, openrouter_api_key: e.target.value })}
                      placeholder={hasSavedValue.openrouter_api_key ? "Valor salvo no banco de dados" : "sk-or-v1-..."}
                      disabled={!settings.openrouter_enabled}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSecret('openrouter_api_key')}
                      disabled={!settings.openrouter_enabled}
                    >
                      {showSecrets.openrouter_api_key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Obtenha sua API Key em{' '}
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      openrouter.ai/keys
                    </a>
                  </p>
                </div>

                <div>
                  <Label htmlFor="openrouter_model">Modelo de IA</Label>
                  <select
                    id="openrouter_model"
                    value={settings.openrouter_model || 'mistralai/mistral-7b-instruct'}
                    onChange={(e) => setSettings({ ...settings, openrouter_model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={!settings.openrouter_enabled}
                  >
                    <optgroup label="🆓 Modelos Gratuitos">
                      {getModelsByType('free').map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.provider}){model.supportsJson ? ' ✓ JSON' : ''}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="💳 Modelos Pagos">
                      {getModelsByType('paid').map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.provider}){model.supportsJson ? ' ✓ JSON' : ''} - {model.pricing || 'Custo variável'}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  {settings.openrouter_model && (() => {
                    const selectedModel = OPENROUTER_MODELS.find(m => m.id === settings.openrouter_model);
                    if (selectedModel) {
                      return (
                        <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                          <div className="flex items-center gap-2 mb-1">
                            {selectedModel.type === 'free' ? (
                              <Sparkles className="h-4 w-4 text-green-600" />
                            ) : (
                              <DollarSign className="h-4 w-4 text-blue-600" />
                            )}
                            <span className="font-medium text-sm">{selectedModel.name}</span>
                            {selectedModel.supportsJson && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Suporta JSON</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">{selectedModel.description}</p>
                          {selectedModel.pricing && (
                            <p className="text-xs text-blue-600 mt-1">💰 {selectedModel.pricing}</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <p className="text-sm text-gray-500 mt-2">
                    <strong>Gratuitos:</strong> Limites de rate (50 req/dia). <strong>Pagos:</strong> Melhor qualidade, consomem créditos.
                    Modelos com ✓ JSON retornam respostas mais estruturadas.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Como funciona</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>O módulo de IA analisa mensagens brutas capturadas do Telegram</li>
                    <li>Extrai informações estruturadas de cupons (código, desconto, plataforma, etc.)</li>
                    <li>Valida a confiabilidade da extração (confidence &gt; 0.75)</li>
                    <li>Se a IA falhar ou não estiver habilitada, o sistema usa o método tradicional (Regex)</li>
                    <li>Cupons extraídos pela IA são publicados automaticamente no App e Bots</li>
                  </ul>
                </div>

                {/* Configurações Avançadas de IA */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Configurações Avançadas de IA
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="ai_auto_publish_confidence_threshold">
                        Threshold de Confiança para Publicação Automática (0.0 - 1.0)
                      </Label>
                      <Input
                        id="ai_auto_publish_confidence_threshold"
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={settings.ai_auto_publish_confidence_threshold ?? 0.90}
                        onChange={(e) => setSettings({ ...settings, ai_auto_publish_confidence_threshold: parseFloat(e.target.value) || 0.90 })}
                        disabled={!settings.openrouter_enabled}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Cupons com confidence_score &gt;= este valor serão publicados automaticamente. Padrão: 0.90 (90%)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ai_enable_auto_publish"
                        checked={settings.ai_enable_auto_publish ?? true}
                        onChange={(e) => setSettings({ ...settings, ai_enable_auto_publish: e.target.checked })}
                        disabled={!settings.openrouter_enabled}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="ai_enable_auto_publish" className="cursor-pointer">
                        Publicação Automática de Cupons
                      </Label>
                    </div>
                    <p className="text-sm text-gray-500 ml-6">
                      Publicar automaticamente cupons com confidence_score alto (sem revisão manual)
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ai_enable_product_editing"
                        checked={settings.ai_enable_product_editing ?? true}
                        onChange={(e) => setSettings({ ...settings, ai_enable_product_editing: e.target.checked })}
                        disabled={!settings.openrouter_enabled}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="ai_enable_product_editing" className="cursor-pointer">
                        Edição de Produtos com IA
                      </Label>
                    </div>
                    <p className="text-sm text-gray-500 ml-6">
                      Reescrever títulos, gerar descrições e classificar categorias automaticamente
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ai_enable_duplicate_detection"
                        checked={settings.ai_enable_duplicate_detection ?? true}
                        onChange={(e) => setSettings({ ...settings, ai_enable_duplicate_detection: e.target.checked })}
                        disabled={!settings.openrouter_enabled}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="ai_enable_duplicate_detection" className="cursor-pointer">
                        Detecção de Produtos Duplicados
                      </Label>
                    </div>
                    <p className="text-sm text-gray-500 ml-6">
                      Identificar e evitar publicar o mesmo produto de diferentes plataformas
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ai_enable_quality_scoring"
                        checked={settings.ai_enable_quality_scoring ?? true}
                        onChange={(e) => setSettings({ ...settings, ai_enable_quality_scoring: e.target.checked })}
                        disabled={!settings.openrouter_enabled}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="ai_enable_quality_scoring" className="cursor-pointer">
                        Score de Qualidade de Ofertas
                      </Label>
                    </div>
                    <p className="text-sm text-gray-500 ml-6">
                      Calcular score baseado em desconto, histórico, popularidade e CTR
                    </p>
                  </div>
                </div>

                {/* Área de Teste de Modelos Online/Offline */}
                <div className="mt-8 pt-8 border-t">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Status de Disponibilidade dos Modelos
                      </h3>
                      <p className="text-sm text-gray-500">
                        Verifique quais modelos da OpenRouter estão online no momento.
                      </p>
                      {lastTest && (
                        <p className="text-xs text-primary mt-1 font-medium">
                          Último teste realizado em: {new Date(lastTest).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={handleTestModels}
                      disabled={testingModels || !canTest}
                      variant="outline"
                      className="w-full sm:w-auto"
                      type="button"
                    >
                      {testingModels ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {canTest ? 'Testar Modelos Agora' : 'Teste Disponível em 24h'}
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {OPENROUTER_MODELS.map(model => {
                      const statusInfo = modelStatus.find(s => s.model_id === model.id);
                      const isOnline = statusInfo?.status === 'online';
                      const isOffline = statusInfo?.status === 'offline';
                      const isError = statusInfo?.status === 'error';

                      return (
                        <div
                          key={model.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white shadow-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{model.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">{model.id}</span>
                            </div>
                            {statusInfo?.error_message && (isOffline || isError) && (
                              <p className="text-[11px] text-red-500 truncate mt-0.5">
                                ❌ {statusInfo.error_message}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            {statusInfo?.latency_ms && isOnline && (
                              <span className="text-[10px] text-gray-400 font-mono">
                                {statusInfo.latency_ms}ms
                              </span>
                            )}
                            <div className="flex items-center gap-1.5 min-w-[80px] justify-end">
                              <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                (isOffline || isError) ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                  'bg-gray-300'
                                }`} />
                              <span className={`text-xs font-semibold ${isOnline ? 'text-green-600' :
                                (isOffline || isError) ? 'text-red-600' :
                                  'text-gray-400'
                                }`}>
                                {isOnline ? 'Online' : (isOffline || isError) ? 'Offline' : 'Não testado'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!canTest && (
                    <p className="text-[11px] text-center text-gray-400 mt-4">
                      * O teste de disponibilidade consome tokens e é limitado a uma vez por dia para evitar custos excessivos.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Outros */}
        <TabsContent value="other">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Telegram Collector</CardTitle>
                <CardDescription>
                  Configurações do coletor de cupons do Telegram
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="telegram_collector_rate_limit_delay">Rate Limit Delay (s)</Label>
                    <Input
                      id="telegram_collector_rate_limit_delay"
                      type="number"
                      step="0.1"
                      value={settings.telegram_collector_rate_limit_delay ?? 1.0}
                      onChange={(e) => setSettings({ ...settings, telegram_collector_rate_limit_delay: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="telegram_collector_max_retries">Max Retries</Label>
                    <Input
                      id="telegram_collector_max_retries"
                      type="number"
                      value={settings.telegram_collector_max_retries ?? 3}
                      onChange={(e) => setSettings({ ...settings, telegram_collector_max_retries: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="telegram_collector_reconnect_delay">Reconnect Delay (s)</Label>
                    <Input
                      id="telegram_collector_reconnect_delay"
                      type="number"
                      value={settings.telegram_collector_reconnect_delay ?? 30}
                      onChange={(e) => setSettings({ ...settings, telegram_collector_reconnect_delay: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backend</CardTitle>
                <CardDescription>
                  Configurações gerais do backend
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="backend_url">Backend URL</Label>
                    <Input
                      id="backend_url"
                      value={settings.backend_url || 'http://localhost:3000'}
                      onChange={(e) => setSettings({ ...settings, backend_url: e.target.value })}
                      placeholder="http://localhost:3000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="backend_api_key">Backend API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="backend_api_key"
                        type={showSecrets.backend_api_key ? 'text' : 'password'}
                        value={settings.backend_api_key || ''}
                        onChange={(e) => setSettings({ ...settings, backend_api_key: e.target.value })}
                        placeholder={hasSavedValue.backend_api_key ? "Valor salvo no banco de dados" : "API Key (opcional)"}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleSecret('backend_api_key')}
                      >
                        {showSecrets.backend_api_key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

