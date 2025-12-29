# 📚 PreçoCerto (MTW) - Resumo Completo do Projeto

## 🎯 Visão Geral

**PreçoCerto** (também conhecido como **MTW Promo**) é uma plataforma completa de agregação de ofertas, cupons de desconto e sistema de afiliados. O sistema permite que usuários encontrem as melhores promoções de múltiplas plataformas de e-commerce em um único lugar, com automação completa de captura, análise inteligente e notificações em tempo real.

### Objetivo Principal
Facilitar a descoberta de ofertas e cupons, automatizar a captura de promoções e gerar receita através de links de afiliados, tudo isso com uma experiência mobile-first e notificações em tempo real via bots (WhatsApp e Telegram).

---

## 🏗️ Arquitetura do Sistema

O sistema é composto por **3 módulos principais**:

### 1. **Backend API** (Node.js + Express + Supabase)
- API REST completa com autenticação JWT
- Integração com múltiplas plataformas de e-commerce
- Sistema de automações (cron jobs)
- Bots para notificações (WhatsApp e Telegram)
- Analytics e métricas em tempo real
- Sistema de IA para análise e otimização de produtos

### 2. **Painel Administrativo** (React + Vite + Tailwind CSS)
- Dashboard com analytics completo
- Gerenciamento de produtos e cupons
- Configuração de integrações
- Controle de usuários e permissões
- Gerenciamento de bots e templates
- Sistema de captura automática de cupons

### 3. **App Mobile** (React Native + Expo)
- Navegação de produtos e cupons
- Sistema de favoritos
- Notificações push
- Histórico de preços
- Acesso VIP
- Autenticação social

---

## 🛠️ Stack Tecnológico

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Banco de Dados**: Supabase (PostgreSQL)
- **Cache**: Redis
- **Autenticação**: JWT (JSON Web Tokens)
- **Validação**: Joi
- **Logging**: Winston
- **Cron Jobs**: node-cron
- **HTTP Client**: Axios
- **Scraping**: Cheerio
- **Processamento de Imagens**: Sharp

### Frontend (Admin Panel)
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **State Management**: Zustand
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React

### Mobile App
- **Framework**: React Native 0.73
- **Platform**: Expo SDK 54
- **Navigation**: React Navigation
- **State Management**: Zustand
- **Storage**: AsyncStorage
- **Notifications**: Expo Notifications
- **Auth**: Expo Auth Session

### Banco de Dados
- **PostgreSQL** (via Supabase)
- **Redis** (cache e sessões)
- **Migrations**: Sistema próprio de migrações SQL

---

## ✨ Funcionalidades Principais

### 👥 Para Usuários Finais (App Mobile)

#### Produtos
- ✅ Visualizar produtos em promoção de múltiplas plataformas
- ✅ Buscar produtos por nome, categoria ou palavra-chave
- ✅ Filtrar por categoria, plataforma, preço
- ✅ Ver detalhes completos do produto
- ✅ Histórico de preços (gráfico de evolução)
- ✅ Produtos relacionados
- ✅ Favoritar produtos
- ✅ Compartilhar produtos

#### Cupons
- ✅ Visualizar cupons ativos
- ✅ Buscar cupons por código ou descrição
- ✅ Copiar código automaticamente
- ✅ Ver detalhes do cupom (validade, condições, etc.)
- ✅ Cupons expirando em breve
- ✅ Cupons exclusivos VIP
- ✅ Aplicar cupom ao produto

#### Perfil e Conta
- ✅ Autenticação social (Google, Apple, Facebook)
- ✅ Visualizar e editar perfil
- ✅ Histórico de uso de cupons
- ✅ Acesso VIP com recursos premium
- ✅ Preferências de notificação
- ✅ Tema claro/escuro

#### Notificações
- ✅ Notificações push para novos cupons
- ✅ Notificações de preços (quando produto favorito baixa de preço)
- ✅ Notificações de cupons expirando
- ✅ Notificações personalizáveis por categoria

---

### 👨‍💼 Para Administradores (Painel Admin)

#### Dashboard
- ✅ Estatísticas gerais (produtos, cupons, usuários)
- ✅ Gráficos de cliques e conversões
- ✅ Taxa de conversão por plataforma
- ✅ Top produtos mais clicados
- ✅ Top cupons mais usados
- ✅ Métricas de usuários (ativos, VIP, novos)
- ✅ Receita estimada de afiliados
- ✅ Gráficos de tendências

