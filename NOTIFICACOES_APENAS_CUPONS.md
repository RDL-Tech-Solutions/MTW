# 🎯 Notificações Apenas de Cupons

## ✅ IMPLEMENTADO

Sistema de notificações com opção "Apenas Cupons" e filtro por plataforma.

## 📋 MUDANÇAS REALIZADAS

### 1. App - NotificationSettingsScreen.js

**Removido:**
- ❌ Notificações por Email

**Adicionado:**
- ✅ Toggle "Apenas Cupons"
- ✅ Seleção de plataformas de cupons (Amazon, Mercado Livre, Shopee, AliExpress, Magazine Luiza)
- ✅ Mensagem informativa sobre o comportamento

**Comportamento:**
- Quando "Apenas Cupons" está ATIVADO:
  - Usuário recebe notificações APENAS de cupons
  - Usuário recebe notificações de produtos que contenham palavras-chave configuradas
  - Pode filtrar cupons por plataforma

- Quando "Apenas Cupons" está DESATIVADO:
  - Usuário recebe notificações de TODOS os produtos e cupons
  - Filtros de categoria, palavras-chave e produtos específicos funcionam normalmente

### 2. App - SettingsScreen.js

**Removido:**
- ❌ Card completo de "Configurações Gerais" (que tinha Push e Email)

**Modificado:**
- ✅ "Notificações Push" agora é o ativador principal
- ✅ "Configurar Notificações" bloqueado quando push está desativado
- ✅ Badge "Bloqueado" quando push desativado
- ✅ Alert informando que precisa ativar push primeiro

**Comportamento:**
- Push desativado → "Configurar Notificações" mostra alert e não navega
- Push ativado → "Configurar Notificações" navega normalmente

### 3. Backend - Controller

**Arquivo**: `backend/src/controllers/notificationPreferenceController.js`

**Adicionado suporte para:**
- `coupons_only`: BOOLEAN
- `coupon_platforms`: ARRAY de strings

### 4. Backend - Banco de Dados

**Migração**: `backend/database/migrations/add_coupons_only_preferences.sql`

**Novos campos na tabela `notification_preferences`:**
```sql
coupons_only BOOLEAN DEFAULT FALSE
coupon_platforms TEXT[] DEFAULT '{}'
```

## 🎯 LÓGICA DE SEGMENTAÇÃO

### Cenário 1: Apenas Cupons DESATIVADO (padrão)

```javascript
{
  coupons_only: false,
  category_preferences: ['eletronicos'],
  keyword_preferences: ['iphone'],
  product_name_preferences: []
}
```

**Recebe:**
- ✅ Todos os produtos da categoria "eletrônicos"
- ✅ Todos os produtos com "iphone" no nome/descrição
- ✅ Todos os cupons

### Cenário 2: Apenas Cupons ATIVADO

```javascript
{
  coupons_only: true,
  coupon_platforms: ['amazon', 'mercadolivre'],
  keyword_preferences: ['iphone', 'samsung']
}
```

**Recebe:**
- ✅ Cupons da Amazon
- ✅ Cupons do Mercado Livre
- ✅ Produtos com "iphone" no nome/descrição
- ✅ Produtos com "samsung" no nome/descrição
- ❌ Outros produtos (mesmo que sejam da categoria configurada)

### Cenário 3: Apenas Cupons ATIVADO + Sem Plataformas

```javascript
{
  coupons_only: true,
  coupon_platforms: [],
  keyword_preferences: ['notebook']
}
```

**Recebe:**
- ✅ Cupons de TODAS as plataformas
- ✅ Produtos com "notebook" no nome/descrição
- ❌ Outros produtos

## 🔧 IMPLEMENTAÇÃO NO BACKEND

### Serviço de Segmentação

**Arquivo**: `backend/src/services/notificationSegmentationService.js`

**Método a atualizar**: `getUsersForProduct()` e `getUsersForCoupon()`

