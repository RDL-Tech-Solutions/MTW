# 🏗️ ARQUITETURA DO ECOSSISTEMA MTW PROMO

## 📋 Visão Geral

O MTW Promo é composto por 3 módulos principais que se comunicam através de uma API REST centralizada:

```
┌─────────────────────────────────────────────────────────────┐
│                     ECOSSISTEMA MTW PROMO                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  APP MOBILE  │    │ PAINEL ADMIN │    │   BACKEND    │  │
│  │              │    │              │    │              │  │
│  │ React Native │◄───┤  React/Vite  │◄───┤ Node.js/     │  │
│  │ + Expo       │    │ + Tailwind   │    │ Express      │  │
│  │ + NativeWind │    │ + shadcn/ui  │    │ + Supabase   │  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
│         │                    │                    │          │
│         └────────────────────┴────────────────────┘          │
│                              │                               │
│                    ┌─────────▼─────────┐                    │
│                    │   API REST        │                    │
│                    │   (Express)       │                    │
│                    └─────────┬─────────┘                    │
│                              │                               │
│         ┌────────────────────┼────────────────────┐         │
│         │                    │                    │         │
│    ┌────▼────┐        ┌──────▼──────┐     ┌──────▼──────┐ │
│    │ Supabase│        │   Shopee    │     │  Mercado    │ │
│    │   DB    │        │     API     │     │  Livre API  │ │
│    └─────────┘        └─────────────┘     └─────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🗂️ Estrutura de Diretórios

```
MTW/
├── backend/                    # API Node.js + Express
│   ├── src/
│   │   ├── config/            # Configurações (DB, APIs, env)
│   │   ├── controllers/       # Controladores das rotas
│   │   ├── models/            # Modelos de dados
│   │   ├── routes/            # Definição de rotas
│   │   ├── services/          # Lógica de negócio
│   │   │   ├── shopee/       # Integração Shopee
│   │   │   ├── mercadolivre/ # Integração ML
│   │   │   ├── notifications/# Sistema de notificações
│   │   │   └── cron/         # Jobs agendados
│   │   ├── middleware/        # Middlewares (auth, validation)
│   │   ├── utils/             # Utilitários
│   │   └── server.js          # Entry point
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── admin-panel/               # Painel Admin React
│   ├── src/
│   │   ├── components/       # Componentes React
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   ├── dashboard/   # Dashboard components
│   │   │   ├── products/    # Gestão de produtos
│   │   │   ├── coupons/     # Gestão de cupons
│   │   │   └── layout/      # Layout components
│   │   ├── pages/           # Páginas
│   │   ├── services/        # API calls
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utilitários
│   │   ├── styles/          # Estilos globais
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── README.md
│
├── mobile-app/               # App React Native
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── screens/         # Telas do app
│   │   │   ├── Home/
│   │   │   ├── Product/
│   │   │   ├── Categories/
│   │   │   ├── Favorites/
│   │   │   ├── VIP/
│   │   │   └── Profile/
│   │   ├── navigation/      # Navegação
│   │   ├── services/        # API calls
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utilitários
│   │   ├── constants/       # Constantes (cores, etc)
│   │   └── App.js
│   ├── assets/              # Imagens, fontes
│   ├── app.json
│   ├── package.json
│   └── README.md
│
├── database/                 # Scripts SQL e migrations
│   ├── migrations/
│   ├── seeds/
│   └── schema.sql
│
├── docs/                     # Documentação
│   ├── api/                 # Documentação da API
│   ├── wireframes/          # Wireframes das telas
│   └── guides/              # Guias de uso
│
├── .gitignore
├── README.md
└── ARQUITETURA.md           # Este arquivo
```

## 🔧 Stack Tecnológico

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Cache**: Redis
- **Auth**: JWT (jsonwebtoken)
- **Cron**: node-cron
- **HTTP Client**: axios
- **Validation**: joi
- **Environment**: dotenv

### Admin Panel
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Routing**: React Router v6
- **State Management**: Zustand
- **HTTP Client**: axios
- **Forms**: React Hook Form
- **Charts**: Recharts

### Mobile App
- **Framework**: React Native
- **Platform**: Expo
- **Styling**: NativeWind (Tailwind for RN)
- **Navigation**: React Navigation v6
- **State Management**: Zustand
- **HTTP Client**: axios
- **Storage**: AsyncStorage
- **Notifications**: expo-notifications
- **Clipboard**: expo-clipboard

## 🗄️ Modelo de Dados

### Users
```sql
id: UUID (PK)
name: VARCHAR(255)
email: VARCHAR(255) UNIQUE
password: VARCHAR(255)
push_token: VARCHAR(255)
is_vip: BOOLEAN
favorite_categories: JSONB
favorites: JSONB
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### Products
```sql
id: UUID (PK)
name: VARCHAR(500)
image_url: TEXT
platform: ENUM('shopee', 'mercadolivre')
current_price: DECIMAL(10,2)
old_price: DECIMAL(10,2)
discount_percentage: INTEGER
category_id: UUID (FK)
coupon_id: UUID (FK)
affiliate_link: TEXT
external_id: VARCHAR(255)
is_active: BOOLEAN
stock_available: BOOLEAN
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### Coupons
```sql
id: UUID (PK)
code: VARCHAR(100)
platform: ENUM('shopee', 'mercadolivre', 'general')
discount_type: ENUM('percentage', 'fixed')
discount_value: DECIMAL(10,2)
min_purchase: DECIMAL(10,2)
valid_from: TIMESTAMP
valid_until: TIMESTAMP
is_general: BOOLEAN
applicable_products: JSONB
restrictions: TEXT
max_uses: INTEGER
current_uses: INTEGER
is_vip: BOOLEAN
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### Categories
```sql
id: UUID (PK)
name: VARCHAR(100)
slug: VARCHAR(100) UNIQUE
icon: VARCHAR(50)
is_active: BOOLEAN
created_at: TIMESTAMP
```

