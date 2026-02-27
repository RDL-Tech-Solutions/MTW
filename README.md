# 🎯 PreçoCerto - Plataforma Completa de Cupons e Promoções

> Sistema completo de cupons, promoções e afiliados com app mobile, painel administrativo e backend robusto.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-black.svg)](https://expo.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Módulos do Sistema](#-módulos-do-sistema)
- [Quick Start](#-quick-start)
- [Funcionalidades](#-funcionalidades)
- [Stack Tecnológico](#-stack-tecnológico)
- [Integrações](#-integrações)
- [Documentação](#-documentação)
- [Deploy](#-deploy)
- [Changelog](#-changelog)

## 🎯 Visão Geral

PreçoCerto é uma plataforma completa para gerenciamento de cupons e promoções, integrando múltiplas plataformas de e-commerce (Mercado Livre, Shopee, Amazon, AliExpress) com sistema de notificações via WhatsApp e Telegram.

**Versão Atual:** 2.2.0 (Fevereiro 2026)

### Novidades da v2.2.0 ⭐
- ✅ Google OAuth direto (sem dependência do Supabase OAuth)
- ✅ Sistema SMTP completo para envio de emails
- ✅ Recuperação de senha via email
- ✅ UI/UX melhorado no app mobile
- ✅ Documentação expandida com novos guias
- ✅ Troubleshooting para build Android

### Principais Diferenciais

- 🤖 **Sistema de IA Completo** - Análise inteligente de cupons com score de confiança
- 📱 **App Mobile Nativo** - React Native + Expo com notificações push
- 👨‍💼 **Painel Admin Moderno** - Interface completa para gerenciamento
- 🔄 **Automações Inteligentes** - Captura e sincronização automática
- 💬 **Bots WhatsApp & Telegram** - Notificações automáticas personalizadas
- 📊 **Analytics Completo** - Dashboard com métricas em tempo real

## 📦 Módulos do Sistema

### 1. Backend API
**Tecnologia:** Node.js + Express + Supabase  
**Porta:** 3000

API REST completa com:
- Autenticação JWT com refresh tokens
- Integração com múltiplas plataformas
- Sistema de notificações push
- Bots WhatsApp e Telegram
- Cron jobs para automações
- Sistema de IA para análise de cupons

### 2. Painel Admin
**Tecnologia:** React + Vite + Tailwind + shadcn/ui  
**Porta:** 5173

Interface administrativa com:
- Dashboard com analytics
- Gerenciamento de produtos e cupons
- Configuração de bots e canais
- Editor de produtos com IA
- Templates de mensagens
- Logs e estatísticas

### 3. App Mobile
**Tecnologia:** React Native + Expo SDK 54  
**Plataformas:** Android e iOS

Aplicativo para usuários com:
- Visualização de promoções
- Sistema de favoritos
- Notificações push
- Filtros por categoria
- Histórico de preços
- Modo VIP

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Supabase
- (Opcional) Expo Go para desenvolvimento mobile

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/precocerto.git
cd precocerto
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Configure as variáveis de ambiente
npm run dev
```

**Acesse:** http://localhost:3000

### 3. Painel Admin

```bash
cd admin-panel
npm install
cp .env.example .env
# Configure VITE_API_URL
npm run dev
```

**Acesse:** http://localhost:5173

### 4. App Mobile

```bash
cd app
npm install
cp .env.example .env
# Configure API_URL
npm start
```

**Escaneie o QR code** com Expo Go

## ✨ Funcionalidades

### Para Usuários (App Mobile)

- ✅ Visualizar promoções e cupons em tempo real
- ✅ Favoritar produtos e receber alertas
- ✅ Notificações push personalizadas
- ✅ Filtrar por categoria e loja
- ✅ Copiar cupons automaticamente
- ✅ Histórico de preços
- ✅ Modo VIP com recursos premium
- ✅ Compartilhar ofertas

### Para Administradores (Painel Admin)

- ✅ Dashboard com analytics completo
- ✅ Gerenciar produtos, cupons e categorias
- ✅ Visualizar estatísticas de cliques e conversões
- ✅ Configurar bots WhatsApp e Telegram
- ✅ Gerenciar múltiplos canais de notificação
- ✅ Templates personalizados de mensagens
- ✅ Editor de produtos com IA
- ✅ Análise inteligente de cupons
- ✅ Logs e monitoramento em tempo real
- ✅ Configurações de APIs via interface

### Sistema de IA

- 🧠 **Análise Inteligente de Cupons**
  - Score de confiança (0-1)
  - Publicação automática quando confidence >= 0.90
  - Detecção de duplicados
  
- ✍️ **Editor de Produtos com IA**
  - Otimização automática de títulos
  - Geração de descrições atrativas
  - Sugestões de melhorias
  
- 📊 **Score de Qualidade**
  - Baseado em desconto, histórico, popularidade
  - CTR (Click-Through Rate)
  - Confidence score da IA
  
- 🎯 **Segmentação Inteligente**
  - Por categoria
  - Por horário
  - Por score mínimo
  - Anti-duplicação automática
  
- 💬 **Templates IA ADVANCED**
  - Geração dinâmica de mensagens
  - Personalização por contexto
  - Múltiplos modelos OpenRouter

## 🛠️ Stack Tecnológico

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL (Supabase)
- **Cache:** Redis (opcional)
- **Auth:** JWT + bcrypt
- **Automações:** node-cron
- **Bots:** grammy (Telegram), whatsapp-web.js
- **IA:** OpenRouter API
- **Scraping:** Puppeteer + Cheerio

### Frontend Admin
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui + Radix UI
- **State:** Zustand
- **HTTP:** Axios
- **Charts:** Recharts
- **Router:** React Router v6

### Mobile App
- **Framework:** React Native 0.81
- **Platform:** Expo SDK 54
- **Styling:** NativeWind (Tailwind for RN)
- **Navigation:** React Navigation v6
- **State:** Zustand
- **HTTP:** Axios
- **Notifications:** Expo Notifications
- **Auth:** expo-auth-session

## 🔌 Integrações

### Plataformas de E-commerce

| Plataforma | Status | Funcionalidades |
|------------|--------|-----------------|
| **Mercado Livre** | ✅ 100% | Produtos, cupons, afiliados |
| **Shopee** | ✅ 90% | Produtos, cupons, afiliados |
| **Amazon** | ⚠️ 30% | Estrutura criada, em desenvolvimento |
| **AliExpress** | ⚠️ 30% | Estrutura criada, em desenvolvimento |

### Notificações e Bots

- **Expo Push Notifications** ✅ - Notificações mobile em tempo real
- **WhatsApp Cloud API** ✅ - Notificações via WhatsApp
- **Telegram Bot API** ✅ - Notificações via Telegram
- **Telegram MTProto** ✅ - Coletor de cupons de canais públicos

### Serviços Externos

- **Supabase** - Database + Auth + Storage
- **OpenRouter** - IA para análise de cupons
- **Encurtador.dev** - Encurtamento de links
- **Google OAuth** - Autenticação social

## 📚 Documentação

A documentação completa está organizada na pasta [`docs/`](./docs/):

### 🚀 Início Rápido
- [📖 Visão Geral](./docs/01-getting-started/README.md)
- [⚙️ Instalação](./docs/02-setup-installation/README.md)
- [✅ Checklist](./docs/02-setup-installation/checklist.md)
- [⚡ Teste Rápido](./docs/02-setup-installation/quick-test.md)

### 📦 Módulos
- [🚀 Backend API](./docs/03-modules/backend/README.md)
- [👨‍💼 Admin Panel](./docs/03-modules/admin-panel/README.md)
- [📱 Mobile App](./docs/03-modules/mobile-app/README.md)
- [🎟️ Sistema de Cupons](./docs/03-modules/coupons/README.md)
- [🔄 Auto Sync](./docs/03-modules/auto-sync/README.md)
- [🧠 Sistema de IA](./docs/03-modules/ai-system/README.md)

### 🔌 Integrações
- [🤖 Bots](./docs/04-integrations/bots/README.md)
- [🛒 Mercado Livre](./docs/04-integrations/mercadolivre/README.md)
- [🛍️ Shopee](./docs/04-integrations/shopee/README.md)
- [📡 Telegram Collector](./docs/04-integrations/telegram-collector/README.md)
- [🛒 Amazon](./docs/04-integrations/amazon/README.md)
- [🛍️ AliExpress](./docs/04-integrations/aliexpress/README.md)

### 📡 Referências
- [📡 API Reference](./docs/05-api-reference/README.md)
- [🆘 Troubleshooting](./docs/06-troubleshooting/README.md)
- [🏗️ Arquitetura](./docs/07-architecture/README.md)

## 🚀 Deploy

### Backend (Recomendado: Railway/Render)

```bash
# Configure variáveis de ambiente
# Execute migrations
npm run db:migrate

# Inicie com PM2
npm run start:prod
```

### Admin Panel (Recomendado: Vercel)

```bash
# Build para produção
npm run build

# Deploy
vercel --prod
```

### Mobile App (Expo EAS)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Configurar
eas build:configure

# Build
eas build --platform android
eas build --platform ios
```

## 📝 Changelog

### Versão 2.2.0 (Fevereiro 2026)

#### 🔐 Autenticação
- ✅ Removida autenticação com Facebook
- ✅ Implementado Google OAuth direto (sem Supabase)
- ✅ Sistema de recuperação de senha via email
- ✅ SMTP configurado e testado

#### 🎨 UI/UX
- ✅ Navbar flutuante com efeito glassmorphism
- ✅ Background circular animado nos ícones ativos
- ✅ Header padronizado em todas as telas
- ✅ Skeleton loaders para melhor UX

#### 🐛 Correções
- ✅ Corrigido erro de produtos não aparecendo (status 'created')
- ✅ Melhorados logs de erro do Supabase
- ✅ Corrigido toggle de notificações push
- ✅ Corrigido sistema de cupom esgotado

#### 📱 Mobile
- ✅ Configuração de ícones e splash screen
- ✅ Notificações push funcionando
- ✅ Deep linking configurado
- ⚠️ Build Android com problemas de NDK (usar Expo Go)

### Versão 2.1.0 (Dezembro 2024)

#### 🧠 Sistema de IA
- ✅ Análise inteligente de cupons com score de confiança
- ✅ Publicação automática quando confidence >= 0.90
- ✅ Editor de produtos com otimização de IA
- ✅ Score de qualidade de ofertas
- ✅ Detecção automática de duplicados
- ✅ Segmentação inteligente de bots
- ✅ Templates IA ADVANCED
- ✅ Suporte a múltiplos modelos OpenRouter

#### 👨‍💼 Painel Admin
- ✅ Visualização de confidence_score
- ✅ Histórico de edições da IA
- ✅ Botão "Forçar Publicação"
- ✅ Seletor de modelos OpenRouter

### Versão 2.0.0 (Dezembro 2024)
- ✅ Migração completa do Telegram Collector para Node.js
- ✅ Sistema de bots completo (WhatsApp e Telegram)
- ✅ Configurações migradas para Admin Panel
- ✅ Documentação completa reorganizada

## 🔐 Segurança

- ✅ Autenticação JWT com refresh tokens
- ✅ Rate limiting em todas as rotas
- ✅ Validação de inputs com Joi
- ✅ CORS configurado
- ✅ Helmet.js para headers de segurança
- ✅ Row Level Security (RLS) no Supabase
- ✅ Senhas hasheadas com bcrypt
- ✅ Tokens de reset com expiração

## 📈 Monetização

- 💰 Links de afiliados (Shopee, Mercado Livre, Amazon)
- 💎 Plano VIP com recursos exclusivos
- 📱 AdMob no app mobile (futuro)
- 🎯 Promoções patrocinadas

## 🤝 Contribuindo

Este é um projeto proprietário. Para contribuições, entre em contato.

## 📄 Licença

Todos os direitos reservados © 2024-2026 PreçoCerto

## 📞 Suporte

Para dúvidas e suporte:
- 📖 Consulte a [Documentação Completa](./docs/README.md)
- 🆘 Veja [Troubleshooting](./docs/06-troubleshooting/README.md)
- 📧 Email: suporte@precocerto.com

---

**Desenvolvido com ❤️ para revolucionar o mercado de cupons e promoções**
