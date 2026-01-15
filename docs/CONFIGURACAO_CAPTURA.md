# 🎯 Guia de Configuração de Captura de Produtos e Cupons

Este guia detalha como configurar e otimizar o sistema de captura automática de produtos e cupons após a instalação da VPS.

---

## 📋 Índice

1. [Configuração Inicial via Painel Admin](#configuração-inicial-via-painel-admin)
2. [Configuração de APIs de E-commerce](#configuração-de-apis-de-e-commerce)
3. [Configuração de Captura de Produtos](#configuração-de-captura-de-produtos)
4. [Configuração de Captura de Cupons](#configuração-de-captura-de-cupons)
5. [Configuração de IA (OpenRouter)](#configuração-de-ia-openrouter)
6. [Configuração de Bots (Telegram/WhatsApp)](#configuração-de-bots-telegramwhatsapp)
7. [Testes e Validação](#testes-e-validação)
8. [Otimizações Avançadas](#otimizações-avançadas)

---

## 🎛️ Configuração Inicial via Painel Admin

### 1. Acessar Painel Administrativo

```
URL: https://seu-dominio-admin.com
Usuário padrão: admin@precocerto.com
Senha padrão: admin123 (ALTERE IMEDIATAMENTE!)
```

### 2. Alterar Senha do Admin

1. Acesse **Perfil** no menu superior
2. Clique em **Alterar Senha**
3. Digite senha forte (mínimo 8 caracteres)
4. Salve as alterações

### 3. Verificar Conexão com Backend

1. Acesse **Dashboard**
2. Verifique se as estatísticas estão carregando
3. Se houver erro, verifique:
   - URL do backend no `.env` do admin-panel
   - CORS configurado no backend
   - Backend está rodando (`pm2 status`)

---

## 🔌 Configuração de APIs de E-commerce

Acesse: **Configurações** → **Integrações**

### 1. Mercado Livre

#### Obter Credenciais

1. Acesse: https://developers.mercadolivre.com.br/
2. Crie uma aplicação
3. Obtenha:
   - **Client ID**
   - **Client Secret**

#### Configurar no Painel

```
Client ID: SEU_CLIENT_ID
Client Secret: SEU_CLIENT_SECRET
Redirect URI: https://seu-backend.com/api/meli/callback
```

#### Autenticar

1. Clique em **Autenticar com Mercado Livre**
2. Faça login na sua conta Mercado Livre
3. Autorize a aplicação
4. Você será redirecionado de volta
5. **Access Token** e **Refresh Token** serão salvos automaticamente

#### Configurar Códigos de Afiliado

```
Código de Afiliado Brasil: SEU_CODIGO_BR
Código de Afiliado Argentina: SEU_CODIGO_AR (opcional)
Código de Afiliado México: SEU_CODIGO_MX (opcional)
```

### 2. Shopee

#### Obter Credenciais

1. Acesse: https://open.shopee.com/
2. Registre-se como parceiro
3. Crie uma aplicação
4. Obtenha:
   - **Partner ID**
   - **Partner Key**

#### Configurar no Painel

```
Partner ID: SEU_PARTNER_ID
Partner Key: SEU_PARTNER_KEY
```

> **Nota**: A Shopee usa autenticação SHA256. Não precisa de OAuth.

### 3. Amazon

#### Obter Credenciais

1. Acesse: https://affiliate-program.amazon.com.br/
2. Cadastre-se no programa de afiliados
3. Acesse: https://webservices.amazon.com/paapi5/documentation/
4. Obtenha:
   - **Access Key ID**
   - **Secret Access Key**
   - **Partner Tag** (Tracking ID)

#### Configurar no Painel

```
Access Key ID: SEU_ACCESS_KEY
Secret Access Key: SEU_SECRET_KEY
Partner Tag: SEU_PARTNER_TAG
Region: us-east-1 (ou sua região)
```

### 4. AliExpress

#### Obter Credenciais

1. Acesse: https://portals.aliexpress.com/
2. Registre-se no programa de afiliados
3. Acesse: https://developers.aliexpress.com/
4. Crie uma aplicação
5. Obtenha:
   - **App Key**
   - **App Secret**
   - **Tracking ID**

#### Configurar no Painel

```
App Key: SEU_APP_KEY
App Secret: SEU_APP_SECRET
Tracking ID: SEU_TRACKING_ID
```

#### Configurar Origem de Produtos

Escolha uma das opções:

- **Brasil**: Apenas produtos com estoque/envio nacional (BR)
- **Internacional**: Apenas produtos internacionais
- **Ambos**: Produtos nacionais e internacionais

```
Origem de Produtos: Brasil
```

> **⚠️ IMPORTANTE**: Se selecionar "Brasil", apenas produtos com estoque BR serão capturados. Isso é crítico para evitar longos prazos de entrega.

---

## 📦 Configuração de Captura de Produtos

### 1. Configurar Auto-Sync

Acesse: **Auto Sync** → **Configurações**

#### Mercado Livre

```
✅ Ativo: Sim
Keywords: smartphone, notebook, fone de ouvido, smartwatch
Desconto Mínimo: 30%
Limite de Produtos: 10
Intervalo: A cada 1 hora
```

#### Shopee

```
✅ Ativo: Sim
Keywords: eletrônicos, casa, moda, beleza
Desconto Mínimo: 25%
Limite de Produtos: 15
Intervalo: A cada 1 hora
Tipo de Oferta: TOP_PERFORMING
```

#### Amazon

```
✅ Ativo: Sim
Keywords: livros, eletrônicos, casa e cozinha
Desconto Mínimo: 20%
Limite de Produtos: 10
Intervalo: A cada 2 horas
```

#### AliExpress

```
✅ Ativo: Sim
Keywords: gadgets, acessórios, eletrônicos
Desconto Mínimo: 40%
Limite de Produtos: 20
Intervalo: A cada 2 horas
Origem: Brasil
Usar IA para Keywords: Sim
```

### 2. Configurar Filtros de Qualidade

Acesse: **Configurações** → **Filtros de Produtos**

```
Preço Mínimo: R$ 20,00
Preço Máximo: R$ 5.000,00
Avaliação Mínima: 4.0 estrelas
Número Mínimo de Avaliações: 10
Desconto Mínimo Global: 15%
```

### 3. Configurar Categorias

Acesse: **Categorias**

Certifique-se de ter categorias criadas:

- ✅ Eletrônicos
- ✅ Moda
- ✅ Casa e Decoração
- ✅ Beleza e Saúde
- ✅ Esportes
- ✅ Livros
- ✅ Brinquedos
- ✅ Alimentos e Bebidas

### 4. Testar Captura Manual

1. Acesse **Auto Sync**
2. Selecione uma plataforma (ex: AliExpress)
3. Clique em **Executar Agora**
4. Aguarde a execução (pode levar alguns minutos)
5. Verifique **Produtos Pendentes**
6. Aprove ou rejeite os produtos capturados

---

## 🎫 Configuração de Captura de Cupons

### 1. Configurar Telegram Collector

Acesse: **Configurações** → **Telegram Collector**

#### Obter Credenciais do Telegram

1. Acesse: https://my.telegram.org/
2. Faça login com seu número
3. Vá em **API Development Tools**
4. Crie uma aplicação
5. Obtenha:
   - **API ID**
   - **API Hash**

#### Configurar no Painel

```
API ID: SEU_API_ID
API Hash: SEU_API_HASH
Phone Number: +55 11 99999-9999
```

#### Autenticar

1. Clique em **Enviar Código**
2. Você receberá um código no Telegram
3. Digite o código no painel
4. Se solicitado, digite a senha de 2FA
5. Autenticação concluída!

### 2. Adicionar Canais do Telegram

Acesse: **Canais do Telegram**

#### Adicionar Canal Público

```
Nome do Canal: Cupons Brasil
Username: @cuponsbrasil
Tipo: Público
Ativo: Sim
```

#### Adicionar Canal Privado

```
Nome do Canal: Cupons VIP
Channel ID: -1001234567890
Tipo: Privado
Ativo: Sim
```

> **Como obter Channel ID**: Use o bot @userinfobot no Telegram. Adicione o bot ao canal e ele mostrará o ID.

#### Configurar Exemplo de Mensagens

Para melhorar a análise de IA, adicione exemplos de mensagens do canal:

```
Exemplo 1:
🔥 CUPOM SHOPEE
Código: FRETEGRATIS
Desconto: Frete Grátis
Válido até: 31/12/2024
Link: https://shopee.com.br/...

Exemplo 2:
💰 MERCADO LIVRE
15% OFF em Eletrônicos
Cupom: ELETRO15
Mínimo: R$ 100
```

### 3. Configurar Captura Automática de Outras Plataformas

#### Mercado Livre

```
✅ Ativo: Sim
Intervalo: A cada 30 minutos
Categorias: Todas
```

#### Shopee

```
✅ Ativo: Sim
Intervalo: A cada 30 minutos
Tipo: Cupons Gerais + Cupons de Loja
```

#### Amazon

```
✅ Ativo: Sim
Intervalo: A cada 1 hora
Tipo: Cupons Promocionais
```

#### AliExpress

```
✅ Ativo: Sim
Intervalo: A cada 1 hora
Tipo: Cupons de Vendedor + Cupons de Plataforma
```

#### Gatry (Web Scraping)

```
✅ Ativo: Sim
Intervalo: A cada 2 horas
```

### 4. Configurar Filtros de Cupons

Acesse: **Configurações** → **Filtros de Cupons**

```
Desconto Mínimo: 10%
Valor Mínimo de Desconto: R$ 5,00
Excluir Cupons de Frete: Não
Excluir Cupons com Valor Mínimo Alto: Sim (acima de R$ 500)
Validar Cupons Automaticamente: Sim
```

### 5. Aprovar Cupons Capturados

1. Acesse **Cupons**
2. Filtre por **Status: Pendente**
3. Revise os cupons capturados
4. Use **Aprovar em Lote** para aprovar múltiplos cupons
5. Cupons aprovados ficam disponíveis automaticamente

---

## 🤖 Configuração de IA (OpenRouter)

### 1. Obter API Key do OpenRouter

1. Acesse: https://openrouter.ai/
2. Crie uma conta
3. Vá em **Keys**
4. Crie uma nova API Key
5. Copie a key

### 2. Configurar no Painel

Acesse: **Configurações** → **IA (OpenRouter)**

```
API Key: sk-or-v1-...
Modelo Padrão: mistralai/mixtral-8x7b-instruct
IA Habilitada: Sim
```

### 3. Modelos Disponíveis

Escolha o modelo baseado em suas necessidades:

#### Econômicos (Recomendado para produção)

```
mistralai/mixtral-8x7b-instruct
- Custo: Baixo
- Qualidade: Boa
- Velocidade: Rápida
```

#### Balanceados

```
anthropic/claude-3-haiku
- Custo: Médio
- Qualidade: Muito Boa
- Velocidade: Média
```

#### Premium (Melhor qualidade)

```
openai/gpt-4o-mini
- Custo: Alto
- Qualidade: Excelente
- Velocidade: Média
```

### 4. Configurar Uso de IA

#### Para Análise de Produtos

```
✅ Analisar Qualidade de Produtos: Sim
✅ Otimizar Descrições: Sim
✅ Detectar Categorias: Sim
✅ Gerar Keywords: Sim
Confiança Mínima: 0.7
```

#### Para Análise de Cupons

```
✅ Analisar Cupons do Telegram: Sim
✅ Validar Códigos: Sim
✅ Extrair Informações: Sim
✅ Filtrar por Qualidade: Sim
Score Mínimo: 6.0
```

#### Para Templates de Mensagens

```
Modo de Template: IA ADVANCED
✅ Gerar Mensagens Personalizadas: Sim
✅ Adaptar por Plataforma: Sim
Criatividade (Temperature): 0.7
```

### 5. Configurar Rate Limiting

```
Requisições por Minuto: 60
Janela de Rate Limit: 60000ms (1 minuto)
Tentativas Máximas: 3
Delay Base para Retry: 2000ms (2 segundos)
Tamanho Máximo da Fila: 100
```

---

## 📱 Configuração de Bots (Telegram/WhatsApp)

### 1. Configurar Bot do Telegram

#### Criar Bot

1. Abra o Telegram
2. Procure por **@BotFather**
3. Envie `/newbot`
4. Escolha um nome: `PreçoCerto Bot`
5. Escolha um username: `precocerto_bot`
6. Copie o **Bot Token**

#### Configurar no Painel

Acesse: **Bots** → **Telegram**

```
Bot Token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
Bot Username: @precocerto_bot
```

#### Adicionar Canais de Envio

1. Crie um canal no Telegram
2. Adicione o bot como administrador
3. Obtenha o Chat ID (use @userinfobot)
4. Configure no painel:

```
Nome: Canal Principal
Chat ID: -1001234567890
Tipo: Canal
Ativo: Sim
```

### 2. Configurar Bot do WhatsApp (Opcional)

> **Nota**: Requer integração com WhatsApp Business API ou serviço terceiro.

Acesse: **Bots** → **WhatsApp**

```
API URL: https://api.whatsapp-service.com
API Token: SEU_TOKEN
Phone Number ID: SEU_PHONE_ID
```

### 3. Configurar Templates de Mensagens

Acesse: **Bots** → **Templates**

#### Template: Nova Promoção (sem cupom)

```
Modo: IA ADVANCED
Plataforma: Telegram

Template:
🔥 *OFERTA IMPERDÍVEL!*

{name}

💰 De ~~R$ {old_price}~~ por *R$ {price}*
📊 {discount}% OFF

🛒 Compre agora: {affiliate_link}

#Promoção #{category}
```

#### Template: Promoção com Cupom

```
Modo: IA ADVANCED
Plataforma: Telegram

Template:
🎁 *CUPOM + DESCONTO!*

{name}

💰 De ~~R$ {old_price}~~ por *R$ {price}*
📊 {discount}% OFF

🎫 Use o cupom: `{coupon_code}`
💵 Desconto adicional: {coupon_discount}

🛒 Link: {affiliate_link}

#Cupom #{category}
```

### 4. Testar Envio

1. Acesse **Bots** → **Testar Envio**
2. Selecione um produto
3. Selecione um canal
4. Clique em **Enviar Teste**
5. Verifique se a mensagem chegou no canal

---

## ✅ Testes e Validação

### 1. Testar Captura de Produtos

#### Teste Manual via Painel

1. Acesse **Auto Sync**
2. Selecione **AliExpress**
3. Clique em **Executar Agora**
4. Aguarde 2-5 minutos
5. Acesse **Produtos Pendentes**
6. Verifique se produtos foram capturados

#### Teste via API (cURL)

```bash
curl -X POST https://seu-backend.com/api/auto-sync/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "platform": "aliexpress",
    "keyword": "smartphone",
    "limit": 5
  }'
```

### 2. Testar Captura de Cupons

#### Teste do Telegram Collector

1. Envie uma mensagem de teste em um canal configurado:

```
🔥 CUPOM TESTE
Código: TESTE10
Desconto: 10% OFF
Válido até: 31/12/2024
```

2. Aguarde 1-2 minutos
3. Acesse **Cupons** → **Pendentes**
4. Verifique se o cupom foi capturado

#### Teste via API

```bash
curl -X POST https://seu-backend.com/api/coupon-capture/manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "platform": "shopee",
    "code": "FRETEGRATIS",
    "description": "Frete grátis em compras acima de R$ 50"
  }'
```

### 3. Testar IA

#### Teste de Análise de Produto

```bash
curl -X POST https://seu-backend.com/api/ai/analyze-product \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "name": "Smartphone Samsung Galaxy A54 128GB",
    "price": 1299.90,
    "old_price": 1999.90,
    "description": "Smartphone com tela AMOLED..."
  }'
```

#### Teste de Geração de Template

```bash
curl -X POST https://seu-backend.com/api/ai/generate-template \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "product_id": 123,
    "template_type": "promotion_with_coupon"
  }'
```

### 4. Testar Bots

1. Acesse **Bots** → **Testar Envio**
2. Selecione um produto recente
3. Selecione canal de teste
4. Envie
5. Verifique no Telegram/WhatsApp

### 5. Verificar Logs

```bash
# Via SSH na VPS
pm2 logs mtw-backend --lines 50

# Filtrar por captura
pm2 logs mtw-backend | grep -i capture

# Filtrar por IA
pm2 logs mtw-backend | grep -i openrouter

# Filtrar por bot
pm2 logs mtw-backend | grep -i telegram
```

---

## 🚀 Otimizações Avançadas

### 1. Otimizar Captura de Produtos

#### Ajustar Keywords com IA

Ative **IA para Keywords** nas configurações de Auto-Sync:

```
Keyword Original: smartphone
IA Expande para:
- smartphone android
- celular barato
- telefone inteligente
- mobile phone
```

#### Configurar Horários de Pico

Agende capturas para horários de maior atividade:

```
Mercado Livre: 10h, 14h, 18h, 22h
Shopee: 12h, 16h, 20h
AliExpress: 8h, 14h, 20h
```

### 2. Otimizar Captura de Cupons

#### Priorizar Canais de Alta Qualidade

Configure **Score Mínimo** por canal:

```
Canal Premium: Score >= 8.0
Canal Normal: Score >= 6.0
Canal Teste: Score >= 4.0
```

#### Filtrar Cupons Duplicados

```
✅ Verificar Duplicatas: Sim
Janela de Verificação: 7 dias
Considerar Duplicata se: Código idêntico + Mesma plataforma
```

### 3. Otimizar Uso de IA

#### Usar Cache de Respostas

```
✅ Cache de IA Habilitado: Sim
Tempo de Cache: 24 horas
Invalidar Cache se: Produto atualizado
```

#### Batch Processing

Processe múltiplos produtos de uma vez:

```
Tamanho do Batch: 5 produtos
Delay entre Batches: 2 segundos
```

### 4. Otimizar Performance do Puppeteer

#### Configurar Pool de Browsers

No `.env.production`:

```bash
# Se tiver RAM suficiente (2GB+), aumente para 3
MAX_BROWSER_INSTANCES=3

# Reduzir timeout se conexão for boa
BROWSER_TIMEOUT=20000
```

#### Desabilitar Recursos Desnecessários

O sistema já está otimizado, mas você pode ajustar em `browserScraper.js`:

```javascript
args: [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-images',  // Adicionar se não precisar de imagens
  '--disable-javascript',  // CUIDADO: Pode quebrar alguns sites
]
```

### 5. Configurar Notificações de Erro

#### Telegram Alerts

Configure um canal privado para receber alertas de erro:

```
Canal: Alertas Sistema
Chat ID: -1009876543210
Notificar em:
- ✅ Erro de Captura
- ✅ Erro de IA
- ✅ Erro de Bot
- ✅ Memória Alta (>80%)
- ✅ Aplicação Reiniciada
```

---

## 📊 Monitoramento de Captura

### 1. Dashboard de Métricas

Acesse: **Dashboard** → **Métricas de Captura**

Monitore:

- **Produtos Capturados (24h)**: Meta: 50+
- **Cupons Capturados (24h)**: Meta: 20+
- **Taxa de Aprovação**: Meta: >70%
- **Tempo Médio de Captura**: Meta: <30s
- **Erros de Captura**: Meta: <5%

### 2. Logs de Sync

Acesse: **Auto Sync** → **Logs**

Verifique:

- ✅ Última execução bem-sucedida
- ✅ Produtos encontrados
- ✅ Produtos salvos
- ✅ Erros (se houver)

### 3. Alertas Automáticos

Configure alertas para:

```
- Nenhum produto capturado em 6 horas
- Taxa de erro > 10%
- IA offline
- Bot offline
- Memória > 90%
```

---

## 🎓 Melhores Práticas

### 1. Keywords Efetivas

✅ **Boas Keywords**:
- Específicas: "smartphone samsung"
- Categorias: "eletrônicos"
- Tendências: "black friday"

❌ **Keywords Ruins**:
- Muito genéricas: "produto"
- Muito específicas: "smartphone samsung galaxy a54 128gb azul"

### 2. Aprovação de Produtos

✅ **Aprovar**:
- Desconto real (comparar com histórico)
- Produto de qualidade (boas avaliações)
- Preço competitivo
- Imagem de boa qualidade

❌ **Rejeitar**:
- Desconto falso
- Produto de baixa qualidade
- Preço acima do mercado
- Imagem ruim ou sem imagem

### 3. Gestão de Cupons

✅ **Aprovar**:
- Cupom válido e testado
- Desconto significativo (>10%)
- Condições claras
- Data de validade futura

❌ **Rejeitar**:
- Cupom expirado
- Desconto insignificante (<5%)
- Condições impossíveis (mínimo muito alto)
- Cupom duplicado

---

## 🔄 Manutenção Regular

### Diária

- [ ] Verificar produtos pendentes
- [ ] Aprovar cupons capturados
- [ ] Verificar logs de erro
- [ ] Monitorar uso de memória

### Semanal

- [ ] Revisar keywords de captura
- [ ] Analisar taxa de aprovação
- [ ] Limpar produtos rejeitados antigos
- [ ] Atualizar templates de mensagens

### Mensal

- [ ] Revisar configurações de API
- [ ] Otimizar filtros de qualidade
- [ ] Analisar ROI por plataforma
- [ ] Atualizar documentação

---

## 📞 Suporte

Problemas com captura?

1. **Verificar Logs**: `pm2 logs mtw-backend`
2. **Testar APIs**: Usar scripts de teste
3. **Verificar Credenciais**: Painel Admin → Configurações
4. **Consultar Docs**: `docs/06-troubleshooting/`

---

**Última atualização**: Janeiro 2026  
**Versão**: 1.0.0  
**Desenvolvido por**: RDL Tech Solutions
