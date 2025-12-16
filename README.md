# 🎯 PreçoCerto - Plataforma Completa de Cupons e Promoções

Sistema completo de cupons, promoções e afiliados com app mobile, painel administrativo e backend robusto.

## 📱 Módulos do Sistema

### 1. **Backend API** (Node.js + Express + Supabase)
API REST completa com autenticação, integração com múltiplas plataformas, sistema de notificações, bots e automações.

### 2. **Painel Admin** (React + Vite + Tailwind + shadcn/ui)
Interface administrativa completa para gerenciar produtos, cupons, categorias, analytics, bots e configurações.

### 3. **App Mobile** (React Native + Expo + NativeWind)
Aplicativo para usuários finais com notificações push, favoritos, sistema VIP e mais.

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configure as variáveis de ambiente (veja docs/02-setup-installation/environment.md)
npm run dev
```

### Painel Admin
```bash
cd admin-panel
npm install
npm run dev
# Acesse http://localhost:5173
```

### App Mobile
```bash
cd mobile-app
npm install
npx expo start
```

## 🗄️ Configuração do Banco de Dados

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o script `database/schema.sql` no SQL Editor
3. Execute as migrations em `database/migrations/` na ordem numérica
4. Configure as credenciais no `.env` do backend

**📖 Guia completo**: [docs/02-setup-installation/database.md](./docs/02-setup-installation/database.md)

## 🔑 Variáveis de Ambiente

**🎯 Recomendado**: Configure as APIs através do **Painel Admin** em `/settings`.

As seguintes configurações podem ser gerenciadas via Admin:
- ✅ Mercado Livre (Client ID, Secret, Tokens, Códigos de Afiliado)
- ✅ Shopee (Partner ID, Partner Key)
- ✅ Amazon (Access Key, Secret Key, Partner Tag)
- ✅ Expo (Access Token para Push Notifications)
- ✅ Telegram Collector (Rate Limits, Retries, Reconnect)
- ✅ Backend (URL, API Key)

**O que DEVE permanecer no .env:**
- 🔒 Segurança: `JWT_SECRET`, `JWT_REFRESH_SECRET`
- 🗄️ Infraestrutura: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`
- 💾 Cache: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (opcional)
- ⚙️ Sistema: `NODE_ENV`, `PORT`, `HOST`, `API_URL`

**📖 Guia completo**: [docs/02-setup-installation/environment.md](./docs/02-setup-installation/environment.md)

## 📚 Documentação Completa

Toda a documentação foi reorganizada e atualizada na pasta [`docs/`](./docs/).

### 🚀 Início Rápido
- [📖 Visão Geral](./docs/01-getting-started/README.md) - Entenda o sistema
- [⚙️ Instalação](./docs/02-setup-installation/README.md) - Setup completo
- [✅ Checklist](./docs/02-setup-installation/checklist.md) - Verificação
- [⚡ Teste Rápido](./docs/02-setup-installation/quick-test.md) - Validar instalação

### 📦 Módulos
- [🚀 Backend API](./docs/03-modules/backend/README.md) - Documentação do backend
- [👨‍💼 Admin Panel](./docs/03-modules/admin-panel/README.md) - Painel administrativo
- [📱 Mobile App](./docs/03-modules/mobile-app/README.md) - Aplicativo mobile
- [🎟️ Sistema de Cupons](./docs/03-modules/coupons/README.md) - Captura e gerenciamento
- [🔄 Auto Sync](./docs/03-modules/auto-sync/README.md) - Sincronização automática

### 🔌 Integrações
- [🤖 Bots (WhatsApp & Telegram)](./docs/04-integrations/bots/README.md) - Sistema de bots
- [🛒 Mercado Livre](./docs/04-integrations/mercadolivre/README.md) - Integração ML (100% funcional)
- [🛍️ Shopee](./docs/04-integrations/shopee/README.md) - Integração Shopee (90% funcional)
- [📡 Telegram Collector](./docs/04-integrations/telegram-collector/README.md) - Coletor de cupons (100% funcional)
- [🛒 Amazon](./docs/04-integrations/amazon/README.md) - Integração Amazon (30% - em desenvolvimento)
- [🛍️ AliExpress](./docs/04-integrations/aliexpress/README.md) - Integração AliExpress (30% - em desenvolvimento)

### 📡 API Reference
- [📡 API Reference](./docs/05-api-reference/README.md) - Documentação completa da API

### 🆘 Troubleshooting
- [🆘 Troubleshooting](./docs/06-troubleshooting/README.md) - Solução de problemas

### 🏗️ Arquitetura
- [🏗️ Arquitetura](./docs/07-architecture/README.md) - Arquitetura do sistema