#### Gerenciamento de Produtos
- ✅ CRUD completo de produtos
- ✅ Busca avançada e filtros (status, plataforma, categoria)
- ✅ Auto-preenchimento de links (Shopee, Mercado Livre, Amazon, AliExpress)
- ✅ Upload e preview de imagens
- ✅ Gerenciamento de links de afiliados
- ✅ Histórico de preços
- ✅ Exclusão em lote
- ✅ Aprovação/rejeição de produtos pendentes
- ✅ Encurtamento de links (integração com encurtador.dev)
- ✅ Status: Pendente, Aprovado, Publicado, Rejeitado

#### Gerenciamento de Cupons
- ✅ CRUD completo de cupons
- ✅ Aprovação/rejeição individual
- ✅ Aprovação em lote
- ✅ Verificação automática de validade
- ✅ Exportação de cupons
- ✅ Filtros por plataforma, status, validade
- ✅ Cupons pendentes de aprovação
- ✅ Cupons exclusivos VIP
- ✅ Cupons gerais ou específicos por produto
- ✅ Desconto percentual ou valor fixo
- ✅ Limite máximo de desconto

#### Categorias
- ✅ CRUD completo de categorias
- ✅ Organização hierárquica
- ✅ Ícones personalizados
- ✅ Contagem automática de produtos
- ✅ Cores personalizadas

#### Usuários
- ✅ Listar todos os usuários
- ✅ Gerenciar permissões e roles
- ✅ Ativar/desativar VIP
- ✅ Estatísticas por usuário
- ✅ Histórico de ações

#### Bots (WhatsApp e Telegram)
- ✅ Configurar credenciais do WhatsApp
- ✅ Configurar credenciais do Telegram
- ✅ Gerenciar canais de envio
- ✅ Criar e editar templates de mensagens
- ✅ Templates com variáveis dinâmicas
- ✅ Modos de template: Padrão, Customizado, IA ADVANCED
- ✅ Testar envio de mensagens
- ✅ Ver logs de envio
- ✅ Estatísticas de envio por canal
- ✅ Suporte a imagens e fotos
- ✅ Parse mode HTML para Telegram
- ✅ Truncamento automático de captions (limite 1024 caracteres)

#### Auto Sync (Sincronização Automática)
- ✅ Sincronização automática de produtos
- ✅ Suporte a múltiplas plataformas:
  - Mercado Livre
  - Shopee
  - Amazon
  - AliExpress
- ✅ Configuração de keywords por plataforma
- ✅ Filtro de desconto mínimo
- ✅ Execução manual ou agendada
- ✅ Logs de sincronização
- ✅ Produtos salvos como pendentes (requer aprovação manual)
- ✅ Status de execução em tempo real

#### Captura de Cupons
- ✅ Captura automática de cupons do Telegram
- ✅ Captura de cupons do Mercado Livre
- ✅ Captura de cupons da Shopee
- ✅ Captura de cupons da Amazon
- ✅ Captura de cupons do AliExpress
- ✅ Captura de cupons do Gatry
- ✅ Análise inteligente de cupons com IA
- ✅ Filtro de qualidade de cupons
- ✅ Aprovação em lote
- ✅ Configuração de canais do Telegram para captura
- ✅ Exemplo de mensagens para IA

#### Configurações (Settings)
- ✅ Configuração de APIs:
  - Mercado Livre (Client ID, Secret, Tokens, Códigos de Afiliado)
  - Shopee (Partner ID, Partner Key)
  - Amazon (Access Key, Secret Key, Partner Tag)
  - AliExpress (App Key, App Secret, Tracking ID, Origem de Produtos)
- ✅ Configuração de Expo (Push Notifications)
- ✅ Configuração de Telegram Collector
- ✅ Configuração de Backend (URL, API Key)
- ✅ Configuração de IA (OpenRouter API Key, Modelos)
- ✅ Configuração de Encurtador (encurtador.dev)
- ✅ Modos de template (Padrão, Customizado, IA ADVANCED)

#### Analytics
- ✅ Estatísticas de cliques por produto
- ✅ Taxa de conversão
- ✅ Produtos mais populares
- ✅ Cupons mais usados
- ✅ Métricas de usuários
- ✅ Gráficos de tendências

#### Canais do Telegram
- ✅ Gerenciar canais do Telegram para captura
- ✅ Configurar credenciais de autenticação
- ✅ Adicionar canais públicos ou privados (por ID)
- ✅ Configurar exemplo de mensagens para IA
- ✅ Configurar parse mode (HTML, Markdown)
- ✅ Ativar/desativar captura por canal

