# 🔧 CORREÇÃO: Preferências de Notificação Não Salvam

## 🐛 PROBLEMA IDENTIFICADO

**Sintoma:** Ao ativar notificações push no app, aparece erro "Não foi possível atualizar a preferência". Todas as mudanças feitas em `NotificationSettingsScreen` não estão sendo salvas.

## 🔍 CAUSA RAIZ

O modelo `NotificationPreference.upsert()` no backend **NÃO estava recebendo** os campos `coupons_only` e `coupon_platforms` que o app estava enviando.

### Código Anterior (ERRADO):
```javascript
// backend/src/models/NotificationPreference.js
static async upsert(userId, preferences) {
  const {
    push_enabled = true,
    email_enabled = false,
    category_preferences = [],
    keyword_preferences = [],
    product_name_preferences = [],
    home_filters = {},
  } = preferences;  // ❌ Faltando coupons_only e coupon_platforms

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      push_enabled,
      email_enabled,
      category_preferences,
      keyword_preferences,
      product_name_preferences,
      home_filters,
      // ❌ Não estava salvando coupons_only e coupon_platforms
      updated_at: new Date().toISOString(),
    }, ...)
}
```

### O que o App Estava Enviando:
```javascript
// app/src/screens/settings/NotificationSettingsScreen.js
await api.put('/notification-preferences', {
  push_enabled: pushEnabled,
  coupons_only: couponsOnly,           // ✅ Enviando
  coupon_platforms: couponPlatforms,   // ✅ Enviando
  category_preferences: selectedCategories,
  keyword_preferences: keywords,
  product_name_preferences: productNames,
});
```

### Resultado:
- Backend recebia os dados
- Mas **ignorava** `coupons_only` e `coupon_platforms`
- Tentava salvar no banco sem essas colunas
- **Erro:** Coluna não existe ou dados inválidos

## ✅ CORREÇÕES APLICADAS

### 1. Corrigido Modelo NotificationPreference

**Arquivo:** `backend/src/models/NotificationPreference.js`

```javascript
static async upsert(userId, preferences) {
  const {
    push_enabled = true,
    email_enabled = false,
    coupons_only = false,           // ✅ ADICIONADO
    coupon_platforms = [],          // ✅ ADICIONADO
    category_preferences = [],
    keyword_preferences = [],
    product_name_preferences = [],
    home_filters = {},
  } = preferences;

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      push_enabled,
      email_enabled,
      coupons_only,                 // ✅ ADICIONADO
      coupon_platforms,             // ✅ ADICIONADO
      category_preferences,
      keyword_preferences,
      product_name_preferences,
      home_filters,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 2. Adicionados Logs Detalhados no Controller

**Arquivo:** `backend/src/controllers/notificationPreferenceController.js`

```javascript
static async update(req, res, next) {
  try {
    logger.info(`\n📝 ========== ATUALIZANDO PREFERÊNCIAS ==========`);
    logger.info(`   Usuário ID: ${req.user.id}`);
    logger.info(`   Body recebido: ${JSON.stringify(req.body, null, 2)}`);

    const {
      push_enabled,
      email_enabled,
      coupons_only,
      coupon_platforms,
      category_preferences,
      keyword_preferences,
      product_name_preferences,
      home_filters,
    } = req.body;

    logger.info(`\n   📊 Dados extraídos:`);
    logger.info(`      push_enabled: ${push_enabled}`);
    logger.info(`      coupons_only: ${coupons_only}`);
    logger.info(`      coupon_platforms: ${JSON.stringify(coupon_platforms)}`);

    logger.info(`\n   💾 Salvando no banco...`);
    const preferences = await NotificationPreference.upsert(req.user.id, {
      push_enabled,
      email_enabled,
      coupons_only,
      coupon_platforms,
      category_preferences,
      keyword_preferences,
      product_name_preferences,
      home_filters,
    });

    logger.info(`\n   ✅ Preferências salvas com sucesso!`);
    logger.info(`   Dados salvos: ${JSON.stringify(preferences, null, 2)}`);

    res.json(successResponse(preferences, 'Preferências atualizadas com sucesso'));
  } catch (error) {
    logger.error(`\n❌ Erro ao atualizar preferências:`);
    logger.error(`   Erro: ${error.message}`);
    logger.error(`   Stack: ${error.stack}`);
    next(error);
  }
}
```

### 3. Criado Script de Verificação da Tabela

**Arquivo:** `backend/scripts/check-notification-preferences-table.js`

Este script verifica:
- ✅ Se a tabela existe
- ✅ Se as colunas necessárias existem
- ✅ Se é possível inserir dados
- ✅ Estatísticas da tabela

## 🚀 COMO APLICAR AS CORREÇÕES

### Passo 1: Verificar Tabela do Banco

```bash
cd backend
node scripts/check-notification-preferences-table.js
```

**Se mostrar erro "Coluna não existe":**
```bash
# Aplicar migration
psql -d seu_banco -f backend/database/migrations/add_coupons_only_preferences.sql
```

### Passo 2: Reiniciar Backend

```bash
# Parar backend
# Reiniciar backend
npm start
```

### Passo 3: Testar no App

1. Abrir app mobile
2. Ir em Configurações → Notificações
3. Ativar "Apenas Cupons"
4. Selecionar plataformas
5. Clicar em "Salvar Preferências"

**Deve aparecer:** "Sucesso! Preferências salvas com sucesso."

### Passo 4: Verificar Logs do Backend

```bash
tail -f backend/logs/combined.log | grep "ATUALIZANDO PREFERÊNCIAS"
```

**Deve mostrar:**
```
📝 ========== ATUALIZANDO PREFERÊNCIAS ==========
   Usuário ID: 1
   Body recebido: {
     "push_enabled": true,
     "coupons_only": true,
     "coupon_platforms": ["shopee", "amazon"],
     ...
   }
   
   📊 Dados extraídos:
      push_enabled: true
      coupons_only: true
      coupon_platforms: ["shopee","amazon"]
   
   💾 Salvando no banco...
   ✅ Preferências salvas com sucesso!
