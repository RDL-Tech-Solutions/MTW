# 🔧 Correções da Migração de Variáveis de Ambiente para Painel Admin

## 📋 Resumo

Após a migração das variáveis de ambiente para o painel admin, várias funcionalidades estavam dando erro porque ainda estavam usando `process.env` diretamente sem verificar o banco de dados primeiro.

## ✅ Correções Realizadas

### 1. **Backend - Serviços Corrigidos**

#### `backend/src/services/autoSync/meliSync.js`
- ✅ `generateMeliAffiliateLink()`: Agora busca `affiliateCode` do `AppSettings` primeiro

#### `backend/src/services/coupons/couponApiService.js`
- ✅ `getMeliCoupon()`: Removida dependência desnecessária de `MELI_API_URL` do banco (é constante)

#### `backend/src/services/autoSync/shopeeSync.js`
- ✅ `fetchShopeeProducts()`: Agora busca `partnerId` e `partnerKey` do `AppSettings` primeiro
- ✅ `generateShopeeAffiliateLink()`: Agora busca `partnerId` e `partnerKey` do `AppSettings` primeiro

#### `backend/src/services/coupons/shopeeCouponCapture.js`
- ✅ `generateSignature()`: Agora busca `partnerKey` do `AppSettings` primeiro
- ✅ `makeRequest()`: Agora busca `partnerId` e `partnerKey` do `AppSettings` primeiro
- ✅ `generateAffiliateLink()`: Agora busca `partnerId` do `AppSettings` primeiro

#### `backend/src/services/mercadolivre/mercadolivreService.js`
- ✅ `makeRequest()`: Agora aguarda `loadSettings()` antes de usar `accessToken`
- ✅ `createAffiliateLink()`: Removido fallback duplo para `MELI_AFFILIATE_TAG`

#### `backend/src/services/coupons/meliCouponCapture.js`
- ✅ `makeRequest()`: Agora aguarda `loadSettings()` antes de usar `accessToken`
- ✅ `generateAffiliateLink()`: Agora é `async` e aguarda `loadSettings()` antes de usar `affiliateCode`
- ✅ Todas as chamadas para `generateAffiliateLink()` agora usam `await`

#### `backend/src/services/coupons/meliCouponCaptureV2.js`
- ✅ `makeRequest()`: Agora aguarda `loadSettings()` antes de usar `accessToken`
- ✅ `generateAffiliateLink()`: Agora é `async` e aguarda `loadSettings()` antes de usar `affiliateCode`
- ✅ Chamada para `generateAffiliateLink()` agora usa `await`

#### `backend/src/services/shopee/shopeeService.js`
- ✅ `generateSign()`: Agora é `async` e aguarda `loadSettings()` antes de usar `partnerId` e `partnerKey`
- ✅ `makeRequest()`: Agora usa `await` para `generateSign()`

### 2. **Backend - Telegram Collector (Node.js)**

#### `backend/src/services/telegramCollector/`
- ✅ **Migrado completamente para Node.js** usando `telegram` (gramjs)
- ✅ **Python removido**: Não é mais necessário Python ou configuração de `python_path`
- ✅ Todos os serviços agora funcionam nativamente em JavaScript/Node.js
- ✅ `telegramClient.js`: Cliente Telegram usando gramjs
- ✅ `listenerService.js`: Listener de canais em tempo real
- ✅ `couponExtractor.js`: Extrator de cupons em JavaScript

### 3. **Frontend - Persistência de Valores**

#### `admin-panel/src/pages/Settings.jsx`
- ✅ Adicionado `sessionStorage` para persistir valores sensíveis durante a sessão
- ✅ Valores salvos são restaurados ao recarregar a página
- ✅ `handleSave()` não recarrega do servidor (mantém valores locais)
- ✅ `loadSettings()` restaura valores do `sessionStorage` se existirem

## 🔄 Padrão de Correção Aplicado

Todos os serviços agora seguem este padrão:

```javascript
// 1. No construtor: inicializar com fallback do .env
constructor() {
  this.value = process.env.VALUE; // Fallback
  this.settingsLoaded = false;
  this.loadSettings(); // Carregar do banco
}

// 2. Método loadSettings: buscar do banco primeiro
async loadSettings() {
  try {
    const config = await AppSettings.getXxxConfig();
    this.value = config.value || this.value; // Banco primeiro
  } catch (error) {
    // Manter fallback do .env
    logger.warn('⚠️ Erro ao carregar do banco, usando .env');
  }
}

// 3. Métodos que usam valores: aguardar loadSettings
async useValue() {
  if (!this.settingsLoaded) {
    await this.loadSettings();
  }
  // Usar this.value
}
```

## 📝 Arquivos Modificados

### Backend
- `backend/src/services/autoSync/meliSync.js`
- `backend/src/services/coupons/couponApiService.js`
- `backend/src/services/autoSync/shopeeSync.js`
- `backend/src/services/coupons/shopeeCouponCapture.js`
- `backend/src/services/mercadolivre/mercadolivreService.js`
- `backend/src/services/coupons/meliCouponCapture.js`
- `backend/src/services/coupons/meliCouponCaptureV2.js`
- `backend/src/services/shopee/shopeeService.js`
- `backend/src/services/telegramCollector/authService.js`
- `backend/src/services/telegramCollector/collectorService.js`

### Frontend
- `admin-panel/src/pages/Settings.jsx`

## ⚠️ Notas Importantes

1. **Fallback para .env**: Todos os serviços mantêm fallback para `.env` caso o banco não tenha valores
2. **Compatibilidade**: Serviços ainda funcionam com `.env` se o banco não estiver configurado
3. **Prioridade**: Banco de dados > Variável de ambiente
4. **SessionStorage**: Valores sensíveis são mantidos no `sessionStorage` apenas durante a sessão do navegador

## 🧪 Como Testar

1. Configure as credenciais no painel admin (`/settings`)
2. Teste cada funcionalidade:
   - Captura de cupons do Mercado Livre
   - Captura de cupons da Shopee
   - Sincronização automática
   - Geração de links de afiliado
   - Autenticação do Telegram Collector
3. Verifique os logs do backend para confirmar que está usando valores do banco

## 🔍 Verificação

Para verificar se um serviço está usando o banco corretamente, procure por logs como:
- `🔑 MeliAuth settings loaded from DB.`
- `🔑 ShopeeService settings loaded from DB.`
- `⚠️ MeliAuth using .env fallback for credentials.`

Se aparecer "using .env fallback", significa que o banco não tem valores configurados.