---

## 🔄 Automações e Cron Jobs

### Auto Sync (Sincronização Automática de Produtos)
- **Frequência**: Configurável (padrão: a cada hora)
- **Plataformas Suportadas**:
  - **Mercado Livre**: Busca por keywords, filtro de desconto mínimo
  - **Shopee**: Usa `productOfferV2` (TOP_PERFORMING), busca por keywords
  - **Amazon**: Busca por keywords, filtro de desconto mínimo
  - **AliExpress**: Busca por keywords, filtro de origem (Brasil, Internacional, Ambos)
- **Comportamento**: Produtos são salvos com status `'pending'` e aparecem em `/pending-products` para aprovação manual

### Captura Automática de Cupons
- **Frequência**: Configurável (padrão: a cada 10 minutos)
- **Fontes**:
  - Telegram (canais configurados)
  - Mercado Livre (API oficial)
  - Shopee (API oficial)
  - Amazon (API oficial)
  - AliExpress (API oficial)
  - Gatry (scraping)
- **Análise**: IA analisa e valida cupons capturados
- **Aprovação**: Cupons ficam pendentes até aprovação manual

### Verificação de Cupons Expirados
- **Frequência**: Diária
- **Ação**: Marca cupons expirados como inativos automaticamente

### Envio de Notificações Pendentes
- **Frequência**: A cada minuto
- **Ação**: Envia notificações que falharam anteriormente

### Monitoramento de Cupons Expirando
- **Frequência**: Diária
- **Ação**: Notifica sobre cupons que expiram em breve

---

## 🤖 Sistema de Bots

### WhatsApp Bot
- ✅ Integração com API do WhatsApp
- ✅ Envio de mensagens formatadas
- ✅ Suporte a imagens
- ✅ Templates personalizáveis
- ✅ Múltiplos canais

### Telegram Bot
- ✅ Integração com Telegram Bot API
- ✅ Envio de mensagens formatadas (HTML)
- ✅ Suporte a fotos com caption
- ✅ Truncamento automático de captions (1024 caracteres)
- ✅ Templates personalizáveis
- ✅ Múltiplos canais
- ✅ Parse mode configurável (HTML, Markdown, MarkdownV2)

### Templates de Mensagens
- ✅ Sistema de templates com variáveis dinâmicas
- ✅ 3 modos de template:
  - **Padrão**: Template fixo do sistema
  - **Customizado**: Template editável pelo admin
  - **IA ADVANCED**: Template gerado por IA baseado no produto
- ✅ Templates específicos:
  - Nova Promoção (sem cupom)
  - Promoção com Cupom
- ✅ Variáveis disponíveis:
  - `{name}`: Nome do produto
  - `{price}`: Preço atual
  - `{old_price}`: Preço original
  - `{discount}`: Percentual de desconto
  - `{coupon_code}`: Código do cupom
  - `{coupon_discount}`: Desconto do cupom
  - `{affiliate_link}`: Link de afiliado
  - `{image_url}`: URL da imagem
  - E mais...

### Coletor de Cupons do Telegram
- ✅ Captura automática de cupons de canais do Telegram
- ✅ Autenticação via Telegram (código de verificação)
- ✅ Suporte a canais públicos e privados
- ✅ Análise inteligente de mensagens com IA
- ✅ Extração automática de códigos de cupom
- ✅ Validação de cupons
- ✅ Configuração de exemplo de mensagens para melhor análise

---

## 🧠 Sistema de IA (Inteligência Artificial)

### Análise de Produtos
- ✅ **Product Analyzer**: Analisa qualidade e relevância de produtos
- ✅ **Price Analyzer**: Analisa preços e descontos
- ✅ **Description Optimizer**: Otimiza descrições de produtos
- ✅ **Keyword Optimizer**: Otimiza palavras-chave para busca

### Análise de Cupons
- ✅ **Coupon Analyzer**: Analisa e valida cupons capturados
- ✅ **Coupon Quality Analyzer**: Avalia qualidade do cupom
- ✅ **Coupon Quality Enhancer**: Melhora informações de cupons
- ✅ **Coupon Intelligent Filter**: Filtra cupons por qualidade
- ✅ **Coupon Batch Analyzer**: Analisa cupons em lote
- ✅ **Confidence Validator**: Valida confiança na análise

