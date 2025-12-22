# Correções da API do Mercado Livre

## ✅ Status: IMPLEMENTADO

Baseado na documentação oficial do Mercado Livre, foram aplicadas as seguintes correções:

## 🔧 Correções Implementadas

### 1. **OAuth Token - Parâmetros no Body** ✅

**Problema:** Parâmetros sendo enviados como objeto JSON em vez de `application/x-www-form-urlencoded`

**Solução:** 
- Usar `URLSearchParams` para formatar corretamente
- Enviar como string no body, não como objeto

**Arquivos corrigidos:**
- `backend/src/services/autoSync/meliAuth.js`
- `backend/src/controllers/appSettingsController.js`

**Antes:**
```javascript
await axios.post('https://api.mercadolibre.com/oauth/token', {
  grant_type: 'refresh_token',
  client_id: this.clientId,
  // ...
}, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
```

**Depois:**
```javascript
const params = new URLSearchParams();
params.append('grant_type', 'refresh_token');
params.append('client_id', this.clientId);
// ...
await axios.post('https://api.mercadolivre.com/oauth/token', params.toString(), {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
});
```

### 2. **Access Token em Todas as Chamadas** ✅

**Recomendação:** Enviar access token em TODAS as chamadas (públicas e privadas) para segurança

**Arquivos corrigidos:**
- `backend/src/services/autoSync/meliSync.js`
- `backend/src/services/mercadolivre/mercadolivreService.js`
- `backend/src/services/coupons/meliCouponCapture.js`
- `backend/src/services/coupons/meliCouponCaptureV2.js`

**Mudança:**
- Todas as chamadas agora tentam obter e enviar token quando disponível
- Mesmo endpoints públicos recebem token se disponível

### 3. **Tratamento Detalhado de Erro 403** ✅

**Problema:** Tratamento genérico de erro 403 sem detalhes úteis

**Solução:** 
- Análise detalhada do erro 403 conforme documentação
- Mensagens específicas para cada tipo de problema:
  - Scopes inválidos
  - IPs bloqueados
  - Aplicação bloqueada/desabilitada
  - Usuários inativos
  - Token incorreto

**Arquivos corrigidos:**
- `backend/src/services/autoSync/meliAuth.js`
- `backend/src/services/autoSync/meliSync.js`
- `backend/src/services/mercadolivre/mercadolivreService.js`
- `backend/src/services/coupons/meliCouponCapture.js`
- `backend/src/services/coupons/meliCouponCaptureV2.js`

**Exemplo:**
```javascript
if (status === 403) {
  const errorCode = errorData?.code || errorData?.error;
  const errorMessage = errorData?.message || error.message;
  
  logger.error(`❌ Erro 403 - Acesso negado:`);
  logger.error(`   Código: ${errorCode}`);
  logger.error(`   Mensagem: ${errorMessage}`);
  
  // Sugestões específicas baseadas no erro
  if (errorCode === 'FORBIDDEN' || errorMessage?.includes('Invalid scopes')) {
    logger.error(`   💡 Verifique se os scopes necessários estão configurados no DevCenter`);
  }
  // ... outras validações
}
```

### 4. **Parâmetro State na Autorização** ✅

**Recomendação:** Gerar ID seguro (state) para validar que a resposta pertence à requisição

**Arquivo corrigido:**
- `backend/src/controllers/appSettingsController.js`

**Implementação:**
```javascript
// Gerar ID seguro para state
const crypto = await import('crypto');
const state = crypto.randomBytes(32).toString('hex');

// Adicionar state na URL
const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&state=${state}`;

