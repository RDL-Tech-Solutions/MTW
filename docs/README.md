# 📚 Documentação PreçoCerto

Bem-vindo à documentação completa do PreçoCerto - Plataforma de Cupons e Promoções.

## 📋 Estrutura da Documentação

### 🚀 [01 - Início Rápido](./01-getting-started/)
Comece aqui para entender o sistema e suas funcionalidades.

- [Visão Geral](./01-getting-started/index.md) - Introdução ao PreçoCerto
- [Funcionalidades](./01-getting-started/features.md) - Lista completa de recursos
- [Arquitetura](./01-getting-started/architecture.md) - Visão geral da arquitetura
- [Stack Tecnológico](./01-getting-started/tech-stack.md) - Tecnologias utilizadas

### ⚙️ [02 - Setup e Instalação](./02-setup-installation/)
Guias completos para configurar o ambiente.

- [Guia de Instalação](./02-setup-installation/README.md) - Passo a passo completo
- [Variáveis de Ambiente](./02-setup-installation/environment.md) - Configuração do .env
- [Banco de Dados](./02-setup-installation/database.md) - Setup do Supabase
- [Checklist](./02-setup-installation/checklist.md) - Verificação de instalação
- [Teste Rápido](./02-setup-installation/quick-test.md) - Validar instalação
- [Deploy VPS](./02-setup-installation/VPS_SETUP_COMPLETO.md) - Deploy em servidor

### 📦 [03 - Módulos](./03-modules/)
Documentação detalhada de cada módulo do sistema.

- [Backend API](./03-modules/backend/) - API REST completa
- [Painel Admin](./03-modules/admin-panel/) - Interface administrativa
- [App Mobile](./03-modules/mobile-app/) - Aplicativo React Native
- [Sistema de Cupons](./03-modules/coupons/) - Captura e gerenciamento
- [Auto Sync](./03-modules/auto-sync/) - Sincronização automática
- [Sistema de IA](./03-modules/ai-system/) - Análise inteligente

### 🔌 [04 - Integrações](./04-integrations/)
Guias de integração com plataformas externas.

- [Bots (WhatsApp & Telegram)](./04-integrations/bots/) - Sistema de notificações
- [Mercado Livre](./04-integrations/mercadolivre/) - Integração ML (100%)
- [Shopee](./04-integrations/shopee/) - Integração Shopee (90%)
- [Telegram Collector](./04-integrations/telegram-collector/) - Coletor de cupons (100%)
- [Amazon](./04-integrations/amazon/) - Integração Amazon (30%)
- [AliExpress](./04-integrations/aliexpress/) - Integração AliExpress (30%)

### 📡 [05 - API Reference](./05-api-reference/)
Documentação completa da API REST.

