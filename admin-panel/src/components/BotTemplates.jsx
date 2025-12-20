import { useEffect, useState } from 'react';
import api from '../services/api';
import { Edit, Save, X, Plus, Trash2, FileText, Info, Eye, Play, Copy, CheckCircle2, AlertCircle, Send, Copy as CopyIcon, Download, Sparkles, Brain, Loader2, Settings, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';

const templateTypes = {
  new_promotion: 'Nova Promoção (Sem Cupom)',
  promotion_with_coupon: 'Promoção + Cupom',
  new_coupon: 'Novo Cupom',
  expired_coupon: 'Cupom Expirado'
};

export default function BotTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [variables, setVariables] = useState({});
  const [activeType, setActiveType] = useState(Object.keys(templateTypes)[0]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [testTemplate, setTestTemplate] = useState(null);
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [templateModes, setTemplateModes] = useState({
    new_promotion: 'custom',
    promotion_with_coupon: 'custom',
    new_coupon: 'custom',
    expired_coupon: 'custom'
  });
  const [loadingModes, setLoadingModes] = useState(true);
  const [newTemplate, setNewTemplate] = useState({
    template_type: Object.keys(templateTypes)[0],
    platform: 'all',
    template: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    loadTemplates();
    loadTemplateModes();
  }, []);

  const loadTemplateModes = async () => {
    try {
      setLoadingModes(true);
      const response = await api.get('/settings');
      const settings = response.data.data;
      setTemplateModes({
        new_promotion: settings.template_mode_promotion || 'custom',
        promotion_with_coupon: settings.template_mode_promotion_coupon || 'custom',
        new_coupon: settings.template_mode_coupon || 'custom',
        expired_coupon: settings.template_mode_expired_coupon || 'custom'
      });
    } catch (error) {
      console.error('Erro ao carregar modos de template:', error);
    } finally {
      setLoadingModes(false);
    }
  };

  const handleTemplateModeChange = async (templateType, mode) => {
    try {
      const fieldMap = {
        new_promotion: 'template_mode_promotion',
        promotion_with_coupon: 'template_mode_promotion_coupon',
        new_coupon: 'template_mode_coupon',
        expired_coupon: 'template_mode_expired_coupon'
      };

      const field = fieldMap[templateType];
      if (!field) return;

      await api.put('/settings', { [field]: mode });
      
      setTemplateModes(prev => ({ ...prev, [templateType]: mode }));
      
      toast({
        title: "Sucesso",
        description: `Modo de template atualizado para ${mode === 'default' ? 'Padrão' : mode === 'custom' ? 'Customizado' : 'IA ADVANCED'}`,
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Falha ao atualizar modo de template",
        variant: "destructive"
      });
    }
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/bots/templates');
      setTemplates(response.data.data || []);
      
      // Carregar variáveis para cada tipo
      const vars = {};
      for (const type of Object.keys(templateTypes)) {
        try {
          const varResponse = await api.get(`/bots/templates/variables/${type}`);
          vars[type] = varResponse.data.data;
        } catch (error) {
          console.error(`Erro ao carregar variáveis para ${type}:`, error);
        }
      }
      setVariables(vars);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingId(template.id);
    setEditingTemplate({ ...template });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingTemplate(null);
  };

  const handleSave = async () => {
    try {
      await api.put(`/bots/templates/${editingId}`, editingTemplate);
      toast({
        title: "Sucesso",
        description: "Template atualizado com sucesso",
        variant: "success"
      });
      await loadTemplates();
      handleCancel();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Falha ao salvar template",
        variant: "destructive"
      });
    }
  };

  const handleGenerateWithAI = async () => {
    if (!newTemplate.template_type) {
      toast({
        title: "Erro",
        description: "Selecione o tipo de template primeiro",
        variant: "destructive"
      });
      return;
    }

    setGeneratingTemplate(true);
    try {
      const response = await api.post('/bots/templates/generate', {
        template_type: newTemplate.template_type,
        platform: newTemplate.platform,
        description: aiDescription
      });

      if (response.data.success) {
        setNewTemplate({
          ...newTemplate,
          template: response.data.data.template
        });
        toast({
          title: "Sucesso",
          description: "Template gerado com IA! Revise e ajuste se necessário.",
          variant: "success"
        });
        setAiDescription(''); // Limpar descrição após gerar
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Falha ao gerar template com IA",
        variant: "destructive"
      });
    } finally {
      setGeneratingTemplate(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!newTemplate.template.trim()) {
        toast({
          title: "Erro",
          description: "O template não pode estar vazio",
          variant: "destructive"
        });
        return;
      }

      await api.post('/bots/templates', newTemplate);
      toast({
        title: "Sucesso",
        description: "Template criado com sucesso",
        variant: "success"
      });
      setIsCreateDialogOpen(false);
      setNewTemplate({
        template_type: Object.keys(templateTypes)[0],
        platform: 'all',
        template: '',
        description: '',
        is_active: true
      });
      setAiDescription('');
      await loadTemplates();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Falha ao criar template",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id, isSystem) => {
    if (isSystem) {
      toast({
        title: "Ação não permitida",
        description: "Templates padrão do sistema não podem ser deletados. Eles são fixos e sempre devem existir.",
        variant: "destructive"
      });
      return;
    }
    
    if (!confirm('Tem certeza que deseja deletar este template?')) return;
    
    try {
      await api.delete(`/bots/templates/${id}`);
      toast({
        title: "Sucesso",
        description: "Template deletado com sucesso",
        variant: "success"
      });
      await loadTemplates();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Falha ao deletar template",
        variant: "destructive"
      });
    }
  };

  const handlePreview = (template) => {
    const varInfo = variables[template.template_type];
    let preview = template.template;
    
    // Substituir variáveis com exemplos
    if (varInfo && varInfo.variables) {
      const exampleValues = {
        product_name: 'Produto Exemplo',
        current_price: 'R$ 99,90',
        old_price: ' ~~R$ 199,90~~',
        discount_percentage: '50',
        platform_name: 'Mercado Livre',
        affiliate_link: 'https://exemplo.com/produto',
        coupon_section: '\n🎟️ *CUPOM DISPONÍVEL*\n\n💬 *Código:* `CUPOM10`\n💰 *Desconto:* 10% OFF\n',
        coupon_code: 'CUPOM10',
        discount_value: '10%',
        valid_until: '31/12/2024',
        min_purchase: '💳 *Compra mínima:* R$ 50,00\n',
        coupon_title: 'Cupom de Desconto',
        coupon_description: '\nDescrição do cupom de exemplo\n',
        expired_date: '31/12/2024'
      };

      varInfo.variables.forEach(varName => {
        const regex = new RegExp(`\\{${varName}\\}`, 'g');
        preview = preview.replace(regex, exampleValues[varName] || `{${varName}}`);
      });
    }

    setPreviewTemplate({ ...template, preview });
    setIsPreviewDialogOpen(true);
  };

  const handleTest = async (template) => {
    setTestTemplate(template);
    setIsTestDialogOpen(true);
  };

  const handleSendTest = async () => {
    try {
      if (!testTemplate) {
        toast({
          title: "Erro",
          description: "Template não encontrado",
          variant: "destructive"
        });
        return;
      }

      // Preparar variáveis de exemplo para renderizar o template
      const exampleVariables = {
        // Variáveis para new_promotion
        product_name: 'Produto de Exemplo',
        current_price: 'R$ 99,90',
        old_price: ' ~~R$ 199,90~~',
        discount_percentage: '50',
        platform_name: 'Mercado Livre',
        affiliate_link: 'https://exemplo.com/produto',
        coupon_section: '\n🎟️ **CUPOM DISPONÍVEL**\n\n💬 **Código:** `CUPOM10`\n💰 **Desconto:** 10% OFF\n',
        // Variáveis para new_coupon
        coupon_code: 'CUPOM10',
        discount_value: '10%',
        valid_until: '31/12/2024',
        min_purchase: '💳 **Compra mínima:** R$ 50,00\n',
        max_discount: '',
        usage_limit: '',
        applicability: '✅ **Válido para todos os produtos**',
        coupon_title: 'Cupom de Desconto',
        coupon_description: '\nDescrição do cupom de exemplo\n',
        // Variáveis para expired_coupon
        expired_date: '31/12/2024'
      };

      // Renderizar template com variáveis de exemplo
      let renderedMessage = testTemplate.template;
      for (const [key, value] of Object.entries(exampleVariables)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        renderedMessage = renderedMessage.replace(regex, value);
      }

      // Remover variáveis não substituídas (deixar vazio)
      renderedMessage = renderedMessage.replace(/\{[^}]+\}/g, '');

      // Limpar linhas vazias extras
      renderedMessage = renderedMessage.replace(/\n{3,}/g, '\n\n').trim();

      // Adicionar prefixo de teste
      const testMessage = `🧪 **TESTE DE TEMPLATE**\n\n${renderedMessage}\n\n_Esta é uma mensagem de teste do template "${testTemplate.description || testTemplate.template_type}"_`;

      // Enviar teste para todos os canais ativos
      const response = await api.post('/bots/test', {
        message: testMessage
      });
      
      const result = response.data.data;
      const sentCount = result?.sent || result?.total || 0;
      const failedCount = result?.failed || 0;

      if (sentCount > 0) {
        toast({
          title: "Sucesso",
          description: `Mensagem de teste enviada para ${sentCount} canal(is)${failedCount > 0 ? ` (${failedCount} falha(s))` : ''}`,
          variant: "success"
        });
      } else {
        toast({
          title: "Aviso",
          description: "Nenhum canal ativo encontrado ou todas as tentativas falharam",
          variant: "destructive"
        });
      }
      
      setIsTestDialogOpen(false);
    } catch (error) {
      console.error('Erro ao enviar teste:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || error.message || "Falha ao enviar teste",
        variant: "destructive"
      });
    }
  };

  const handleCopyVariable = (varName) => {
    navigator.clipboard.writeText(`{${varName}}`);
    toast({
      title: "Copiado!",
      description: `Variável {${varName}} copiada para a área de transferência`,
      variant: "success"
    });
  };

  const handleCreateDefaults = async () => {
    if (!confirm('Isso criará 9 templates padrão (3 para cada tipo). Deseja continuar?')) return;
    
    try {
      const response = await api.post('/bots/templates/create-defaults');
      toast({
        title: "Sucesso",
        description: response.data.message || "Templates padrão criados com sucesso",
        variant: "success"
      });
      await loadTemplates();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Falha ao criar templates padrão",
        variant: "destructive"
      });
    }
  };

  const handleDuplicate = async (template) => {
    try {
      const response = await api.post(`/bots/templates/${template.id}/duplicate`, {
        platform: template.platform,
        is_active: false
      });
      toast({
        title: "Sucesso",
        description: "Template duplicado com sucesso. Você pode editá-lo agora.",
        variant: "success"
      });
      await loadTemplates();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Falha ao duplicar template",
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await api.put(`/bots/templates/${id}`, { is_active: newStatus });
      toast({
        title: "Sucesso",
        description: newStatus 
          ? "Template ativado. Os bots usarão este template nas próximas mensagens."
          : "Template desativado. Os bots não usarão este template.",
        variant: "success"
      });
      await loadTemplates();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar status",
        variant: "destructive"
      });
    }
  };

  const renderTemplateEditor = (template) => {
    const varInfo = variables[template.template_type];
    
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Editar Template</CardTitle>
          <CardDescription>
            Use variáveis entre chaves: {'{'}variável{'}'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {template.is_system && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                🔒 <strong>Template Padrão do Sistema:</strong> Este é um template fixo. Apenas "Status" e "Descrição" podem ser alterados.
              </p>
            </div>
          )}
          <div>
            <Label>Plataforma</Label>
            <select
              value={editingTemplate.platform}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, platform: e.target.value })}
              disabled={template.is_system}
              className={`w-full p-2 border rounded-md ${template.is_system ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
            >
              <option value="all">Todas (Telegram e WhatsApp)</option>
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Selecione "Todas" para usar o mesmo template em ambas as plataformas, ou escolha uma específica
            </p>
          </div>

          <div>
            <Label>Status do Template</Label>
            <div className="flex items-center space-x-2 mt-2">
              <input
                type="checkbox"
                id="edit_template_active"
                checked={editingTemplate.is_active}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, is_active: e.target.checked })}
                className="h-4 w-4 rounded"
              />
              <Label htmlFor="edit_template_active" className="cursor-pointer">
                Template ativo (os bots usarão este template)
              </Label>
            </div>
            {!editingTemplate.is_active && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                ⚠️ Este template está inativo. Os bots não usarão este template até que seja ativado.
              </p>
            )}
          </div>

          <div>
            <Label>Template da Mensagem *</Label>
            <Textarea
              value={editingTemplate.template}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, template: e.target.value })}
              rows={15}
              disabled={template.is_system}
              className={`font-mono text-sm mt-1 ${template.is_system ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
              placeholder="Digite o template da mensagem usando variáveis entre chaves..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use variáveis entre chaves {'{'}{'}'} para inserir dados dinâmicos. Exemplo: {'{'}{'}'}product_name{'}'}{'}'}
              {template.is_system && (
                <span className="text-blue-600 dark:text-blue-400 block mt-1">
                  ⚠️ Este campo não pode ser editado em templates padrão do sistema.
                </span>
              )}
            </p>
          </div>

          {varInfo && (
            <div>
              <Label className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Variáveis Disponíveis
              </Label>
              <div className="mt-2 p-3 bg-muted rounded-md">
                <div className="flex flex-wrap gap-2 mb-3">
                  {varInfo.variables?.map((varName) => (
                    <Badge 
                      key={varName} 
                      variant="outline" 
                      className="font-mono cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => handleCopyVariable(varName)}
                      title="Clique para copiar"
                    >
                      {'{'}{varName}{'}'}
                    </Badge>
                  ))}
                </div>
                {varInfo.description && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    <p className="font-semibold mb-2">Descrições:</p>
                    <div className="space-y-1">
                      {Object.entries(varInfo.description).map(([key, desc]) => (
                        <div key={key} className="flex items-start gap-2">
                          <code className="text-xs bg-background px-1 py-0.5 rounded">{'{'}{key}{'}'}</code>
                          <span className="text-xs">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <Label>Descrição (opcional)</Label>
            <Input
              value={editingTemplate.description || ''}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
              placeholder="Descrição do template..."
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Carregando templates...</div>;
  }

  // Agrupar templates por tipo
  const templatesByType = {};
  Object.keys(templateTypes).forEach(type => {
    templatesByType[type] = templates.filter(t => t.template_type === type);
  });

  return (
    <div className="space-y-6">
      {/* Seção de Configuração de Modo de Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração de Modo de Template
          </CardTitle>
          <CardDescription>
            Escolha como os templates serão gerados para cada tipo de mensagem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(templateTypes).map(([key, label]) => {
              const currentMode = templateModes[key] || 'custom';
              return (
                <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-base font-semibold">{label}</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentMode === 'default' && '📋 Usa template padrão do sistema'}
                      {currentMode === 'custom' && '✏️ Usa template salvo no painel admin'}
                      {currentMode === 'ai_advanced' && '🤖 IA ADVANCED: Gera template automaticamente baseado no contexto'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={currentMode === 'default' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleTemplateModeChange(key, 'default')}
                      disabled={loadingModes}
                    >
                      Padrão
                    </Button>
                    <Button
                      variant={currentMode === 'custom' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleTemplateModeChange(key, 'custom')}
                      disabled={loadingModes}
                    >
                      Customizado
                    </Button>
                    <Button
                      variant={currentMode === 'ai_advanced' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleTemplateModeChange(key, 'ai_advanced')}
                      disabled={loadingModes}
                      className={currentMode === 'ai_advanced' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      IA ADVANCED
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>💡 Dica:</strong> IA ADVANCED analisa o produto/cupom e gera templates personalizados automaticamente, 
              adaptando-se ao desconto, urgência e contexto. Requer OpenRouter configurado em Configurações → IA / OpenRouter.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Templates de Mensagens</h2>
          <p className="text-muted-foreground">
            Personalize as mensagens enviadas pelos bots. Use variáveis entre chaves {'{'}{'}'} para inserir dados dinâmicos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleCreateDefaults}
            title="Criar 3 modelos padrão para cada tipo de template"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Criar Templates Padrão
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              // Limpar campos quando dialog fecha
              setAiDescription('');
              setGeneratingTemplate(false);
            }
          }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setNewTemplate({
                template_type: activeType,
                platform: 'all',
                template: '',
                description: '',
                is_active: true
              });
              setAiDescription('');
              setGeneratingTemplate(false);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Template</DialogTitle>
              <DialogDescription>
                Crie um novo template de mensagem para os bots
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo de Template *</Label>
                <select
                  value={newTemplate.template_type}
                  onChange={(e) => setNewTemplate({ ...newTemplate, template_type: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  {Object.entries(templateTypes).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Plataforma *</Label>
                <select
                  value={newTemplate.platform}
                  onChange={(e) => setNewTemplate({ ...newTemplate, platform: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="all">Todas (Telegram e WhatsApp)</option>
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Template da Mensagem *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateWithAI}
                    disabled={generatingTemplate}
                    className="flex items-center gap-2"
                  >
                    {generatingTemplate ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4" />
                        Gerar com IA
                      </>
                    )}
                  </Button>
                </div>
                {generatingTemplate && (
                  <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      🤖 Gerando template com IA... Isso pode levar alguns segundos.
                    </p>
                  </div>
                )}
                <div className="mb-2">
                  <Label className="text-sm text-muted-foreground">Descrição para IA (opcional)</Label>
                  <Input
                    value={aiDescription}
                    onChange={(e) => setAiDescription(e.target.value)}
                    placeholder="Ex: Template criativo e atrativo com emojis, focado em economia..."
                    className="text-sm"
                    disabled={generatingTemplate}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Descreva como você quer que o template seja. Deixe vazio para usar padrão.
                  </p>
                </div>
                <Textarea
                  value={newTemplate.template}
                  onChange={(e) => setNewTemplate({ ...newTemplate, template: e.target.value })}
                  rows={12}
                  className="font-mono text-sm"
                  placeholder="Digite o template da mensagem ou clique em 'Gerar com IA' para criar automaticamente..."
                  disabled={generatingTemplate}
                />
                {variables[newTemplate.template_type] && (
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <p className="text-sm font-semibold mb-2">Variáveis Disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                      {variables[newTemplate.template_type].variables?.map((varName) => (
                        <Badge 
                          key={varName} 
                          variant="outline" 
                          className="font-mono cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => {
                            const textarea = document.querySelector('textarea');
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const before = text.substring(0, start);
                            const after = text.substring(end, text.length);
                            const newValue = before + `{${varName}}` + after;
                            setNewTemplate({ ...newTemplate, template: newValue });
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + varName.length + 2, start + varName.length + 2);
                            }, 0);
                          }}
                        >
                          {'{'}{varName}{'}'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label>Descrição (opcional)</Label>
                <Input
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Descrição do template..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="new_template_active"
                  checked={newTemplate.is_active}
                  onChange={(e) => setNewTemplate({ ...newTemplate, is_active: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <Label htmlFor="new_template_active">Template ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate}>
                <Save className="mr-2 h-4 w-4" />
                Criar Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex gap-2 border-b">
          {Object.entries(templateTypes).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveType(key)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeType === key
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {Object.entries(templateTypes).map(([type, label]) => (
          activeType === type && (
          <div key={type} className="space-y-4">
            {/* Agrupar por plataforma */}
            {['all', 'telegram', 'whatsapp'].map((platform) => {
              const platformTemplates = templatesByType[type]?.filter(t => t.platform === platform) || [];
              if (platformTemplates.length === 0) return null;
              
              return (
                <div key={platform} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">
                      {platform === 'all' ? '🌐 Todas as Plataformas' : 
                       platform === 'telegram' ? '📱 Telegram' : 
                       '💬 WhatsApp'}
                    </h3>
                    <Badge variant="secondary">{platformTemplates.length} template(s)</Badge>
                  </div>
                  {platformTemplates.map((template) => (
                    <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {label}
                        <Badge variant={template.platform === 'all' ? 'default' : 'secondary'}>
                          {template.platform === 'all' ? 'Todas' : template.platform}
                        </Badge>
                        {!template.is_active && (
                          <Badge variant="outline">Inativo</Badge>
                        )}
                        {template.is_system && (
                          <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                            🔒 Template Padrão
                          </Badge>
                        )}
                      </CardTitle>
                      {template.description && (
                        <CardDescription className="mt-1">
                          {template.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(template)}
                        title="Visualizar preview"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(template)}
                        title="Testar template"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(template)}
                        title="Duplicar template"
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(template.id, template.is_active)}
                      >
                        {template.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(template.id, template.is_system)}
                        disabled={template.is_system}
                        className={template.is_system ? "opacity-50 cursor-not-allowed" : "text-destructive hover:text-destructive"}
                        title={template.is_system ? "Template padrão do sistema não pode ser deletado" : "Deletar template"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingId === template.id ? (
                    renderTemplateEditor(template)
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-muted p-4 rounded-md">
                        <pre className="whitespace-pre-wrap text-sm font-mono">
                          {template.template}
                        </pre>
                      </div>
                      {template.is_active && (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Este template está ativo e será usado pelos bots</span>
                        </div>
                      )}
                      {!template.is_active && (
                        <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                          <AlertCircle className="h-4 w-4" />
                          <span>Este template está inativo e não será usado pelos bots</span>
                        </div>
                      )}
                    </div>
                  )}
                    </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })}

            {(!templatesByType[type] || templatesByType[type].length === 0) && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum template encontrado para {label}
                </CardContent>
              </Card>
            )}
          </div>
          )
        ))}
      </div>

      {/* Dialog de Preview */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview do Template</DialogTitle>
            <DialogDescription>
              Visualização de como a mensagem será exibida com variáveis preenchidas
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Template Original</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{previewTemplate.template}</pre>
                </div>
              </div>
              <div>
                <Label>Preview com Variáveis</Label>
                <div className="mt-1 p-4 bg-background border rounded-md">
                  <pre className="whitespace-pre-wrap text-sm">{previewTemplate.preview}</pre>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Teste */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Testar Template</DialogTitle>
            <DialogDescription>
              Enviar uma mensagem de teste usando este template para todos os canais ativos
            </DialogDescription>
          </DialogHeader>
          {testTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Template</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{testTemplate.template}</pre>
                </div>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ A mensagem será enviada para todos os canais ativos configurados.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendTest}>
              <Send className="mr-2 h-4 w-4" />
              Enviar Teste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

