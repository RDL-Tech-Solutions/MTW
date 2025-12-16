# 🚀 MTW Promo - Visão Geral

## 📋 O que é o MTW Promo?

**MTW Promo** é uma plataforma completa de agregação de ofertas, cupons de desconto e sistema de afiliados. O sistema permite que usuários encontrem as melhores promoções de múltiplas plataformas (Mercado Livre, Shopee, Amazon, AliExpress) em um único lugar.

## 🎯 Objetivo

Facilitar a descoberta de ofertas e cupons, automatizar a captura de promoções e gerar receita através de links de afiliados, tudo isso com uma experiência mobile-first e notificações em tempo real.

## 🏗️ Arquitetura

O sistema é composto por **3 módulos principais**:

### 1. **Backend API** (Node.js)
- API REST completa
- Integração com múltiplas plataformas
- Sistema de automações (cron jobs)
- Bots para notificações
- Analytics e métricas

### 2. **Painel Administrativo** (React)
- Dashboard com analytics
- Gerenciamento de produtos e cupons
- Configuração de integrações
- Controle de usuários
- Gerenciamento de bots

### 3. **App Mobile** (React Native)
- Navegação de produtos
- Sistema de favoritos
- Notificações push
- Histórico de preços
- Acesso VIP

## ✨ Funcionalidades Principais

### Para Usuários
- ✅ Visualizar produtos em promoção
- ✅ Buscar cupons de desconto
- ✅ Favoritar produtos
- ✅ Receber notificações de preços
- ✅ Filtrar por categoria
- ✅ Copiar cupons automaticamente
- ✅ Acesso VIP com recursos premium

### Para Administradores
- ✅ Dashboard com analytics completo
- ✅ Gerenciar produtos e cupons
- ✅ Criar categorias personalizadas
- ✅ Visualizar estatísticas de cliques
- ✅ Monitorar conversões
- ✅ Automações de preços
- ✅ Bots WhatsApp e Telegram
- ✅ Gerenciamento de canais
- ✅ Logs e estatísticas

### Automações
- ✅ Captura automática de produtos
- ✅ Captura automática de cupons
- ✅ Atualização de preços
- ✅ Verificação de cupons expirados
- ✅ Envio automático de notificações
- ✅ Sincronização com APIs externas

## 🛠️ Stack Tecnológico

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **Cache**: Redis
- **Autenticação**: JWT
- **Agendamento**: Node-cron
- **Logs**: Winston

### Frontend (Admin)
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Charts**: Recharts

### Mobile
- **Framework**: React Native
- **Platform**: Expo SDK 54
- **Navigation**: React Navigation
- **Styling**: NativeWind
- **State Management**: Zustand
- **Notifications**: Expo Notifications

## 🔌 Integrações

### Plataformas de Afiliados
- **Mercado Livre** ✅ - 100% funcional
- **Shopee** ✅ - 90% funcional
- **Amazon** ⚠️ - 30% (em desenvolvimento)
- **AliExpress** ⚠️ - 30% (em desenvolvimento)

### Outras Integrações
- **Expo Push Notifications** - Notificações em tempo real
- **WhatsApp Cloud API** - Notificações via WhatsApp
- **Telegram Bot API** - Notificações via Telegram
- **Telegram MTProto** - Coletor de cupons de canais públicos

## 📊 Status do Projeto

| Módulo | Status | Progresso |
|--------|--------|-----------|
| Backend API | ✅ Completo | 100% |
| Admin Panel | ✅ Completo | 100% |
| Mobile App | ✅ Completo | 95% |
| Bots | ✅ Completo | 100% |
| Telegram Collector | ✅ Completo | 100% |
| Documentação | ✅ Completo | 100% |

## 🚀 Próximos Passos

1. **[Instalação](./../02-setup-installation/README.md)** - Configure o ambiente
2. **[Configuração](./../02-setup-installation/environment.md)** - Configure variáveis de ambiente
3. **[Integrações](./../04-integrations/README.md)** - Configure APIs externas
4. **[API Reference](./../05-api-reference/README.md)** - Explore a API

## 📚 Documentação

- [Arquitetura do Sistema](./architecture.md)
- [Stack Tecnológico](./tech-stack.md)
- [Funcionalidades](./features.md)
- [Índice Completo](./index.md)

---

**Pronto para começar?** → [Guia de Instalação](./../02-setup-installation/README.md)