- [Endpoints](./05-api-reference/README.md) - Lista de todos os endpoints
- [Autenticação](./05-api-reference/README.md#autenticação) - Sistema de auth
- [Exemplos](./05-api-reference/README.md#exemplos) - Exemplos de uso

### 🆘 [06 - Troubleshooting](./06-troubleshooting/)
Solução de problemas comuns.

- [Guia de Troubleshooting](./06-troubleshooting/README.md) - Problemas comuns
- [Erro 403 Mercado Livre](./06-troubleshooting/SOLUCAO_ERRO_403_MERCADOLIVRE.md)
- [Puppeteer VPS](./06-troubleshooting/FIX_PUPPETEER_VPS.md)
- [Telegram Capture](./06-troubleshooting/TELEGRAM_CAPTURE_TROUBLESHOOTING.md)
- [Alternativas Shopee](./06-troubleshooting/ALTERNATIVAS_SHOPEE.md)

### 🏗️ [07 - Arquitetura](./07-architecture/)
Documentação técnica da arquitetura do sistema.

- [Visão Geral](./07-architecture/README.md) - Arquitetura completa
- [Fluxo de Dados](./07-architecture/README.md#fluxo-de-dados)
- [Segurança](./07-architecture/README.md#segurança)

## 🎯 Guias Rápidos

### Para Desenvolvedores

1. **Primeiro Acesso**
   - Leia [Visão Geral](./01-getting-started/index.md)
   - Siga o [Guia de Instalação](./02-setup-installation/README.md)
   - Execute o [Teste Rápido](./02-setup-installation/quick-test.md)

2. **Desenvolvimento**
   - Configure [Variáveis de Ambiente](./02-setup-installation/environment.md)
   - Entenda a [Arquitetura](./01-getting-started/architecture.md)
   - Consulte a [API Reference](./05-api-reference/README.md)

3. **Integrações**
   - Configure [Bots](./04-integrations/bots/)
   - Integre [Mercado Livre](./04-integrations/mercadolivre/)
   - Configure [Telegram Collector](./04-integrations/telegram-collector/)

### Para Administradores

1. **Setup Inicial**
   - [Instalação Completa](./02-setup-installation/README.md)
   - [Configuração do Banco](./02-setup-installation/database.md)
   - [Deploy VPS](./02-setup-installation/VPS_SETUP_COMPLETO.md)

2. **Configuração**
   - [Painel Admin](./03-modules/admin-panel/)
   - [Sistema de Bots](./04-integrations/bots/)
   - [Integrações](./04-integrations/)

3. **Manutenção**
   - [Troubleshooting](./06-troubleshooting/)
   - [Logs e Monitoramento](./03-modules/backend/README.md#logs)

## 📖 Documentos Importantes

### Configuração
- [Variáveis de Ambiente](./02-setup-installation/environment.md) - **Essencial**
- [Banco de Dados](./02-setup-installation/database.md) - **Essencial**
- [Checklist de Setup](./02-setup-installation/checklist.md) - **Recomendado**

### Funcionalidades
- [Sistema de IA](./03-modules/ai-system/) - **Novo**
- [Bots WhatsApp/Telegram](./04-integrations/bots/) - **Popular**
- [Telegram Collector](./04-integrations/telegram-collector/) - **Popular**

### Integrações
- [Mercado Livre](./04-integrations/mercadolivre/) - **100% Funcional**
- [Shopee](./04-integrations/shopee/) - **90% Funcional**
- [Amazon](./04-integrations/amazon/) - **Em Desenvolvimento**

## 🔍 Busca Rápida

### Por Funcionalidade

- **Autenticação**: [Backend Auth](./03-modules/backend/README.md#autenticação)
- **Notificações Push**: [Mobile App](./03-modules/mobile-app/README.md#notificações)
- **Bots**: [Sistema de Bots](./04-integrations/bots/)
- **IA**: [Sistema de IA](./03-modules/ai-system/)
- **Cupons**: [Sistema de Cupons](./03-modules/coupons/)

### Por Tecnologia

- **Node.js**: [Backend](./03-modules/backend/)
- **React**: [Admin Panel](./03-modules/admin-panel/)
- **React Native**: [Mobile App](./03-modules/mobile-app/)
- **Supabase**: [Database](./02-setup-installation/database.md)
- **Telegram**: [Telegram Collector](./04-integrations/telegram-collector/)

### Por Problema

- **Erro 403 ML**: [Solução](./06-troubleshooting/SOLUCAO_ERRO_403_MERCADOLIVRE.md)
- **Puppeteer VPS**: [Fix](./06-troubleshooting/FIX_PUPPETEER_VPS.md)
- **Build Android**: [Solução](../SOLUCAO_BUILD_ANDROID.md)
- **SMTP**: [Teste](../RESUMO_TESTES_SMTP.md)

## 📊 Status das Integrações

| Integração | Status | Documentação |
|------------|--------|--------------|
| Mercado Livre | ✅ 100% | [Docs](./04-integrations/mercadolivre/) |
| Shopee | ✅ 90% | [Docs](./04-integrations/shopee/) |
| Telegram Collector | ✅ 100% | [Docs](./04-integrations/telegram-collector/) |
| WhatsApp Bot | ✅ 100% | [Docs](./04-integrations/bots/) |
| Telegram Bot | ✅ 100% | [Docs](./04-integrations/bots/) |
| Amazon | ⚠️ 30% | [Docs](./04-integrations/amazon/) |
| AliExpress | ⚠️ 30% | [Docs](./04-integrations/aliexpress/) |
| Google OAuth | ✅ 100% | [Guia](../GUIA_GOOGLE_OAUTH_SETUP.md) |
| SMTP Email | ✅ 100% | [Teste](../RESUMO_TESTES_SMTP.md) |

## 🆕 Últimas Atualizações

### Fevereiro 2026
- ✅ Google OAuth direto (sem Supabase)
- ✅ Sistema de recuperação de senha
- ✅ SMTP configurado e testado
- ✅ UI/UX melhorado (navbar flutuante, headers padronizados)
- ✅ Correções de bugs (produtos, notificações, cupons)

### Dezembro 2024
- ✅ Sistema de IA completo
- ✅ Análise inteligente de cupons
- ✅ Editor de produtos com IA
- ✅ Templates IA ADVANCED
- ✅ Migração Telegram Collector para Node.js

## 📞 Suporte

- 📖 Consulte esta documentação
- 🆘 Veja [Troubleshooting](./06-troubleshooting/)
- 📧 Email: suporte@precocerto.com

## 🔗 Links Úteis

- [README Principal](../README.md)
- [Changelog](./CHANGELOG.md)
- [Guia de Deploy VPS](./02-setup-installation/VPS_SETUP_COMPLETO.md)
- [API Reference](./05-api-reference/README.md)

---

**Última atualização:** Fevereiro 2026  
**Versão:** 2.2.0