```javascript
// Exemplo de lógica para produtos
async getUsersForProduct(product) {
  const users = await User.findAllWithFCMToken();
  
  return users.filter(user => {
    // Se push desabilitado, não recebe
    if (!user.push_enabled) return false;
    
    // Se "apenas cupons" ativado
    if (user.coupons_only) {
      // Só recebe se produto tem palavra-chave configurada
      if (!user.keyword_preferences || user.keyword_preferences.length === 0) {
        return false;
      }
      
      const hasKeyword = user.keyword_preferences.some(keyword =>
        product.name.toLowerCase().includes(keyword.toLowerCase()) ||
        product.description?.toLowerCase().includes(keyword.toLowerCase())
      );
      
      return hasKeyword;
    }
    
    // Lógica normal de segmentação...
    return true;
  });
}

// Exemplo de lógica para cupons
async getUsersForCoupon(coupon) {
  const users = await User.findAllWithFCMToken();
  
  return users.filter(user => {
    // Se push desabilitado, não recebe
    if (!user.push_enabled) return false;
    
    // Se "apenas cupons" ativado E tem filtro de plataformas
    if (user.coupons_only && user.coupon_platforms && user.coupon_platforms.length > 0) {
      // Verificar se cupom é da plataforma configurada
      return user.coupon_platforms.includes(coupon.platform);
    }
    
    // Lógica normal de segmentação...
    return true;
  });
}
```

## 📱 INTERFACE DO USUÁRIO

### Tela de Configurações (SettingsScreen)

```
┌─────────────────────────────────────┐
│ NOTIFICAÇÕES                        │
├─────────────────────────────────────┤
│ 🔔 Notificações Push         [ON]   │
│    Ativar/desativar notificações    │
├─────────────────────────────────────┤
│ ⚙️ Configurar Notificações    →     │
│    Gerenciar preferências           │
└─────────────────────────────────────┘
```

**Se Push OFF:**
```
┌─────────────────────────────────────┐
│ 🔔 Notificações Push        [OFF]   │
├─────────────────────────────────────┤
│ ⚙️ Configurar Notificações    →     │
│    Ative as notificações...  🔒     │
│                          [Bloqueado]│
└─────────────────────────────────────┘
```

### Tela de Configuração de Notificações

```
┌─────────────────────────────────────┐
│ TIPO DE NOTIFICAÇÃO                 │
├─────────────────────────────────────┤
│ 🏷️ Apenas Cupons            [OFF]   │
│    Receber notificações apenas      │
│    de cupons                        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ PLATAFORMAS DE CUPONS               │
│ Selecione as plataformas...         │
├─────────────────────────────────────┤
│ ☐ 🛒 Amazon                         │
│ ☐ 🛍️ Mercado Livre                  │
│ ☐ 🛒 Shopee                         │
│ ☐ 🌐 AliExpress                     │
│ ☐ 🏪 Magazine Luiza                 │
└─────────────────────────────────────┘
```

## 🧪 COMO TESTAR

### 1. Aplicar Migração

```bash
cd backend
node scripts/apply-coupons-only-migration.js
```

### 2. Testar no App

1. Abra o app
2. Vá em Configurações
3. Ative "Notificações Push"
4. Toque em "Configurar Notificações"
5. Ative "Apenas Cupons"
6. Selecione plataformas (opcional)
7. Adicione palavras-chave
8. Salve

### 3. Testar Notificações

**Cenário 1: Aprovar Cupom**
```bash
# No admin, aprove um cupom da Amazon
# Usuário com "apenas cupons" + "amazon" selecionada deve receber
# Usuário com "apenas cupons" + "mercadolivre" NÃO deve receber
```

**Cenário 2: Aprovar Produto**
```bash
# No admin, aprove um produto com "iPhone" no nome
# Usuário com "apenas cupons" + palavra-chave "iphone" deve receber
# Usuário com "apenas cupons" SEM palavra-chave NÃO deve receber
# Usuário SEM "apenas cupons" deve receber normalmente
```

## 📊 CHECKLIST

- [x] Remover "Notificações por Email" do NotificationSettingsScreen
- [x] Adicionar toggle "Apenas Cupons"
- [x] Adicionar seleção de plataformas de cupons
- [x] Remover card "Configurações Gerais" do SettingsScreen
- [x] Transformar "Notificações Push" em ativador principal
- [x] Bloquear "Configurar Notificações" quando push desativado
- [x] Adicionar badge "Bloqueado"
- [x] Adicionar alert informativo
- [x] Atualizar controller do backend
- [x] Criar migração SQL
- [x] Criar script de migração
- [ ] Atualizar `notificationSegmentationService.js` (próximo passo)
- [ ] Testar fluxo completo

## 🎯 PRÓXIMOS PASSOS

1. Atualizar `notificationSegmentationService.js` para implementar a lógica de "apenas cupons"
2. Testar segmentação com diferentes cenários
3. Validar que notificações chegam corretamente

---

**Data**: 2026-03-04  
**Status**: Interface implementada, aguardando atualização do serviço de segmentação

