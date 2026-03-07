# 🔌 Extensão Chrome - Captura de Produtos (v2.0)

Extensão Chrome avançada para capturar produtos de sites de e-commerce com 4 modos de salvamento e edição completa de dados.

## 🎯 Novidades da Versão 2.2

- ✅ **💾 Persistência de Dados**: Dados capturados não são perdidos ao fechar a extensão
- ✅ **📋 Botão Colar Link**: Ícone para colar link de afiliado com 1 clique
- ✅ **Validação Automática**: Verifica se o link colado é uma URL válida
- ✅ **Restauração Automática**: Dados são restaurados ao reabrir a extensão

## 🎯 Novidades da Versão 2.1

- ✅ **📦📦 Captura em Lote**: Captura múltiplos produtos de uma página
- ✅ **Progresso em Tempo Real**: Acompanhe o envio de cada produto
- ✅ **Contador de Sucessos/Falhas**: Veja quantos produtos foram salvos

## 🎯 Novidades da Versão 2.0

- ✅ **4 Modos de Salvamento**:
  - ⏸️ Salvar Pendente (aprovação manual)
  - 💾 Salvar (App) - sem publicar nos canais
  - 🚀 Salvar e Publicar - publicação imediata
  - 🤖 IA Agendar - IA define melhor horário
- ✅ **Edição Completa**: Edite todos os dados antes de salvar
- ✅ **Categorias**: Seleção manual ou detecção automática por IA
- ✅ **Preview de Imagem**: Visualize a imagem ao editar URL
- ✅ **Interface Melhorada**: Design moderno e intuitivo

## 📋 Funcionalidades

### Captura Automática
- Título do produto
- Descrição detalhada
- Preço atual e original
- Imagem de alta qualidade
- Link do produto
- Plataforma detectada automaticamente

### Captura Individual
- ✏️ Edite todos os dados antes de salvar
- 🔗 Personalize link de afiliado
- 📂 Escolha categoria ou deixe IA decidir
- 🖼️ Edite URL da imagem com preview
- 🎯 4 modos de salvamento

### 📦📦 Captura em Lote (v2.1)
- 🚀 Captura todos os produtos de uma página
- ⚡ Rápido e eficiente
- 📊 Progresso em tempo real
- ✅ Contador de sucessos/falhas
- 💾 Todos salvos como pendentes
- 🔍 Suporte para múltiplas plataformas

### 💾 Persistência e Facilidades (v2.2)
- 💾 Dados não são perdidos ao fechar extensão
- 📋 Botão para colar link de afiliado
- ✅ Validação automática de URL
- 🔄 Restauração automática ao reabrir

Veja mais em [CAPTURA_EM_LOTE.md](./CAPTURA_EM_LOTE.md) e [PERSISTENCIA_E_COLAR_LINK.md](./PERSISTENCIA_E_COLAR_LINK.md)

### 4 Modos de Salvamento

#### 1. ⏸️ Salvar Pendente
- Produto aguarda aprovação no painel
- Ideal para revisão manual
- Você controla quando publicar

#### 2. 💾 Salvar (App)
- Aparece no app para usuários
- **NÃO publica** nos canais (Telegram, WhatsApp)
- Perfeito para ofertas exclusivas do app

#### 3. 🚀 Salvar e Publicar
- Publicação **imediata** em todos os canais
- Telegram, WhatsApp, Push Notifications
- Ideal para ofertas relâmpago

#### 4. 🤖 IA Agendar
- IA analisa e define melhor horário
- Otimiza engajamento automaticamente
- Verifique agendamento no painel

## 🚀 Instalação

1. Abra o Chrome e vá para `chrome://extensions/`
2. Ative o "Modo do desenvolvedor" (canto superior direito)
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `chrome-extension`
5. A extensão aparecerá na barra de ferramentas

## ⚙️ Configuração

