import { useState, useEffect } from 'react';
import { Copy, Check, Download, Chrome, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import { useAuthStore } from '../stores/authStore';

export default function ExtensionToken() {
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // Obter token do localStorage
    const loadToken = () => {
      setLoading(true);
      
      // Tentar obter do zustand persist primeiro
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          if (parsed.state && parsed.state.token) {
            console.log('✅ Token encontrado no auth-storage');
            setToken(parsed.state.token);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.log('⚠️ Erro ao ler auth-storage:', e);
      }
      
      // Fallback: tentar obter do localStorage direto
      const storedToken = localStorage.getItem('token');
      console.log('🔍 Buscando token no localStorage...');
      console.log('Token encontrado:', storedToken ? 'Sim' : 'Não');
      
      if (storedToken) {
        setToken(storedToken);
        console.log('✅ Token carregado:', storedToken.substring(0, 20) + '...');
      } else {
        console.log('❌ Token não encontrado no localStorage');
      }
      setLoading(false);
    };

    loadToken();
  }, []);

  const refreshToken = () => {
    // Tentar obter do zustand persist primeiro
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        if (parsed.state && parsed.state.token) {
          setToken(parsed.state.token);
          toast({
            title: 'Token atualizado!',
            description: 'Token recarregado com sucesso.',
          });
          return;
        }
      }
    } catch (e) {
      console.log('Erro ao ler auth-storage:', e);
    }
    
    // Fallback
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      toast({
        title: 'Token atualizado!',
        description: 'Token recarregado do localStorage.',
      });
    } else {
      toast({
        title: 'Token não encontrado',
        description: 'Faça logout e login novamente.',
        variant: 'destructive'
      });
    }
  };

  const copyToken = () => {
    if (!token) {
      toast({
        title: 'Erro',
        description: 'Token não encontrado. Faça login novamente.',
        variant: 'destructive'
      });
      return;
    }

    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      toast({
        title: 'Token copiado!',
        description: 'Cole na extensão Chrome para começar a usar.',
      });
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      toast({
        title: 'Erro ao copiar',
        description: 'Selecione e copie manualmente o token.',
        variant: 'destructive'
      });
    });
  };

  const downloadInstructions = () => {
    const instructions = `
# Instruções - Extensão Chrome Captura de Produtos

## Seu Token de Autenticação:
${token}

## Como Instalar a Extensão:

1. Baixe a pasta 'chrome-extension' do projeto
2. Abra o Chrome e vá para: chrome://extensions/
3. Ative o "Modo do desenvolvedor" (canto superior direito)
4. Clique em "Carregar sem compactação"
5. Selecione a pasta 'chrome-extension'

## Como Configurar:

1. Clique no ícone da extensão na barra do Chrome
2. Cole o token acima no campo "Token de Autenticação"
3. Configure a URL da API: ${window.location.origin.replace(':3001', ':3000')}
4. Clique em "Salvar Configuração"

## Como Usar:

1. Navegue até qualquer página de produto (Amazon, AliExpress, etc.)
2. Clique no ícone da extensão
3. Clique em "Capturar Produto"
4. O produto será enviado como pendente para aprovação

## Segurança:

⚠️ Mantenha seu token em segredo!
⚠️ Não compartilhe com outras pessoas
⚠️ O token é válido por 30 dias

Data de geração: ${new Date().toLocaleString('pt-BR')}
`;

    const blob = new Blob([instructions], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extensao-chrome-instrucoes.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Instruções baixadas!',
      description: 'Arquivo salvo com seu token e instruções completas.',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-12 text-center">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Carregando token...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              Token Não Encontrado
            </CardTitle>
            <CardDescription>
              Você precisa estar logado para ver seu token
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              O token não foi encontrado no localStorage. Isso pode acontecer se:
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-2">
              <li>Você acabou de fazer login e a página não atualizou</li>
              <li>O localStorage foi limpo</li>
              <li>Você não está autenticado</li>
            </ul>
            <div className="flex gap-3 mt-6">
              <Button onClick={refreshToken} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Recarregar
              </Button>
              <Button onClick={() => window.location.href = '/login'} variant="default" className="flex-1">
                Fazer Login Novamente
              </Button>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Dica:</strong> Após fazer login, aguarde alguns segundos e clique em "Tentar Recarregar".
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Chrome className="h-8 w-8 text-blue-600" />
            Extensão Chrome
          </h1>
          <p className="text-gray-600 mt-1">
            Token de autenticação para captura de produtos
          </p>
        </div>
      </div>

      {/* Token Card */}
      <Card>
        <CardHeader>
          <CardTitle>🔑 Seu Token de Autenticação</CardTitle>
          <CardDescription>
            Use este token para configurar a extensão Chrome
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Token Display */}
          <div className="relative">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 pr-24 font-mono text-sm break-all">
              {token}
            </div>
            <Button
              onClick={copyToken}
              className="absolute top-2 right-2"
              size="sm"
              variant={copied ? "default" : "outline"}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </>
              )}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={copyToken} variant="default" className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              Copiar Token
            </Button>
            <Button onClick={downloadInstructions} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Baixar Instruções
            </Button>
            <Button onClick={refreshToken} variant="outline" size="icon" title="Recarregar token">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Como Usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold mb-1">Instalar a Extensão</h3>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Baixe a pasta <code className="bg-gray-100 px-1 rounded">chrome-extension</code> do projeto</li>
                <li>Abra o Chrome e vá para <code className="bg-gray-100 px-1 rounded">chrome://extensions/</code></li>
                <li>Ative o "Modo do desenvolvedor" (canto superior direito)</li>
                <li>Clique em "Carregar sem compactação"</li>
                <li>Selecione a pasta <code className="bg-gray-100 px-1 rounded">chrome-extension</code></li>
              </ol>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold mb-1">Configurar a Extensão</h3>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Clique no ícone da extensão na barra do Chrome</li>
                <li>Cole o token copiado no campo "Token de Autenticação"</li>
                <li>Configure a URL da API: <code className="bg-gray-100 px-1 rounded">{window.location.origin.replace(':3001', ':3000')}</code></li>
                <li>Clique em "Salvar Configuração"</li>
              </ol>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold mb-1">Capturar Produtos</h3>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Navegue até qualquer página de produto (Amazon, AliExpress, etc.)</li>
                <li>Clique no ícone da extensão</li>
                <li>Clique em "Capturar Produto"</li>
                <li>O produto será enviado como pendente para aprovação</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Warning */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="h-5 w-5" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-yellow-800 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-yellow-600">⚠️</span>
              <span>Mantenha seu token em segredo e não compartilhe com outras pessoas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-600">⚠️</span>
              <span>O token é válido por 30 dias. Após esse período, faça login novamente</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-600">⚠️</span>
              <span>Se suspeitar que seu token foi comprometido, faça logout e gere um novo</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Features Card */}
      <Card>
        <CardHeader>
          <CardTitle>✨ Funcionalidades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="font-semibold text-sm">Captura Automática</h4>
                <p className="text-xs text-gray-600">Extrai título, preço, imagem e descrição automaticamente</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="font-semibold text-sm">Detecção de Plataforma</h4>
                <p className="text-xs text-gray-600">Identifica Amazon, AliExpress, Shopee e mais</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="font-semibold text-sm">Categoria com IA</h4>
                <p className="text-xs text-gray-600">IA detecta automaticamente a categoria do produto</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="font-semibold text-sm">Preview Antes de Enviar</h4>
                <p className="text-xs text-gray-600">Visualize os dados capturados antes de confirmar</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