### Notifications
```sql
id: UUID (PK)
user_id: UUID (FK)
title: VARCHAR(255)
message: TEXT
type: ENUM('new_coupon', 'price_drop', 'expiring_coupon', 'new_promo')
related_product_id: UUID (FK)
related_coupon_id: UUID (FK)
is_sent: BOOLEAN
sent_at: TIMESTAMP
created_at: TIMESTAMP
```

### Price_History
```sql
id: UUID (PK)
product_id: UUID (FK)
price: DECIMAL(10,2)
recorded_at: TIMESTAMP
```

### Click_Tracking
```sql
id: UUID (PK)
user_id: UUID (FK)
product_id: UUID (FK)
coupon_id: UUID (FK)
clicked_at: TIMESTAMP
converted: BOOLEAN
```

## 🔌 Endpoints da API

### Authentication
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Dados do usuário

### Products
- `GET /api/products` - Listar produtos (com filtros)
- `GET /api/products/:id` - Detalhes do produto
- `POST /api/products` - Criar produto (admin)
- `PUT /api/products/:id` - Atualizar produto (admin)
- `DELETE /api/products/:id` - Deletar produto (admin)
- `GET /api/products/:id/history` - Histórico de preços

### Coupons
- `GET /api/coupons` - Listar cupons
- `GET /api/coupons/:id` - Detalhes do cupom
- `POST /api/coupons` - Criar cupom (admin)
- `PUT /api/coupons/:id` - Atualizar cupom (admin)
- `DELETE /api/coupons/:id` - Deletar cupom (admin)
- `POST /api/coupons/:id/use` - Registrar uso

### Categories
- `GET /api/categories` - Listar categorias
- `POST /api/categories` - Criar categoria (admin)
- `PUT /api/categories/:id` - Atualizar categoria (admin)
- `DELETE /api/categories/:id` - Deletar categoria (admin)

### Notifications
- `GET /api/notifications` - Listar notificações do usuário
- `PUT /api/notifications/:id/read` - Marcar como lida
- `POST /api/notifications/register-token` - Registrar push token

### Favorites
- `GET /api/favorites` - Listar favoritos
- `POST /api/favorites/:productId` - Adicionar favorito
- `DELETE /api/favorites/:productId` - Remover favorito