```

## 🧪 TESTES

### Teste 1: Ativar "Apenas Cupons"

```bash
# No app:
1. Ir em Configurações → Notificações
2. Ativar switch "Apenas Cupons"
3. Clicar em "Salvar Preferências"

# Verificar no banco:
SELECT user_id, coupons_only FROM notification_preferences;
```

**Esperado:** `coupons_only = true`

### Teste 2: Selecionar Plataformas

```bash
# No app:
1. Selecionar "Shopee" e "Amazon"
2. Clicar em "Salvar Preferências"

# Verificar no banco:
SELECT user_id, coupon_platforms FROM notification_preferences;
```

**Esperado:** `coupon_platforms = {shopee,amazon}`

### Teste 3: Adicionar Palavras-chave

```bash
# No app:
1. Adicionar "iPhone" e "Samsung"
2. Clicar em "Salvar Preferências"

# Verificar no banco:
SELECT user_id, keyword_preferences FROM notification_preferences;
```

**Esperado:** `keyword_preferences = ["iPhone","Samsung"]`

## 📊 VERIFICAÇÃO NO BANCO

### Query 1: Ver Todas as Preferências

```sql
SELECT 
  user_id,
  push_enabled,
  coupons_only,
  coupon_platforms,
  category_preferences,
  keyword_preferences,
  product_name_preferences,
  updated_at
FROM notification_preferences
ORDER BY updated_at DESC;
```

### Query 2: Usuários com "Apenas Cupons"

```sql
SELECT 
  u.id,
  u.name,
  u.email,
  np.coupons_only,
  np.coupon_platforms
FROM users u
JOIN notification_preferences np ON u.id = np.user_id
WHERE np.coupons_only = true;
```

### Query 3: Estatísticas

```sql
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN push_enabled = true THEN 1 END) as push_ativado,
  COUNT(CASE WHEN coupons_only = true THEN 1 END) as apenas_cupons,
  COUNT(CASE WHEN coupon_platforms IS NOT NULL AND array_length(coupon_platforms, 1) > 0 THEN 1 END) as com_plataformas
FROM notification_preferences;
```

## 🔍 TROUBLESHOOTING

### Problema 1: Erro "Coluna não existe"

**Sintoma:**
```
❌ Erro ao atualizar preferências:
   Erro: column "coupons_only" does not exist
```

**Solução:**
```bash
# Aplicar migration
psql -d seu_banco -f backend/database/migrations/add_coupons_only_preferences.sql

# Verificar
node backend/scripts/check-notification-preferences-table.js
```

### Problema 2: Preferências Não Salvam (Sem Erro)

**Sintoma:** App mostra "Sucesso" mas dados não aparecem no banco

**Solução:**
```bash
# 1. Verificar logs do backend
tail -f backend/logs/combined.log | grep "preferências"

# 2. Verificar se dados estão chegando
# Deve mostrar: "Body recebido: {...}"

# 3. Verificar se está salvando
# Deve mostrar: "Preferências salvas com sucesso!"

# 4. Verificar no banco
psql -d seu_banco -c "SELECT * FROM notification_preferences WHERE user_id = SEU_USER_ID;"
```

### Problema 3: App Mostra Erro "Não foi possível atualizar"

**Sintoma:** Alert de erro no app

**Causas Possíveis:**
1. Backend não está rodando
2. Token de autenticação expirado
3. Erro no banco de dados

**Solução:**
```bash
# 1. Verificar se backend está rodando
curl http://localhost:3000/api/health

# 2. Verificar logs de erro
tail -f backend/logs/error.log

# 3. Fazer logout/login no app para renovar token

# 4. Verificar conexão com banco
node backend/scripts/check-notification-preferences-table.js
```

## 📝 CHECKLIST DE VERIFICAÇÃO

Antes de reportar problema:

- [ ] Migration `add_coupons_only_preferences.sql` foi aplicada?
- [ ] Script de verificação passou sem erros?
- [ ] Backend foi reiniciado após correções?
- [ ] Logs mostram "ATUALIZANDO PREFERÊNCIAS"?
- [ ] Logs mostram "Preferências salvas com sucesso"?
- [ ] Dados aparecem no banco após salvar?
- [ ] App mostra mensagem de sucesso?
- [ ] Preferências persistem após fechar/abrir app?

## 🎯 RESUMO

### O que foi corrigido:
1. ✅ Modelo `NotificationPreference.upsert()` agora recebe `coupons_only` e `coupon_platforms`
2. ✅ Controller tem logs detalhados para debug
3. ✅ Script de verificação da tabela criado

### Como testar:
1. Executar script de verificação
2. Aplicar migration se necessário
3. Reiniciar backend
4. Testar no app
5. Verificar logs e banco

### Resultado esperado:
- ✅ App salva preferências sem erro
- ✅ Dados aparecem no banco
- ✅ Preferências persistem após fechar app
- ✅ Logs mostram processo completo