// Retornar state para validação no frontend
return { auth_url: authUrl, state: state };
```

### 5. **Validação de Redirect URI** ✅

**Recomendação:** Validar que redirect_uri é o mesmo configurado na aplicação

**Arquivo corrigido:**
- `backend/src/controllers/appSettingsController.js`

**Nota:** Validação adicionada com log de aviso. Validação completa requer acesso ao DevCenter API.

### 6. **Endpoints de Busca** ✅

**Status:** Verificado - Não há uso de endpoints deprecados

**Análise:**
- O código usa `/sites/MLB/search` para busca geral (ainda válido)
- Não há uso de `/sites/MLB/search?seller_id=` (deprecado)
- Se necessário buscar itens de um vendedor específico, usar `/users/{user_id}/items/search`

## 📋 Checklist de Conformidade

- [x] OAuth token envia parâmetros no body (URLSearchParams)
- [x] Access token enviado em todas as chamadas (públicas e privadas)
- [x] Tratamento detalhado de erro 403 com sugestões
- [x] Parâmetro state na URL de autorização
- [x] Validação de redirect_uri (com aviso)
- [x] Endpoints de busca verificados (sem uso de deprecados)
- [x] Headers corretos (Accept: application/json)
- [x] Timeout configurado (15-30s)

## 🔍 Validações de Erro 403

O sistema agora verifica e sugere correções para:

1. **Scopes Inválidos**
   - Mensagem: "Invalid scopes"
   - Solução: Verificar scopes no DevCenter

2. **IPs Bloqueados**
   - Mensagem: Contém "IP"
   - Solução: Adicionar IP na lista permitida

3. **Aplicação Bloqueada**
   - Mensagem: Contém "blocked" ou "disabled"
   - Solução: Verificar status da aplicação no DevCenter

4. **Usuário Inativo**
   - Mensagem: Contém "user" ou "inactive"
   - Solução: Verificar status do usuário

5. **Token Incorreto**
   - Mensagem: Contém "token"
   - Solução: Verificar se token corresponde ao owner

## 📚 Referências

- [Categorias e Publicações](https://developers.mercadolivre.com.br/pt_br/categorias-e-publicacoes)
- [Localização e Moedas](https://developers.mercadolivre.com.br/pt_br/localizacao-e-moedas)
- [Itens e Buscas](https://developers.mercadolivre.com.br/pt_br/itens-e-buscas)
- [Atributos](https://developers.mercadolivre.com.br/pt_br/atributos)
- [Desenvolvimento Seguro](https://developers.mercadolivre.com.br/pt_br/desenvolvimento-seguro)
- [Erro 403](https://developers.mercadolivre.com.br/pt_br/erro-403)
- [Gerenciar IPs](https://developers.mercadolivre.com.br/pt_br/gerenciar-ips-de-um-aplicativo)
- [Realização de Testes](https://developers.mercadolivre.com.br/pt_br/realizacao-de-testes)

## ⚠️ Notas Importantes

1. **Access Token em Todas as Chamadas**
   - Mesmo endpoints públicos devem receber token quando disponível
   - Isso aumenta segurança e pode evitar rate limiting

2. **State Parameter**
   - Sempre validar o state retornado na callback
   - Isso previne ataques CSRF

3. **Redirect URI**
   - Deve ser EXATAMENTE o mesmo configurado no DevCenter
   - Diferenças mínimas (trailing slash, http vs https) causam erro

4. **Erro 403**
   - Não é sempre um problema de código
   - Pode ser: scopes, IPs, aplicação bloqueada, usuário inativo
   - Sempre verificar logs detalhados

5. **Endpoints Deprecados**
   - `/sites/{site_id}/search?seller_id=` → Use `/users/{user_id}/items/search`
   - `/sites/{site_id}/search?nickname=` → Ainda válido
   - `/sites/{site_id}/search` → Ainda válido para busca geral

## 🧪 Testes Recomendados

1. **Testar OAuth Flow**
   - Gerar URL de autorização com state
   - Validar state na callback
   - Trocar código por tokens

2. **Testar Erro 403**
   - Tentar acessar recurso sem scope necessário
   - Verificar se mensagem de erro é clara

3. **Testar Token em Chamadas Públicas**
   - Verificar se token é enviado mesmo em `/sites/MLB/search`
   - Confirmar que não causa erro

4. **Testar Renovação de Token**
   - Aguardar expiração
   - Verificar renovação automática