1. Clique no ícone da extensão
2. Preencha:
   - **URL da API**: `https://seu-dominio.com` (sem `/api`)
   - **Token de Autenticação**: Obtenha no painel admin
3. Clique em "Salvar Configuração"

### Como obter o token?

1. Acesse o painel admin
2. Faça login
3. Vá para **"Token da Extensão"** no menu
4. Copie o token exibido

Veja mais detalhes em [COMO_OBTER_TOKEN.md](./COMO_OBTER_TOKEN.md)

## 📖 Como Usar

### Captura Individual

#### Passo 1: Capturar
1. Navegue até uma página de produto
2. Clique no ícone da extensão
3. Clique em **"📦 Capturar Produto"**

#### Passo 2: Editar (Opcional)
- Edite título, descrição, preços
- Personalize link de afiliado
- 📋 **Use o botão colar** para adicionar link facilmente
- Escolha categoria ou deixe IA decidir
- Ajuste URL da imagem
- 💾 **Pode fechar e reabrir** - dados não são perdidos!

#### Passo 3: Escolher Ação
Escolha um dos 4 modos:
- ⏸️ **Salvar Pendente**: Para revisar depois
- 💾 **Salvar (App)**: Exclusivo do app
- 🚀 **Salvar e Publicar**: Publicação imediata
- 🤖 **IA Agendar**: IA escolhe horário

### 📦📦 Captura em Lote (NOVO!)

#### Passo 1: Acessar Listagem
Navegue até uma página com lista de produtos:
- https://www.mercadolivre.com.br/ofertas
- https://www.amazon.com.br/gp/bestsellers
- Qualquer página de busca ou categoria

#### Passo 2: Carregar Produtos
- Role a página para baixo
- Aguarde produtos carregarem (lazy loading)
- Quanto mais rolar, mais produtos serão capturados

#### Passo 3: Capturar
1. Clique no ícone da extensão
2. Clique em **"📦📦 Capturar em Lote"**
3. Aguarde o progresso: `📤 Enviando... 25/50 (✅ 24 | ❌ 1)`
4. Veja resultado: `✅ Captura concluída! 48 produtos salvos`

#### Passo 4: Revisar no Painel
- Acesse o painel admin
- Vá para "Produtos Pendentes"
- Revise e aprove os produtos capturados

Veja guia completo em [CAPTURA_EM_LOTE.md](./CAPTURA_EM_LOTE.md)

## 📂 Categorias

### Detecção Automática (IA)
- Deixe o campo em branco
- IA analisa o título
- Categoria é atribuída automaticamente

### Seleção Manual
- Escolha da lista de categorias
- IA não poderá alterar
- Ideal para produtos específicos

## 🛠️ Troubleshooting

### Problemas Comuns

**"Configure a API primeiro!"**
- Preencha URL e Token
- Clique em "Salvar Configuração"

**"Não foi possível extrair dados"**
- Verifique se está em página de produto
- Tente outro produto do mesmo site
- Veja logs no console (F12)

**"Nenhum produto encontrado na página" (Captura em Lote)**
- Aguarde página carregar completamente
- Role a página para baixo (lazy loading)
- Verifique se está em página de listagem
- Tente site suportado (Mercado Livre, Amazon)

**Preço não capturado**
- Edite manualmente no formulário
- Aguarde página carregar completamente

**Imagem não capturada**
- Copie URL da imagem manualmente
- Cole no campo "URL da Imagem"

**Poucos produtos capturados em lote**
- Role a página até o final antes de capturar
- Aguarde produtos carregarem (lazy loading)
- Capture em múltiplas páginas se necessário

Veja mais em [TROUBLESHOOTING_CAPTURA.md](./TROUBLESHOOTING_CAPTURA.md)

## 📦 Estrutura

