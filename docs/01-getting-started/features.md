# ✨ Funcionalidades

Lista completa de funcionalidades do MTW Promo.

## 👥 Para Usuários Finais

### Produtos
- ✅ Visualizar produtos em promoção
- ✅ Buscar produtos
- ✅ Filtrar por categoria
- ✅ Ver detalhes do produto
- ✅ Histórico de preços
- ✅ Produtos relacionados

### Cupons
- ✅ Visualizar cupons ativos
- ✅ Buscar cupons
- ✅ Copiar código automaticamente
- ✅ Ver detalhes do cupom
- ✅ Cupons expirando em breve

### Favoritos
- ✅ Adicionar/remover favoritos
- ✅ Lista de favoritos
- ✅ Notificações de preços (futuro)

### Perfil
- ✅ Visualizar perfil
- ✅ Editar dados
- ✅ Histórico de uso de cupons
- ✅ Acesso VIP (futuro)

### Notificações
- ✅ Notificações push
- ✅ Notificações de novos cupons
- ✅ Notificações de preços (futuro)

## 👨‍💼 Para Administradores

### Dashboard
- ✅ Estatísticas gerais
- ✅ Gráficos de cliques
- ✅ Taxa de conversão
- ✅ Top produtos
- ✅ Top cupons
- ✅ Métricas de usuários

### Produtos
- ✅ CRUD completo
- ✅ Busca e filtros
- ✅ Upload de imagens
- ✅ Links de afiliados
- ✅ Histórico de preços
- ✅ Exclusão em lote

### Cupons
- ✅ CRUD completo
- ✅ Aprovação/rejeição
- ✅ Aprovação em lote
- ✅ Verificação de validade
- ✅ Exportação
- ✅ Cupons pendentes

### Categorias
- ✅ CRUD completo
- ✅ Organização hierárquica
- ✅ Contagem de produtos

### Usuários
- ✅ Listar usuários
- ✅ Gerenciar permissões
- ✅ Ativar/desativar VIP
- ✅ Estatísticas por usuário

### Bots
- ✅ Configurar WhatsApp
- ✅ Configurar Telegram
- ✅ Gerenciar canais
- ✅ Criar templates
- ✅ Testar envio
- ✅ Ver logs
- ✅ Estatísticas

### Telegram Collector
- ✅ Configurar credenciais
- ✅ Autenticar conta
- ✅ Adicionar canais
- ✅ Iniciar/parar listener
- ✅ Ver status
- ✅ Cupons capturados

### Settings
- ✅ Configurar Mercado Livre
- ✅ Configurar Shopee
- ✅ Configurar Amazon
- ✅ Configurar AliExpress
- ✅ Configurar Expo
- ✅ Configurar Backend

## 🤖 Automações

### Captura Automática
- ✅ Produtos do Mercado Livre
- ✅ Produtos da Shopee
- ✅ Cupons do Mercado Livre
- ✅ Cupons da Shopee
- ✅ Cupons do Gatry
- ✅ Cupons de canais Telegram

### Atualizações
- ✅ Preços a cada 15 minutos
- ✅ Cupons expirados a cada 1 minuto
- ✅ Sincronização automática

### Notificações
- ✅ Envio automático via bots
- ✅ Notificações push
- ✅ Notificações de novos cupons

## 📊 Analytics

- ✅ Dashboard completo
- ✅ Estatísticas de cliques
- ✅ Taxa de conversão
- ✅ Top produtos
- ✅ Top cupons
- ✅ Métricas de usuários
- ✅ Logs de notificações

## 🧠 Sistema de IA (Inteligência Artificial)

### Análise de Cupons
- ✅ **Coupon Analyzer**: Extrai automaticamente detalhes de cupons (código, plataforma, tipo/valor de desconto, limite, validade)
- ✅ **Confidence Score**: Score de confiança (0-1) na análise da IA
- ✅ **Publicação Automática**: Publica automaticamente quando confidence_score >= 0.90
- ✅ **Aprovação Manual**: Cupons com score < 0.90 ficam pendentes para revisão
- ✅ **Coupon Quality Analyzer**: Avalia qualidade do cupom
- ✅ **Coupon Quality Enhancer**: Melhora informações de cupons
- ✅ **Coupon Intelligent Filter**: Filtra cupons por qualidade
- ✅ **Coupon Batch Analyzer**: Analisa cupons em lote

### Análise e Edição de Produtos
- ✅ **Product Analyzer**: Analisa qualidade e relevância de produtos
- ✅ **Product Editor**: Edita produtos com IA antes da publicação:
  - Otimização automática de títulos (curtos, chamativos, minimal emojis)
  - Geração de descrições padronizadas
  - Classificação automática de categorias
  - Definição de prioridade da oferta (baixa/média/alta)
- ✅ **Price Analyzer**: Analisa preços e descontos
- ✅ **Description Optimizer**: Otimiza descrições de produtos
- ✅ **Keyword Optimizer**: Otimiza palavras-chave para busca

### Score de Qualidade
- ✅ **Offer Score**: Calcula score baseado em:
  - Percentual de desconto
  - Histórico de preços
  - Popularidade do produto
  - Performance anterior (CTR)
  - Confiança da IA
- ✅ **Uso do Score**:
  - Ordenação do feed
  - Decisão de notificações push
  - Priorização de bots

### Detecção de Duplicados
- ✅ **Duplicate Detector**: Identifica produtos duplicados:
  - Normalização de nomes de produtos
  - Comparação entre plataformas (Shopee, Mercado Livre, Amazon)
  - Criação de `canonical_product_id`
  - Prevenção de poluição do feed

### Segmentação Inteligente de Bots
- ✅ **Filtros por Categoria**: Bots publicam apenas produtos de categorias específicas
- ✅ **Filtros por Plataforma**: Bots publicam apenas de plataformas específicas
- ✅ **Horários de Engajamento**: Respeita horários configurados (schedule_start, schedule_end)
- ✅ **Score Mínimo**: Bots publicam apenas produtos com score acima do mínimo
- ✅ **Anti-Duplicação**: Evita publicar a mesma oferta em período curto (configurável em horas)
- ✅ **Logs de Envio**: Registra todos os envios para controle

### Templates IA ADVANCED
- ✅ **Geração Dinâmica**: Templates gerados dinamicamente pela IA baseados no produto
- ✅ **Otimização de Títulos**: Títulos otimizados automaticamente antes da publicação
- ✅ **Mensagens Persuasivas**: Descrições elaboradas e persuasivas geradas pela IA
- ✅ **Múltiplos Modelos**: Suporte a modelos gratuitos e pagos do OpenRouter
- ✅ **Formatação Inteligente**: Correção automática de formatação (preços, emojis, etc)

### Observabilidade
- ✅ **AI Decision Logs**: Logs estruturados de todas as decisões da IA
- ✅ **Histórico de Edições**: Histórico completo de edições feitas pela IA
- ✅ **Razões de Decisão**: Explicações das decisões da IA (ai_decision_reason)
- ✅ **Rate Limits**: Limites de taxa nas APIs para evitar custos excessivos
- ✅ **Fallback Automático**: Fallback automático se IA falhar

## 🔐 Segurança

- ✅ Autenticação JWT
- ✅ Refresh tokens
- ✅ Rate limiting
- ✅ Validação de inputs
- ✅ CORS configurado
- ✅ Row Level Security (RLS)

---

**Próximo**: [Stack Tecnológico](./tech-stack.md)