### Geração de Templates
- ✅ **Template Generator**: Gera templates básicos
- ✅ **Advanced Template Generator**: Gera templates avançados com IA
- ✅ **Normalizer**: Normaliza dados para melhor análise

### Integração
- ✅ **OpenRouter Client**: Cliente para OpenRouter API
- ✅ Suporte a múltiplos modelos de IA
- ✅ Configuração via painel admin

---

## 🔗 Integrações com Plataformas

### Mercado Livre
- ✅ API oficial de afiliados
- ✅ Autenticação OAuth2
- ✅ Busca de produtos por keywords
- ✅ Captura de cupons
- ✅ Geração de links de afiliado
- ✅ Auto-sync de produtos
- ✅ Auto-preenchimento de links

### Shopee
- ✅ API oficial de afiliados (GraphQL)
- ✅ Autenticação SHA256
- ✅ Queries suportadas:
  - `productOfferV2`: Busca de produtos individuais
  - `shopeeOfferV2`: Busca de ofertas gerais
  - `shopOfferV2`: Busca de ofertas de lojas
  - `generateShortLink`: Encurtamento de links
- ✅ Auto-sync de produtos (TOP_PERFORMING)
- ✅ Auto-preenchimento de links
- ✅ Captura de cupons

### Amazon
- ✅ API de afiliados (Product Advertising API)
- ✅ Autenticação via Access Key e Secret Key
- ✅ Busca de produtos
- ✅ Geração de links de afiliado
- ✅ Auto-sync de produtos
- ✅ Auto-preenchimento de links
- ✅ Captura de cupons

### AliExpress
- ✅ API oficial (Open Platform API)
- ✅ Autenticação HMAC-SHA256
- ✅ Métodos suportados:
  - `aliexpress.affiliate.product.query`: Busca de produtos
  - `aliexpress.affiliate.hotproduct.query`: Produtos em alta
- ✅ Filtro de origem (Brasil, Internacional, Ambos)
- ✅ Auto-sync de produtos
- ✅ Auto-preenchimento de links
- ✅ Captura de cupons
- ✅ Extração robusta de preços

### Gatry
- ✅ Scraping de cupons
- ✅ Captura automática

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### `users`
- Gerenciamento de usuários
- Autenticação social
- Roles (user, admin, vip)
- Preferências de notificação

#### `products`
- Produtos de todas as plataformas
- Links de afiliados
- Preços e descontos
- Status (pending, approved, published, rejected)
- Categorias
- Cupons vinculados
- Links originais e encurtados

#### `coupons`
- Cupons de desconto
- Códigos e descrições
- Validade e condições
- Tipos de desconto (percentual, fixo)
- Plataformas suportadas
- Status (active, expired, pending_approval)
- Cupons exclusivos VIP
- Cupons gerais ou específicos

#### `categories`
- Categorias de produtos
- Hierarquia
- Ícones e cores
- Contagem de produtos

#### `bot_channels`
- Canais de bots (WhatsApp, Telegram)
- Configurações por canal
- Estatísticas de envio

#### `bot_message_templates`
- Templates de mensagens
- Modos (default, custom, ai_advanced)
- Variáveis dinâmicas
- Proteção de templates do sistema

#### `telegram_channels`
- Canais do Telegram para captura
- Configurações de captura
- Exemplo de mensagens para IA
- Parse mode

#### `app_settings`
- Configurações globais do sistema
- Credenciais de APIs
- Configurações de IA
- Configurações de encurtador
- Modos de template

#### `sync_configs`
- Configurações de auto-sync
- Keywords por plataforma
- Filtros de desconto
- Status de execução

#### `sync_logs`
- Logs de sincronização
- Histórico de execuções
- Estatísticas

#### `notification_logs`
- Logs de notificações enviadas
- Status de envio
- Erros e falhas

#### `click_tracking`
- Rastreamento de cliques
- Analytics de conversão
- Estatísticas por produto

---

## 📊 Funcionalidades de Analytics

### Dashboard Administrativo
- ✅ Estatísticas gerais (produtos, cupons, usuários)
- ✅ Gráficos de cliques e conversões
- ✅ Taxa de conversão por plataforma
- ✅ Top produtos mais clicados
- ✅ Top cupons mais usados
- ✅ Métricas de usuários
- ✅ Receita estimada de afiliados
- ✅ Gráficos de tendências temporais

