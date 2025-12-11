# 🎯 MTW PROMO - Plataforma Completa de Cupons e Promoções

Sistema completo de cupons, promoções e afiliados com app mobile, painel administrativo e backend robusto.

## 📱 Módulos do Sistema

### 1. **Backend API** (Node.js + Express + Supabase)
API REST completa com autenticação, integração com Shopee e Mercado Livre, sistema de notificações e automações.

### 2. **Painel Admin** (React + Vite + Tailwind + shadcn/ui)
Interface administrativa para gerenciar produtos, cupons, categorias e visualizar analytics.

### 3. **App Mobile** (React Native + Expo + NativeWind)
Aplicativo para usuários finais com notificações push, favoritos, sistema VIP e mais.

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configure as variáveis de ambiente
npm run dev
```

### Painel Admin
```bash
cd admin-panel
npm install
npm run dev
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
3. Configure as credenciais no `.env` do backend

## 🔑 Variáveis de Ambiente

Consulte os arquivos `.env.example` em cada módulo para configurar:
- Credenciais Supabase
- Chaves API Shopee e Mercado Livre
- Tokens de notificação push
- Configurações de segurança

## 📚 Documentação

### Geral
- [Arquitetura do Sistema](./ARQUITETURA.md)
- [Progresso do Desenvolvimento](./PROGRESSO.md)
- [Guia de Instalação](./GUIA_INSTALACAO.md)

### Módulos
- [API Backend](./backend/README.md)
- [Painel Admin](./admin-panel/README.md)
- [App Mobile](./mobile-app/README.md)

### 🤖 Sistema de Bots (WhatsApp & Telegram)
- [📚 Índice Completo](./BOTS_INDEX.md) - Navegação por toda documentação
- [🚀 Guia Rápido](./BOTS_QUICK_START.md) - Setup em 5 minutos
- [📖 Documentação Completa](./BOTS_DOCUMENTATION.md) - Referência técnica
- [🎯 Resumo Executivo](./BOTS_SUMMARY.md) - Overview do sistema
- [✅ Checklist](./BOTS_CHECKLIST.md) - Passo a passo de implementação

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
- ✅ Dashboard com analytics
- ✅ Gerenciar produtos e cupons
- ✅ Criar categorias personalizadas
- ✅ Visualizar estatísticas de cliques
- ✅ Monitorar conversões
- ✅ Automações de preços
- ✅ **Bots WhatsApp e Telegram** - Notificações automáticas
- ✅ **Gerenciamento de canais** - Múltiplos grupos
- ✅ **Logs e estatísticas** - Monitoramento completo

## 🛠️ Stack Tecnológico

**Backend:**
- Node.js + Express
- Supabase (PostgreSQL)
- Redis (Cache)
- JWT (Autenticação)
- Cron Jobs (Automações)

**Frontend Admin:**
- React 18
- Vite
- Tailwind CSS
- shadcn/ui
- Zustand

**Mobile:**
- React Native
- Expo
- NativeWind
- React Navigation
- Expo Notifications

## 🔄 Integrações

- **Shopee Affiliate API** - Produtos e cupons
- **Mercado Livre API** - Ofertas e promoções
- **Expo Push Notifications** - Notificações em tempo real
- **WhatsApp Cloud API** - Notificações via WhatsApp
- **Telegram Bot API** - Notificações via Telegram

## 📊 Automações

- Atualização de preços a cada 15 minutos
- Verificação de cupons expirados a cada 30 minutos
- **Monitoramento de cupons expirados a cada 1 minuto** 🆕
- Sincronização com APIs externas
- **Envio automático de notificações via WhatsApp/Telegram** 🆕
- **Notificações de novas promoções e cupons** 🆕
- Limpeza de dados antigos

## 🎨 Design

- **Cores:** Vermelho (#DC2626) e Preto (#000000)
- **Estilo:** Moderno, clean e minimalista
- **UI/UX:** Responsivo e otimizado

## 📈 Monetização

- Links de afiliados (Shopee e Mercado Livre)
- Plano VIP com recursos exclusivos
- AdMob no app mobile
- Promoções patrocinadas

## 🔐 Segurança

- Autenticação JWT com refresh tokens
- Rate limiting
- Validação de inputs
- CORS configurado
- Helmet.js
- Row Level Security (RLS) no Supabase

## 🤝 Contribuindo

Este é um projeto proprietário. Para contribuições, entre em contato.

## 📄 Licença

Todos os direitos reservados © 2024 MTW Promo

## 📞 Suporte

Para dúvidas e suporte:
- Email: suporte@mtwpromo.com
- Website: [em desenvolvimento]

---

**Desenvolvido com ❤️ para revolucionar o mercado de cupons e promoções**
