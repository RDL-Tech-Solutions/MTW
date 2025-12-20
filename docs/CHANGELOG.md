# 📝 Changelog

Histórico de mudanças e atualizações do MTW Promo.

## Versão 2.1.0 - Dezembro 2024

### 🎉 Novidades

#### 🧠 Sistema de IA Completo
- ✅ **Análise Inteligente de Cupons**: Extração automática de detalhes com score de confiança (0-1)
- ✅ **Publicação Automática**: Publica automaticamente cupons com confidence_score >= 0.90
- ✅ **Editor de Produtos**: Otimização automática de títulos, descrições e categorias
- ✅ **Score de Qualidade**: Sistema de pontuação baseado em múltiplos fatores
- ✅ **Detecção de Duplicados**: Identificação automática de produtos duplicados
- ✅ **Segmentação Inteligente de Bots**: Filtros avançados (categoria, horário, score, anti-duplicação)
- ✅ **Templates IA ADVANCED**: Geração dinâmica de mensagens promocionais
- ✅ **Suporte a Múltiplos Modelos OpenRouter**: Gratuitos e pagos

#### Melhorias no Painel Admin
- ✅ Visualização de confidence_score e score de qualidade
- ✅ Histórico de edições da IA
- ✅ Botão "Forçar Publicação" para cupons pendentes
- ✅ Seletor de modelos OpenRouter com informações detalhadas
- ✅ Configuração completa de IA em `/settings`

#### Observabilidade
- ✅ Logs estruturados de decisões da IA (ai_decision_logs)
- ✅ Histórico completo de edições
- ✅ Razões de decisão da IA (ai_decision_reason)
- ✅ Rate limiting e fallback automático

### 🔧 Melhorias

- Melhor tratamento de erros na IA
- Correção automática de formatação em templates IA ADVANCED
- Otimização de prompts para melhor qualidade de respostas
- Aumento de max_tokens para evitar truncamento

### 📚 Documentação

- ✅ Documentação completa do sistema de IA
- ✅ Guias de configuração de IA
- ✅ Documentação de templates IA ADVANCED
- ✅ Documentação de segmentação inteligente de bots

---

## Versão 2.0.0 - Dezembro 2024

### 🎉 Novidades

#### Telegram Collector
- ✅ Migração completa para Node.js (sem Python)
- ✅ Uso de gramjs (telegram) para MTProto
- ✅ Autenticação via Admin Panel
- ✅ Gerenciamento completo via interface web
- ✅ Remoção de dependência Python

#### Sistema de Bots
- ✅ Bots WhatsApp e Telegram completos
- ✅ Templates de mensagem personalizáveis
- ✅ Múltiplos canais
- ✅ Logs e estatísticas

#### Configurações
- ✅ Migração de configurações para Admin Panel
- ✅ Mercado Livre configurável via admin
- ✅ Shopee configurável via admin
- ✅ Amazon configurável via admin
- ✅ AliExpress configurável via admin
- ✅ Expo configurável via admin

#### Documentação
- ✅ Documentação completamente reorganizada
- ✅ Guias completos e atualizados
- ✅ Estrutura organizada por categorias

### 🔧 Melhorias

- Melhor organização do código
- Logs mais detalhados
- Melhor tratamento de erros
- Performance otimizada

### 🐛 Correções

- Correção de bugs de autenticação
- Correção de problemas de conexão
- Correção de validações

### 📚 Documentação

- Nova estrutura de documentação
- Guias completos de instalação
- Documentação de todas as integrações
- API Reference completa

---

**Versão Anterior**: 1.0.0