### Rastreamento de Cliques
- ✅ Registro de cada clique em links de afiliados
- ✅ Analytics por produto
- ✅ Analytics por plataforma
- ✅ Analytics por usuário
- ✅ Taxa de conversão

---

## 🔐 Segurança

### Autenticação
- ✅ JWT (JSON Web Tokens)
- ✅ Refresh tokens
- ✅ Autenticação social (Google, Apple, Facebook)
- ✅ Middleware de autenticação
- ✅ Rate limiting

### Validação
- ✅ Validação de dados com Joi
- ✅ Sanitização de inputs
- ✅ Proteção contra SQL injection (Supabase)
- ✅ CORS configurado

### Permissões
- ✅ Sistema de roles (user, admin, vip)
- ✅ Controle de acesso por endpoint
- ✅ Proteção de rotas administrativas

---

## 🚀 Features Desenvolvidas Recentemente

### Integração Shopee
- ✅ API GraphQL oficial implementada
- ✅ Queries `productOfferV2`, `shopeeOfferV2`, `shopOfferV2`
- ✅ Encurtamento de links (`generateShortLink`)
- ✅ Auto-sync usando `productOfferV2` (TOP_PERFORMING)
- ✅ Auto-preenchimento de links

### Integração AliExpress
- ✅ API oficial implementada
- ✅ Autenticação HMAC-SHA256
- ✅ Filtro de origem de produtos (Brasil, Internacional, Ambos)
- ✅ Extração robusta de preços
- ✅ Auto-sync e auto-preenchimento

