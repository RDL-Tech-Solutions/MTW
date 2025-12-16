import { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../hooks/use-toast';
import { Settings as SettingsIcon, Save, Eye, EyeOff, ShoppingCart, Store, Package, Bell } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    
    // Expo
    expo_access_token: '',
    
    // Telegram Collector
    telegram_collector_rate_limit_delay: 1.0,
    telegram_collector_max_retries: 3,
    telegram_collector_reconnect_delay: 30,
    
    // Backend
    backend_url: 'http://localhost:3000',
    backend_api_key: ''
  });

  const [showSecrets, setShowSecrets] = useState({
    meli_client_secret: false,
    meli_access_token: false,
    meli_refresh_token: false,
    shopee_partner_key: false,
    amazon_secret_key: false,
    expo_access_token: false,
    backend_api_key: false
  });

  // Estado para rastrear quais campos têm valores salvos (mas estão mascarados)
  const [hasSavedValue, setHasSavedValue] = useState({
    meli_client_secret: false,
    meli_access_token: false,
    meli_refresh_token: false,
    shopee_partner_key: false,
    amazon_secret_key: false,
    expo_access_token: false,
    backend_api_key: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings');
      if (response.data.success) {
        // Garantir que todos os valores sejam strings (nunca null ou undefined)
        const data = response.data.data || {};
        
        // Restaurar valores salvos do sessionStorage (se existirem)
        const savedValues = sessionStorage.getItem('settings_saved_values');
        const restoredValues = savedValues ? JSON.parse(savedValues) : {};
        
        // Rastrear quais campos têm valores salvos (mascarados como '***' ou restaurados)
        setHasSavedValue({
          meli_client_secret: data.meli_client_secret === '***' || !!restoredValues.meli_client_secret,
          meli_access_token: data.meli_access_token === '***' || !!restoredValues.meli_access_token,
          meli_refresh_token: data.meli_refresh_token === '***' || !!restoredValues.meli_refresh_token,
          shopee_partner_key: data.shopee_partner_key === '***' || !!restoredValues.shopee_partner_key,
          amazon_secret_key: data.amazon_secret_key === '***' || !!restoredValues.amazon_secret_key,
          expo_access_token: data.expo_access_token === '***' || !!restoredValues.expo_access_token,
          backend_api_key: data.backend_api_key === '***' || !!restoredValues.backend_api_key
        });

        setSettings({
          meli_client_id: data.meli_client_id || '',
          meli_client_secret: restoredValues.meli_client_secret || '', // Restaurar do sessionStorage se existir
          meli_access_token: restoredValues.meli_access_token || '', // Restaurar do sessionStorage se existir
          meli_refresh_token: restoredValues.meli_refresh_token || '', // Restaurar do sessionStorage se existir
          meli_redirect_uri: data.meli_redirect_uri || '',
          meli_affiliate_code: data.meli_affiliate_code || '',
          meli_affiliate_tag: data.meli_affiliate_tag || '',
          shopee_partner_id: data.shopee_partner_id || '',
          shopee_partner_key: restoredValues.shopee_partner_key || '', // Restaurar do sessionStorage se existir
          amazon_access_key: data.amazon_access_key || '',
          amazon_secret_key: restoredValues.amazon_secret_key || '', // Restaurar do sessionStorage se existir
          amazon_partner_tag: data.amazon_partner_tag || '',
          amazon_marketplace: data.amazon_marketplace || 'www.amazon.com.br',
          aliexpress_api_url: data.aliexpress_api_url || 'https://api-sg.aliexpress.com/rest',
          expo_access_token: restoredValues.expo_access_token || '', // Restaurar do sessionStorage se existir
          telegram_collector_rate_limit_delay: data.telegram_collector_rate_limit_delay ?? 1.0,
          telegram_collector_max_retries: data.telegram_collector_max_retries ?? 3,
          telegram_collector_reconnect_delay: data.telegram_collector_reconnect_delay ?? 30,
          backend_url: data.backend_url || 'http://localhost:3000',
          backend_api_key: restoredValues.backend_api_key || '' // Restaurar do sessionStorage se existir
        });
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
      if (!dataToSend.expo_access_token || dataToSend.expo_access_token.trim() === '') {
        delete dataToSend.expo_access_token;
      }
      if (!dataToSend.backend_api_key || dataToSend.backend_api_key.trim() === '') {
        delete dataToSend.backend_api_key;
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
          expo_access_token: dataToSend.expo_access_token ? true : prev.expo_access_token,
          backend_api_key: dataToSend.backend_api_key ? true : prev.backend_api_key
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
          expo_access_token: dataToSend.expo_access_token ? prev.expo_access_token : prev.expo_access_token,
          backend_api_key: dataToSend.backend_api_key ? prev.backend_api_key : prev.backend_api_key
        }));

        // Salvar valores sensíveis no sessionStorage para persistir após recarregar
        const sensitiveValues = {};
        if (dataToSend.meli_client_secret) sensitiveValues.meli_client_secret = prev.meli_client_secret;
        if (dataToSend.meli_access_token) sensitiveValues.meli_access_token = prev.meli_access_token;
        if (dataToSend.meli_refresh_token) sensitiveValues.meli_refresh_token = prev.meli_refresh_token;
        if (dataToSend.shopee_partner_key) sensitiveValues.shopee_partner_key = prev.shopee_partner_key;
        if (dataToSend.amazon_secret_key) sensitiveValues.amazon_secret_key = prev.amazon_secret_key;
        if (dataToSend.expo_access_token) sensitiveValues.expo_access_token = prev.expo_access_token;
        if (dataToSend.backend_api_key) sensitiveValues.backend_api_key = prev.backend_api_key;
        
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
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Configurações Gerais
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie as configurações de integração com APIs e serviços externos
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Todas'}
        </Button>
      </div>

      <Tabs defaultValue="meli" className="space-y-6">
        <TabsList>
          <TabsTrigger value="meli">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Mercado Livre
          </TabsTrigger>
          <TabsTrigger value="shopee">
            <Store className="h-4 w-4 mr-2" />
            Shopee
          </TabsTrigger>
          <TabsTrigger value="amazon">
            <Package className="h-4 w-4 mr-2" />
            Amazon
          </TabsTrigger>
          <TabsTrigger value="expo">
            <Bell className="h-4 w-4 mr-2" />
            Expo / Push
          </TabsTrigger>
          <TabsTrigger value="other">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Outros
          </TabsTrigger>
        </TabsList>

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
                    onChange={(e) => setSettings({...settings, meli_client_id: e.target.value})}
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
                      onChange={(e) => setSettings({...settings, meli_client_secret: e.target.value})}
                      placeholder={hasSavedValue.meli_client_secret ? "Valor salvo (clique para editar)" : "Seu Client Secret"}
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
                      onChange={(e) => setSettings({...settings, meli_access_token: e.target.value})}
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
                      onChange={(e) => setSettings({...settings, meli_refresh_token: e.target.value})}
                      placeholder={hasSavedValue.meli_refresh_token ? "Valor salvo (clique para editar)" : "Refresh Token"}
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
                    onChange={(e) => setSettings({...settings, meli_redirect_uri: e.target.value})}
                    placeholder="https://seu-dominio.com/callback"
                  />
                </div>
                <div>
                  <Label htmlFor="meli_affiliate_code">Código de Afiliado</Label>
                  <Input
                    id="meli_affiliate_code"
                    value={settings.meli_affiliate_code || ''}
                    onChange={(e) => setSettings({...settings, meli_affiliate_code: e.target.value})}
                    placeholder="Código de afiliado"
                  />
                </div>
                <div>
                  <Label htmlFor="meli_affiliate_tag">Tag de Afiliado</Label>
                  <Input
                    id="meli_affiliate_tag"
                    value={settings.meli_affiliate_tag || ''}
                    onChange={(e) => setSettings({...settings, meli_affiliate_tag: e.target.value})}
                    placeholder="Tag de afiliado"
                  />
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
                  <Label htmlFor="shopee_partner_id">Partner ID</Label>
                  <Input
                    id="shopee_partner_id"
                    value={settings.shopee_partner_id || ''}
                    onChange={(e) => setSettings({...settings, shopee_partner_id: e.target.value})}
                    placeholder="Seu Partner ID"
                  />
                </div>
                <div>
                  <Label htmlFor="shopee_partner_key">Partner Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="shopee_partner_key"
                      type={showSecrets.shopee_partner_key ? 'text' : 'password'}
                      value={settings.shopee_partner_key || ''}
                      onChange={(e) => setSettings({...settings, shopee_partner_key: e.target.value})}
                      placeholder="Sua Partner Key"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSecret('shopee_partner_key')}
                    >
                      {showSecrets.shopee_partner_key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
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
                    onChange={(e) => setSettings({...settings, amazon_access_key: e.target.value})}
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
                      onChange={(e) => setSettings({...settings, amazon_secret_key: e.target.value})}
                      placeholder="Sua Secret Key"
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
                    onChange={(e) => setSettings({...settings, amazon_partner_tag: e.target.value})}
                    placeholder="Sua Partner Tag"
                  />
                </div>
                <div>
                  <Label htmlFor="amazon_marketplace">Marketplace</Label>
                  <Input
                    id="amazon_marketplace"
                    value={settings.amazon_marketplace || 'www.amazon.com.br'}
                    onChange={(e) => setSettings({...settings, amazon_marketplace: e.target.value})}
                    placeholder="www.amazon.com.br"
                  />
                </div>
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
                    onChange={(e) => setSettings({...settings, expo_access_token: e.target.value})}
                    placeholder="Seu Expo Access Token"
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
                      onChange={(e) => setSettings({...settings, telegram_collector_rate_limit_delay: parseFloat(e.target.value) || 1.0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="telegram_collector_max_retries">Max Retries</Label>
                    <Input
                      id="telegram_collector_max_retries"
                      type="number"
                      value={settings.telegram_collector_max_retries ?? 3}
                      onChange={(e) => setSettings({...settings, telegram_collector_max_retries: parseInt(e.target.value) || 3})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="telegram_collector_reconnect_delay">Reconnect Delay (s)</Label>
                    <Input
                      id="telegram_collector_reconnect_delay"
                      type="number"
                      value={settings.telegram_collector_reconnect_delay ?? 30}
                      onChange={(e) => setSettings({...settings, telegram_collector_reconnect_delay: parseInt(e.target.value) || 30})}
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
                      onChange={(e) => setSettings({...settings, backend_url: e.target.value})}
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
                        onChange={(e) => setSettings({...settings, backend_api_key: e.target.value})}
                        placeholder="API Key (opcional)"
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
                  <div>
                    <Label htmlFor="aliexpress_api_url">AliExpress API URL</Label>
                    <Input
                      id="aliexpress_api_url"
                      value={settings.aliexpress_api_url || 'https://api-sg.aliexpress.com/rest'}
                      onChange={(e) => setSettings({...settings, aliexpress_api_url: e.target.value})}
                      placeholder="https://api-sg.aliexpress.com/rest"
                    />
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