```
chrome-extension/
├── manifest.json                    # Configuração da extensão
├── popup.html                       # Interface (v2.0)
├── popup.css                        # Estilos modernos
├── popup.js                         # Lógica completa (v2.0)
├── content.js                       # Script de captura
├── background.js                    # Service worker
├── icons/                           # Ícones da extensão
├── README.md                        # Este arquivo
├── GUIA_COMPLETO_EXTENSAO.md       # Guia detalhado
├── CAPTURA_EM_LOTE.md              # Guia de captura em lote
├── PERSISTENCIA_E_COLAR_LINK.md    # Persistência e botão colar (NOVO)
├── INSTALACAO.md                    # Guia de instalação
├── COMO_OBTER_TOKEN.md             # Como obter token
└── TROUBLESHOOTING_CAPTURA.md      # Solução de problemas
```

## 🔒 Segurança

- Token JWT armazenado de forma segura
- Comunicação HTTPS obrigatória
- CORS configurado no backend
- Validação de dados no servidor
- Autenticação em todas as requisições

## 🌐 Plataformas Suportadas

- Amazon
- AliExpress
- Shopee
- Mercado Livre
- Magazine Luiza
- Americanas
- Casas Bahia
- Extra
- Ponto Frio
- E muitas outras...

## 📊 Logs de Debug

Para ver logs detalhados:
1. Abra a extensão
2. Pressione F12 (DevTools)
3. Vá para "Console"
4. Capture um produto
5. Veja logs detalhados

## 🎓 Dicas

1. **Revise os dados**: Sempre verifique antes de salvar
2. **Use o botão 📋**: Mais rápido que Ctrl+V para colar links
3. **Não tenha pressa**: Pode fechar a extensão - dados são salvos automaticamente
4. **Use links de afiliado**: Edite o link para incluir seu código
5. **Categorias manuais**: Para produtos específicos
6. **Salvar Pendente**: Para produtos que precisam revisão
7. **IA Agendar**: Para otimizar engajamento
8. **Salvar (App)**: Para ofertas exclusivas
9. **Publicar Imediato**: Para ofertas relâmpago
10. **Captura em Lote**: Para importar muitos produtos rapidamente
11. **Role a página**: Antes de capturar em lote, role para carregar mais produtos
12. **Revise no painel**: Produtos em lote precisam de revisão manual

## 📚 Documentação Completa

- [GUIA_COMPLETO_EXTENSAO.md](./GUIA_COMPLETO_EXTENSAO.md) - Guia detalhado com todos os recursos
- [CAPTURA_EM_LOTE.md](./CAPTURA_EM_LOTE.md) - Guia completo de captura em lote
- [PERSISTENCIA_E_COLAR_LINK.md](./PERSISTENCIA_E_COLAR_LINK.md) - Persistência e botão colar
- [INSTALACAO.md](./INSTALACAO.md) - Passo a passo de instalação
- [COMO_OBTER_TOKEN.md](./COMO_OBTER_TOKEN.md) - Como obter token de autenticação
- [TROUBLESHOOTING_CAPTURA.md](./TROUBLESHOOTING_CAPTURA.md) - Solução de problemas

## 🔄 Changelog

### v2.2 (Atual)
- ✅ **Persistência de Dados** - Dados não são perdidos ao fechar
- ✅ **Botão Colar Link** - Ícone 📋 para colar facilmente
- ✅ Validação automática de URL
- ✅ Restauração automática ao abrir

### v2.1
- ✅ **Captura em Lote** - Captura múltiplos produtos de uma página
- ✅ Progresso em tempo real
- ✅ Contador de sucessos/falhas
- ✅ Suporte para páginas de listagem

### v2.0
- ✅ 4 modos de salvamento
- ✅ Edição completa de dados
- ✅ Seleção manual de categoria
- ✅ Preview de imagem
- ✅ Interface redesenhada
- ✅ Suporte a 15+ plataformas

### v1.0
- ✅ Captura básica de produtos
- ✅ Salvamento como pendente

---

**Desenvolvido com ❤️ para facilitar a captura de produtos**
