# 👨‍💼 Painel Administrativo

Documentação completa do painel administrativo MTW Promo.

## 📋 Visão Geral

O painel administrativo é uma aplicação React que permite gerenciar produtos, cupons, usuários, analytics e configurações do sistema.

## 🏗️ Estrutura

```
admin-panel/
├── src/
│   ├── components/      # Componentes UI reutilizáveis
│   ├── pages/          # Páginas da aplicação
│   ├── services/       # Serviços (API client)
│   ├── stores/         # Estado global (Zustand)
│   └── styles/         # Estilos globais
```

## 📄 Páginas Principais

### Dashboard
- **Rota**: `/`
- **Função**: Visão geral com estatísticas e gráficos
- **Recursos**: Analytics, métricas, gráficos

### Produtos
- **Rota**: `/products`
- **Função**: Gerenciar produtos
- **Recursos**: CRUD completo, busca, filtros

### Cupons
- **Rota**: `/coupons`
- **Função**: Gerenciar cupons
- **Recursos**: CRUD completo, aprovação, expiração

### Categorias
- **Rota**: `/categories`
- **Função**: Gerenciar categorias
- **Recursos**: CRUD completo

### Analytics
- **Rota**: `/analytics`
- **Função**: Visualizar métricas
- **Recursos**: Gráficos, estatísticas, relatórios

### Bots
- **Rota**: `/bots`
- **Função**: Configurar bots WhatsApp e Telegram
- **Recursos**: Canais, templates, logs

### Telegram Channels
- **Rota**: `/telegram-channels`
- **Função**: Gerenciar coletor de cupons Telegram
- **Recursos**: Configuração, autenticação, canais, listener

### Settings
- **Rota**: `/settings`
- **Função**: Configurações gerais
- **Recursos**: APIs externas, configurações do sistema

## 🎨 UI Components

O painel usa **shadcn/ui** como base de componentes:

- **Button** - Botões
- **Card** - Cards
- **Dialog** - Modais
- **Input** - Campos de entrada
- **Table** - Tabelas
- **Toast** - Notificações
- **Tabs** - Abas

## 🔐 Autenticação

O painel usa JWT para autenticação. O token é armazenado no localStorage.

### Fluxo de Login

1. Usuário faz login
2. Recebe `accessToken`
3. Token é salvo no localStorage
4. Token é enviado em todas as requisições

## 📊 Analytics

O dashboard exibe:
- Total de produtos
- Total de cupons
- Total de usuários
- Cliques nos últimos 7 dias
- Conversões
- Top produtos
- Top cupons

## 🤖 Configuração de Bots

### WhatsApp
1. Configure no painel em `/bots`
2. Adicione canais (grupos)
3. Crie templates de mensagem
4. Teste o envio

### Telegram
1. Configure no painel em `/bots`
2. Adicione canais (grupos)
3. Crie templates de mensagem
4. Teste o envio

## 📡 Telegram Collector

### Configuração
1. Acesse `/telegram-channels`
2. Configure API ID, API Hash e Telefone
3. Autentique (envie código e verifique)
4. Adicione canais públicos
5. Inicie o listener

## ⚙️ Settings

Configure no painel em `/settings`:
- Mercado Livre (Client ID, Secret, Tokens)
- Shopee (Partner ID, Key)
- Amazon (Access Key, Secret Key)
- Expo (Access Token)
- Backend (URL, API Key)

## 🛠️ Tecnologias

- **React** 18
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI
- **Zustand** - Estado global
- **Axios** - HTTP client
- **Recharts** - Gráficos

## 🚀 Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 📚 Mais Informações

- [Backend API](./backend/README.md)
- [API Reference](../05-api-reference/README.md)
- [Troubleshooting](../06-troubleshooting/README.md)

---

**Próximo**: [Mobile App](./mobile-app/README.md)