### 📂 Estrutura da Documentação
```
docs/
├── 01-getting-started/        # Início rápido e visão geral
├── 02-setup-installation/     # Instalação e configuração
├── 03-modules/                # Documentação dos módulos
│   ├── backend/               # Backend API
│   ├── admin-panel/           # Painel Administrativo
│   ├── mobile-app/            # Aplicativo Mobile
│   ├── coupons/               # Sistema de Cupons
│   └── auto-sync/             # Auto Sync
├── 04-integrations/           # Integrações externas
│   ├── bots/                  # Bots WhatsApp e Telegram
│   ├── mercadolivre/          # Integração Mercado Livre
│   ├── shopee/                # Integração Shopee
│   ├── amazon/                # Integração Amazon
│   ├── aliexpress/            # Integração AliExpress
│   └── telegram-collector/    # Coletor de Cupons Telegram
├── 05-api-reference/          # Referência da API
├── 06-troubleshooting/         # Solução de problemas
└── 07-architecture/           # Arquitetura do sistema
```

## ✨ Funcionalidades

### Para Usuários
- ✅ Visualizar promoções e cupons
- ✅ Favoritar produtos
- ✅ Receber notificações de preços
- ✅ Filtrar por categoria
- ✅ Copiar cupons automaticamente
- ✅ Acesso VIP com recursos premium
- ✅ Histórico de preços

### Para Administradores
- ✅ Dashboard com analytics completo
- ✅ Gerenciar produtos e cupons
- ✅ Criar categorias personalizadas
- ✅ Visualizar estatísticas de cliques
- ✅ Monitorar conversões
- ✅ Automações de preços
- ✅ **Bots WhatsApp e Telegram** - Notificações automáticas
- ✅ **Gerenciamento de canais** - Múltiplos grupos
- ✅ **Logs e estatísticas** - Monitoramento completo
- ✅ **Telegram Collector** - Captura automática de cupons de canais públicos
- ✅ **Templates de mensagem** - Personalização de notificações

## 🛠️ Stack Tecnológico

**Backend:**
- Node.js 18+ + Express
- PostgreSQL (Supabase)
- Redis (Cache - opcional)
- JWT (Autenticação)
- Cron Jobs (Automações)
- Telegram (gramjs) - MTProto para coletor

**Frontend Admin:**
- React 18
- Vite
- Tailwind CSS
- shadcn/ui
- Zustand

**Mobile:**
- React Native
- Expo SDK 54
- NativeWind
- React Navigation
- Expo Notifications

## 🔄 Integrações

### Plataformas de Afiliados
- **Mercado Livre** ✅ - Produtos e cupons (100% funcional)
- **Shopee** ✅ - Produtos e cupons (90% funcional)
- **Amazon** ⚠️ - Cupons (30% - estrutura criada, em desenvolvimento)
- **AliExpress** ⚠️ - Cupons (30% - estrutura criada, em desenvolvimento)

### Outras Integrações
- **Expo Push Notifications** - Notificações em tempo real
- **WhatsApp Cloud API** - Notificações via WhatsApp
- **Telegram Bot API** - Notificações via Telegram
- **Telegram MTProto** - Coletor de cupons de canais públicos (100% Node.js)

## 📊 Automações

- **Captura automática de produtos** - Mercado Livre ✅, Shopee ✅
- **Captura automática de cupons** - Mercado Livre ✅, Shopee ✅, Gatry ✅, Telegram Channels ✅
- **Atualização de preços** - A cada 15 minutos
- **Verificação de cupons expirados** - A cada 1 minuto
- **Sincronização com APIs externas** - Automática
- **Envio automático de notificações** - Via WhatsApp/Telegram
- **Monitoramento de canais Telegram** - Tempo real

## 🎨 Design

- **Cores:** Vermelho (#DC2626) e Preto (#000000)
- **Estilo:** Moderno, clean e minimalista
- **UI/UX:** Responsivo e otimizado

## 🔐 Segurança

- Autenticação JWT com refresh tokens
- Rate limiting
- Validação de inputs
- CORS configurado
- Helmet.js
- Row Level Security (RLS) no Supabase

## 📈 Monetização

- Links de afiliados (Shopee e Mercado Livre)
- Plano VIP com recursos exclusivos
- AdMob no app mobile (futuro)
- Promoções patrocinadas

## 🚀 Deploy

### Backend
- Railway, Render, Heroku, AWS, etc.
- Configure variáveis de ambiente
- Execute migrations

### Admin Panel
- Vercel, Netlify, etc.
- Configure `VITE_API_URL`

### Mobile App
- Expo EAS Build
- Google Play Store
- Apple App Store

## 📝 Changelog

### Versão 2.0.0 (Dezembro 2024)
- ✅ Migração completa do Telegram Collector para Node.js (sem Python)
- ✅ Sistema de bots completo (WhatsApp e Telegram)
- ✅ Telegram Collector com MTProto (Node.js)
- ✅ Configurações migradas para Admin Panel
- ✅ Documentação completa reorganizada

## 🤝 Contribuindo

Este é um projeto proprietário. Para contribuições, entre em contato.

## 📄 Licença

Todos os direitos reservados © 2024 PreçoCerto

## 📞 Suporte

Para dúvidas e suporte:
- 📖 Consulte a [Documentação Completa](./docs/README.md)
- 🆘 Veja [Troubleshooting](./docs/06-troubleshooting/README.md)

---

**Desenvolvido com ❤️ para revolucionar o mercado de cupons e promoções**