### Sistema de Encurtamento de Links
- ✅ Integração com encurtador.dev
- ✅ Configuração via `.env`
- ✅ Botão "Encurtar Link e Publicar" em `/pending-products`
- ✅ Remoção automática de fragmentos de URL (#)
- ✅ Normalização de URLs

### Melhorias no Auto-Sync
- ✅ Produtos salvos como pendentes (não publicados automaticamente)
- ✅ Aprovação manual em `/pending-products`
- ✅ Filtro de status (pending, approved, published, rejected)

### Sistema de Templates com IA
- ✅ Modo IA ADVANCED
- ✅ Geração inteligente de mensagens
- ✅ Templates personalizáveis
- ✅ Proteção de templates do sistema

### Captura de Cupons do Telegram
- ✅ Autenticação via código
- ✅ Suporte a canais públicos e privados
- ✅ Análise inteligente com IA
- ✅ Exemplo de mensagens para melhor análise

### Filtros e Buscas Avançadas
- ✅ Filtro de cupons por plataforma no modal de produtos
- ✅ Filtro de status de produtos
- ✅ Busca avançada com múltiplos filtros
- ✅ Paginação em todas as listagens

### Melhorias na Interface
- ✅ UI moderna com Tailwind CSS e shadcn/ui
- ✅ Tema claro/escuro
- ✅ Responsividade completa
- ✅ Feedback visual com toasts
- ✅ Loading states

---

## 📱 App Mobile

### Funcionalidades
- ✅ Navegação de produtos e cupons
- ✅ Busca e filtros
- ✅ Sistema de favoritos
- ✅ Notificações push
- ✅ Histórico de preços
- ✅ Detalhes de produtos
- ✅ Aplicação de cupons
- ✅ Compartilhamento
- ✅ Autenticação social
- ✅ Perfil do usuário
- ✅ Acesso VIP

### Tecnologias
- React Native 0.73
- Expo SDK 54
- React Navigation
- Zustand (state management)
- AsyncStorage
- Expo Notifications

---

## 🔧 Scripts e Ferramentas

### Scripts de Teste
- `test:aliexpress`: Testa API do AliExpress
- `test:shopee-product-offer`: Testa busca de produtos Shopee
- `test:shopee-keyword`: Testa busca por keyword Shopee
- `test:shopee-offers`: Testa ofertas Shopee
- `test:url-shortener`: Testa encurtamento de URLs
- `test:approve-shorten`: Testa aprovação com encurtamento
- `test:approve-endpoint`: Testa endpoint de aprovação
- `test:approve-http`: Testa aprovação via HTTP

### Scripts de Migração
- `db:migrate`: Executa migrações do banco de dados

### Scripts de Utilidade
- `setup`: Configuração inicial
- `check`: Health check do sistema
- `logs`: Visualiza logs em tempo real
- `logs:error`: Visualiza apenas erros

---

## 📈 Estatísticas do Projeto

### Backend
- **Arquivos**: ~121 arquivos JavaScript
- **Controllers**: 15 controllers
- **Services**: Múltiplos serviços organizados por funcionalidade
- **Models**: 17 models
- **Routes**: 15 rotas
- **Cron Jobs**: 2 principais (auto-sync e captura de cupons)

### Admin Panel
- **Páginas**: 13 páginas principais
- **Componentes**: Componentes reutilizáveis com shadcn/ui
- **Tecnologias**: React 18, Vite, Tailwind CSS

### Mobile App
- **Screens**: Múltiplas telas
- **Navegação**: Stack e Bottom Tabs
- **Tecnologias**: React Native, Expo

### Banco de Dados
- **Migrations**: 37+ migrações
- **Tabelas**: 20+ tabelas principais
- **Views**: Várias views para consultas otimizadas

---

## 🎯 Casos de Uso Principais

### 1. Captura Automática de Produtos
- Sistema busca produtos automaticamente nas plataformas configuradas
- Produtos são salvos como pendentes
- Admin aprova produtos em `/pending-products`
- Produtos aprovados são publicados automaticamente

### 2. Captura Automática de Cupons
- Sistema monitora canais do Telegram configurados
- IA analisa mensagens e extrai cupons
- Cupons são validados e ficam pendentes
- Admin aprova cupons em `/coupons`

### 3. Notificações Automáticas
- Quando produto é aprovado, notificação é enviada automaticamente
- Bots (WhatsApp/Telegram) enviam mensagens formatadas
- Templates podem ser gerados por IA
- Suporte a imagens e formatação HTML

### 4. Auto-Preenchimento de Links
- Admin cola link de produto no formulário
- Sistema extrai informações automaticamente
- Preenche nome, preço, imagem, etc.
- Gera link de afiliado automaticamente

### 5. Encurtamento de Links
- Admin pode encurtar link antes de publicar
- Integração com encurtador.dev
- Link encurtado é usado na publicação
- Melhora experiência do usuário

---

## 🔄 Fluxo de Trabalho

### Criação de Produto Manual
1. Admin acessa `/products`
2. Clica em "Novo Produto"
3. Cola link do produto (auto-preenchimento)
4. Ajusta informações se necessário
5. Seleciona cupom (se houver)
6. Salva produto
7. Produto é publicado automaticamente nos bots e app
8. Status é atualizado para `'published'`

### Auto-Sync de Produtos
1. Cron job executa auto-sync
2. Sistema busca produtos nas plataformas configuradas
3. Produtos são salvos com status `'pending'`
4. Produtos aparecem em `/pending-products`
5. Admin revisa e aprova produtos
6. Produtos aprovados são publicados automaticamente
7. Status é atualizado para `'published'`

### Captura de Cupons
1. Sistema monitora canais do Telegram
2. Mensagens são analisadas por IA
3. Cupons são extraídos e validados
4. Cupons ficam pendentes de aprovação
5. Admin aprova cupons em `/coupons`
6. Cupons ficam disponíveis para uso

---

## 📝 Notas Importantes

### Status de Produtos
- **pending**: Produto aguardando aprovação
- **approved**: Produto aprovado mas não publicado
- **published**: Produto publicado e disponível
- **rejected**: Produto rejeitado

### Status de Cupons
- **active**: Cupom ativo e válido
- **expired**: Cupom expirado
- **pending_approval**: Cupom aguardando aprovação

### Modos de Template
- **default**: Template padrão do sistema (não editável)
- **custom**: Template customizado pelo admin
- **ai_advanced**: Template gerado por IA

---

## 🚧 Melhorias Futuras Sugeridas

- [ ] Sistema de notificações push mais robusto
- [ ] Analytics mais detalhados
- [ ] Sistema de relatórios em PDF
- [ ] Integração com mais plataformas
- [ ] Sistema de A/B testing para templates
- [ ] Dashboard de métricas em tempo real
- [ ] Sistema de backup automático
- [ ] API pública para desenvolvedores
- [ ] Sistema de webhooks
- [ ] Integração com mais serviços de encurtamento

---

## 📞 Suporte e Documentação

- **Documentação Completa**: `docs/` directory
- **API Reference**: `docs/05-api-reference/`
- **Troubleshooting**: `docs/06-troubleshooting/`
- **Architecture**: `docs/07-architecture/`

---

## 📄 Licença

MIT License

---

**Última atualização**: Dezembro 2024
**Versão**: 1.0.0




