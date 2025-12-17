# 🛠️ Stack Tecnológico

Tecnologias utilizadas no MTW Promo.

## 🚀 Backend

### Core
- **Node.js** 18+ - Runtime
- **Express.js** - Framework web
- **ES Modules** - Sistema de módulos

### Banco de Dados
- **PostgreSQL** - Banco de dados principal
- **Supabase** - Plataforma (PostgreSQL + Auth + Storage)

### Cache
- **Redis** - Cache (opcional)

### Autenticação
- **JWT** - JSON Web Tokens
- **Bcrypt** - Hash de senhas

### Agendamento
- **Node-cron** - Jobs agendados

### Logs
- **Winston** - Sistema de logs

### Outras
- **Axios** - HTTP client
- **Joi** - Validação
- **Helmet** - Segurança
- **CORS** - Cross-Origin Resource Sharing
- **Morgan** - HTTP request logger
- **Sharp** - Processamento de imagens
- **Cheerio** - Web scraping
- **Telegram** (gramjs) - MTProto para Telegram

## 👨‍💼 Frontend (Admin)

### Core
- **React** 18 - Framework
- **Vite** - Build tool
- **JavaScript (ES6+)** - Linguagem

### Estilização
- **Tailwind CSS** - Framework CSS
- **shadcn/ui** - Componentes UI
- **Lucide React** - Ícones

### Estado
- **Zustand** - Gerenciamento de estado

### Formulários
- **React Hook Form** - Formulários

### Gráficos
- **Recharts** - Gráficos

### Roteamento
- **React Router DOM** - Roteamento

### HTTP
- **Axios** - HTTP client

## 📱 Mobile

### Core
- **React Native** - Framework
- **Expo** SDK 54 - Plataforma
- **JavaScript (ES6+)** - Linguagem

### Navegação
- **React Navigation** - Navegação
- **@react-navigation/stack** - Stack navigator
- **@react-navigation/bottom-tabs** - Tab navigator

### Estilização
- **NativeWind** - Tailwind para React Native

### Estado
- **Zustand** - Gerenciamento de estado

### Storage
- **@react-native-async-storage/async-storage** - Armazenamento local

### Notificações
- **expo-notifications** - Notificações push

### Outras
- **expo-clipboard** - Clipboard
- **expo-auth-session** - Autenticação social
- **@supabase/supabase-js** - Cliente Supabase

## 🔌 Integrações

### APIs Externas
- **Mercado Livre API** - Produtos e cupons
- **Shopee API** - Produtos e cupons
- **Amazon PA-API 5** - Produtos (em desenvolvimento)
- **AliExpress API** - Produtos (em desenvolvimento)

### Bots
- **WhatsApp Cloud API** - Notificações WhatsApp
- **Telegram Bot API** - Notificações Telegram
- **Telegram MTProto** (gramjs) - Coletor de cupons

### Notificações
- **Expo Push Notifications** - Push notifications

## 🗄️ Banco de Dados

### Tabelas Principais
- `users` - Usuários
- `products` - Produtos
- `coupons` - Cupons
- `categories` - Categorias
- `notifications` - Notificações
- `bot_channels` - Canais de bots
- `bot_message_templates` - Templates
- `telegram_channels` - Canais Telegram
- `telegram_collector_config` - Config coletor
- `app_settings` - Configurações gerais

## 🔐 Segurança

- **JWT** - Autenticação
- **Bcrypt** - Hash de senhas
- **Helmet** - Headers de segurança
- **CORS** - Cross-Origin
- **Rate Limiting** - Limite de requisições
- **Row Level Security (RLS)** - Segurança no banco

## 📦 Gerenciamento de Pacotes

- **npm** - Gerenciador de pacotes

## 🚀 Deploy

### Backend
- Railway, Render, Heroku, AWS, etc.

### Frontend
- Vercel, Netlify, etc.

### Mobile
- Expo EAS Build
- Google Play Store
- Apple App Store

---

**Próximo**: [Arquitetura](./architecture.md)





