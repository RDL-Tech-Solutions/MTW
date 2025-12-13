# 🎯 MTW PROMO - Plataforma Completa de Cupons e Promoções

Sistema completo de cupons, promoções e afiliados com app mobile, painel administrativo e backend robusto.

## 📱 Módulos do Sistema

### 1. **Backend API** (Node.js + Express + Supabase)
API REST completa com autenticação, integração com múltiplas plataformas (Mercado Livre ✅, Shopee ✅, Amazon ⚠️, AliExpress ⚠️), sistema de notificações e automações.

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
- Chaves API das plataformas:
  - **Mercado Livre**: `MELI_CLIENT_ID`, `MELI_CLIENT_SECRET`, `MELI_ACCESS_TOKEN`, `MELI_AFFILIATE_CODE`
  - **Shopee**: `SHOPEE_PARTNER_ID`, `SHOPEE_PARTNER_KEY`
  - **Amazon**: `AMAZON_ACCESS_KEY`, `AMAZON_SECRET_KEY`, `AMAZON_PARTNER_TAG` (opcional)
  - **AliExpress**: `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET`, `ALIEXPRESS_TRACKING_ID` (opcional)
- Tokens de notificação push
- Configurações de segurança

**📖 Guia completo**: [docs/02-setup-installation/](./docs/02-setup-installation/) ou [backend/ENV_GUIDE.md](./backend/ENV_GUIDE.md)

## 📚 Documentação

Toda a documentação foi organizada na pasta [`docs/`](./docs/). Use o [Índice da Documentação](./docs/01-getting-started/INDICE_DOCUMENTACAO.md) para navegar.

### 🚀 Início Rápido
- [📖 Índice da Documentação](./docs/01-getting-started/INDICE_DOCUMENTACAO.md) - Navegação completa
- [⚙️ Guia de Instalação](./docs/02-setup-installation/GUIA_INSTALACAO.md) - Setup completo
- [✅ Checklist de Setup](./docs/02-setup-installation/CHECKLIST_SETUP.md) - Verificação
- [⚡ Teste Rápido](./docs/02-setup-installation/GUIA_TESTE_RAPIDO.md) - Validar instalação

### 📦 Módulos
- [📱 Mobile App](./docs/03-modules/mobile-app/) - Documentação do app
- [🔄 Auto Sync](./docs/03-modules/auto-sync/) - Sincronização automática de produtos
- [✨ Auto Fill](./docs/03-modules/auto-fill/) - Auto-preenchimento de produtos
- [🎟️ Cupons](./docs/03-modules/coupons/) - Módulo de captura de cupons
- [📊 Status de Implementação](./docs/STATUS_IMPLEMENTACAO_PLATAFORMAS.md) - Status das plataformas

### 🔌 Integrações
- [🤖 Bots (WhatsApp & Telegram)](./docs/04-integrations/bots/) - Sistema de bots
  - ⭐ **[📘 Guia Passo a Passo Completo](./docs/04-integrations/bots/GUIA_PASSO_A_PASSO.md)** - Configuração detalhada do zero
  - [📱 Configuração WhatsApp](./docs/04-integrations/bots/GUIA_CONFIGURACAO_WHATSAPP.md)
  - [🚀 Guia Rápido](./docs/04-integrations/bots/BOTS_QUICK_START.md)
  - [📖 Documentação Completa](./docs/04-integrations/bots/BOTS_DOCUMENTATION.md)
- [🛒 Mercado Livre](./docs/04-integrations/mercadolivre/) - Integração ML
- [📊 Plano de Expansão](./docs/PLANO_EXPANSAO_PLATAFORMAS.md) - Roadmap de novas plataformas

### 📖 Referência
- [🏗️ Arquitetura do Sistema](./docs/06-reference/ARQUITETURA.md)
- [💼 Documentos de Negócio](./docs/07-business/) - Resumos e métricas
- [🔧 Troubleshooting](./docs/05-troubleshooting/) - Solução de problemas

### 📂 Estrutura da Documentação
```
docs/
├── 01-getting-started/     # Início rápido e navegação
├── 02-setup-installation/  # Guias de instalação
├── 03-modules/             # Documentação dos módulos
├── 04-integrations/        # Integrações externas
├── 05-troubleshooting/     # Solução de problemas
├── 06-reference/           # Referência técnica
└── 07-business/            # Documentos de negócio
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

### Plataformas de Afiliados
- **Mercado Livre** ✅ - Produtos e cupons (100% funcional)
- **Shopee** ✅ - Produtos e cupons (90% - implementado, aguardando testes)
- **Amazon** ⚠️ - Cupons (30% - estrutura criada, em desenvolvimento)
- **AliExpress** ⚠️ - Cupons (30% - estrutura criada, em desenvolvimento)

### Outras Integrações
- **Expo Push Notifications** - Notificações em tempo real
- **WhatsApp Cloud API** - Notificações via WhatsApp
- **Telegram Bot API** - Notificações via Telegram

**📊 Status detalhado**: 
- [Status de Implementação](./docs/STATUS_IMPLEMENTACAO_PLATAFORMAS.md)
- [Implementação Completa](./docs/IMPLEMENTACAO_COMPLETA_PLATAFORMAS.md) ⭐ **NOVO**

## 📊 Automações

- **Captura automática de produtos** - Mercado Livre ✅, Shopee ✅
- **Captura automática de cupons** - Mercado Livre ✅, Shopee ✅, Amazon ⚠️, AliExpress ⚠️
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