### Analytics (Admin)
- `GET /api/analytics/dashboard` - Dados do dashboard
- `GET /api/analytics/clicks` - Estatísticas de cliques
- `GET /api/analytics/conversions` - Conversões
- `GET /api/analytics/top-products` - Produtos mais acessados
- `GET /api/analytics/top-coupons` - Cupons mais usados

### Integrations
- `POST /api/integrations/shopee/sync` - Sincronizar Shopee
- `POST /api/integrations/mercadolivre/sync` - Sincronizar ML
- `GET /api/integrations/shopee/offers` - Buscar ofertas Shopee
- `GET /api/integrations/mercadolivre/offers` - Buscar ofertas ML

## 🔄 Fluxo de Dados

### 1. Sincronização de Produtos
```
Cron Job (15 min) → Shopee/ML API → Backend → Supabase
                                   ↓
                            Atualiza Preços
                                   ↓
                         Verifica Mudanças
                                   ↓
                    Cria Notificações (se necessário)
                                   ↓
                         Envia Push Notifications
```

### 2. Fluxo de Compra
```
User clica "Comprar" → App copia cupom → Abre link afiliado
                           ↓
                    Backend registra clique
                           ↓
                    Incrementa contador
                           ↓
                    Analytics atualizado
```

### 3. Sistema de Notificações
```
Evento (preço cai, novo cupom, etc)
            ↓
    Cria registro em notifications
            ↓
    Busca usuários interessados
            ↓
    Envia push notification
            ↓
    Marca como enviada
```

## 🎨 Design System

### Cores
- **Primary**: `#DC2626` (Vermelho)
- **Secondary**: `#000000` (Preto)
- **Accent**: `#EF4444` (Vermelho claro)
- **Background**: `#FFFFFF` (Branco)
- **Surface**: `#F3F4F6` (Cinza claro)
- **Text Primary**: `#111827`
- **Text Secondary**: `#6B7280`
- **Success**: `#10B981`
- **Warning**: `#F59E0B`
- **Error**: `#EF4444`

### Tipografia
- **Font Family**: Inter, SF Pro Display
- **Headings**: Bold, 24-32px
- **Body**: Regular, 14-16px
- **Caption**: Regular, 12-14px

### Componentes
- **Border Radius**: 12px (cards), 8px (buttons)
- **Shadows**: Soft, elevation-based
- **Spacing**: 4px base unit (4, 8, 12, 16, 24, 32, 48)

## 🔐 Segurança

- JWT com refresh tokens
- Senhas com bcrypt (salt rounds: 10)
- Rate limiting nas rotas
- Validação de inputs com Joi
- CORS configurado
- Helmet.js para headers de segurança
- Sanitização de dados
- HTTPS obrigatório em produção

## 📱 Features Mobile

### Push Notifications
- Novo cupom disponível
- Preço caiu em produto favorito
- Cupom expirando em 24h
- Nova promoção na categoria favorita

### Offline Support
- Cache de produtos visualizados
- Favoritos salvos localmente
- Sincronização ao reconectar

### Performance
- Lazy loading de imagens
- Paginação infinita
- Cache de requisições
- Otimização de bundle

## 🚀 Deploy

### Backend
- **Hosting**: Railway / Render / DigitalOcean
- **Database**: Supabase (managed PostgreSQL)
- **Cache**: Redis Cloud
- **CI/CD**: GitHub Actions

### Admin Panel
- **Hosting**: Vercel / Netlify
- **Build**: `npm run build`
- **Environment**: Production variables

### Mobile App
- **iOS**: App Store (via Expo EAS)
- **Android**: Google Play (via Expo EAS)
- **OTA Updates**: Expo Updates

## 📊 Monitoramento

- Logs estruturados (Winston)
- Error tracking (Sentry)
- Analytics (Google Analytics)
- Performance monitoring
- Uptime monitoring (UptimeRobot)

## 🔄 Automações (Cron Jobs)

### A cada 15 minutos
- Atualizar preços dos produtos
- Buscar novos cupons
- Verificar cupons expirados
- Verificar produtos esgotados
- Salvar histórico de preços

### Diariamente
- Limpar notificações antigas
- Gerar relatórios de analytics
- Backup de dados críticos

### Semanalmente
- Relatório de performance
- Limpeza de cache
- Auditoria de segurança
