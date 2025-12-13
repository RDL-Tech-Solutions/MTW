import { useEffect, useState } from 'react';
import api from '../services/api';
import { Edit, Save, X, Plus, Trash2, FileText, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';

const templateTypes = {
  new_promotion: 'Nova Promoção',
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

  useEffect(() => {
    loadTemplates();
  }, []);

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

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await api.put(`/bots/templates/${id}`, { is_active: !currentStatus });
      toast({
        title: "Sucesso",
        description: "Status do template atualizado",
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
          <div>
            <Label>Plataforma</Label>
            <select
              value={editingTemplate.platform}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, platform: e.target.value })}
              className="w-full p-2 border rounded-md"
            >
              <option value="all">Todas (Telegram e WhatsApp)</option>
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          <div>
            <Label>Template da Mensagem</Label>
            <textarea
              value={editingTemplate.template}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, template: e.target.value })}
              rows={15}
              className="w-full p-2 border rounded-md font-mono text-sm"
              placeholder="Digite o template da mensagem..."
            />
          </div>

          {varInfo && (
            <div>
              <Label className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Variáveis Disponíveis
              </Label>
              <div className="mt-2 p-3 bg-muted rounded-md">
                <div className="flex flex-wrap gap-2">
                  {varInfo.variables?.map((varName) => (
                    <Badge key={varName} variant="outline" className="font-mono">
                      {'{'}{varName}{'}'}
                    </Badge>
                  ))}
                </div>
                {varInfo.description && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    <p className="font-semibold mb-2">Descrições:</p>
                    {Object.entries(varInfo.description).map(([key, desc]) => (
                      <div key={key} className="mb-1">
                        <code className="text-xs">{'{'}{key}{'}'}</code>: {desc}
                      </div>
                    ))}
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
      <div>
        <h2 className="text-2xl font-bold">Templates de Mensagens</h2>
        <p className="text-muted-foreground">
          Personalize as mensagens enviadas pelos bots. Use variáveis entre chaves {'{'}{'}'} para inserir dados dinâmicos.
        </p>
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
            {templatesByType[type]?.map((template) => (
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
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingId === template.id ? (
                    renderTemplateEditor(template)
                  ) : (
                    <div className="bg-muted p-4 rounded-md">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {template.template}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

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
    </div>
  );
}

