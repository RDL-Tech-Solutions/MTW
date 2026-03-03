# 🔔 Sistema de Notificações Personalizadas

## ✅ Implementado

Sistema completo de configuração de notificações push com segmentação por:
- Categorias de interesse
- Palavras-chave
- Nomes de produtos específicos
- Ativação/desativação de push e email

## 📱 Tela de Configurações (App)

### Arquivo Criado
`app/src/screens/settings/NotificationSettingsScreen.js`

### Funcionalidades

#### 1. Status das Notificações
- Permissão do sistema (concedida/negada)
- Token FCM registrado (sim/não)
- Botão para ativar notificações

#### 2. Configurações Gerais
- **Notificações Push**: Ativar/desativar notificações no dispositivo
- **Notificações por Email**: Receber resumo diário por email

#### 3. Categorias de Interesse
- Lista de todas as categorias disponíveis
- Checkbox para selecionar/desselecionar
- Se nenhuma categoria selecionada = recebe de todas

#### 4. Palavras-chave
- Campo de texto para adicionar palavras-chave
- Tags removíveis para cada palavra
- Exemplos: "iPhone", "Samsung", "Notebook"
- Notificações de produtos que contenham essas palavras

#### 5. Produtos Específicos
- Campo de texto para adicionar nomes de produtos
- Tags removíveis para cada produto
- Exemplos: "iPhone 15", "Galaxy S24"
- Notificações de produtos com esses nomes

#### 6. Botão Salvar
- Salva todas as preferências no backend
- Feedback visual de sucesso/erro

## 🔧 Backend

### Arquivos Criados/Modificados

#### 1. `backend/src/services/notificationSegmentationService.js` (NOVO)
Serviço de segmentação de usuários para notificações.

**Métodos**:
- `getUsersForProduct(product)` - Segmenta usuários para produto
- `getUsersForCoupon(coupon)` - Segmenta usuários para cupom
- `shouldReceiveProductNotification(product, preferences)` - Verifica se deve receber
- `shouldReceiveCouponNotification(coupon, preferences)` - Verifica se deve receber
- `getSegmentationStats()` - Estatísticas de segmentação

**Lógica de Segmentação**:
1. Se usuário não tem preferências → recebe TUDO (comportamento padrão)
2. Se usuário tem preferências → aplica filtros:
   - **Categoria**: Produto está na categoria selecionada?
   - **Palavra-chave**: Nome/descrição contém a palavra?
   - **Nome de produto**: Nome do produto corresponde?
3. Se qualquer filtro der match → envia notificação
4. Se nenhum filtro der match → não envia

#### 2. `backend/src/models/User.js` (MODIFICADO)
Adicionado método:
- `findAllWithFCMToken()` - Busca todos os usuários com FCM token

#### 3. `backend/src/services/autoSync/publishService.js` (MODIFICADO)
Função `notifyPush()` atualizada para usar o serviço de segmentação.

**Antes**: Lógica de segmentação inline (não considerava usuários sem preferências)  
**Depois**: Usa `notificationSegmentationService.getUsersForProduct()`

#### 4. `backend/src/services/coupons/couponNotificationService.js` (MODIFICADO)
Função `createPushNotifications()` atualizada para usar o serviço de segmentação.

**Antes**: Enviava para todos os usuários com FCM token  
**Depois**: Usa `notificationSegmentationService.getUsersForCoupon()`

## 📊 Fluxo de Notificações

### Produtos

```
1. Novo produto aprovado
   ↓
2. publishService.notifyPush(product)
   ↓
3. notificationSegmentationService.getUsersForProduct(product)
   ↓
4. Para cada usuário:
   - Busca preferências
   - Se não tem preferências → ENVIA
   - Se tem preferências → verifica filtros
   - Se push_enabled = false → NÃO ENVIA
   ↓
5. Cria notificações no banco
   ↓
6. Envia via FCM
   ↓
7. Marca como enviadas
```

### Cupons

```
1. Novo cupom publicado
   ↓
2. couponNotificationService.createPushNotifications(coupon)
   ↓
3. notificationSegmentationService.getUsersForCoupon(coupon)
   ↓
4. Para cada usuário:
   - Busca preferências
   - Se não tem preferências → ENVIA
   - Se tem preferências → verifica filtros
   - Se push_enabled = false → NÃO ENVIA
   ↓
5. Cria notificações no banco
   ↓
6. Envia via FCM
   ↓
7. Marca como enviadas
```

## 🎯 Exemplos de Uso

### Exemplo 1: Usuário sem Preferências
```
Usuário: João
Preferências: Nenhuma
Resultado: Recebe TODAS as notificações
```

### Exemplo 2: Usuário com Categoria
```
Usuário: Maria
Preferências:
  - Categorias: [Eletrônicos, Informática]
Resultado: Recebe apenas produtos dessas categorias
```

### Exemplo 3: Usuário com Palavras-chave
```
Usuário: Pedro
Preferências:
  - Palavras-chave: ["iPhone", "Samsung"]
Resultado: Recebe produtos que contenham "iPhone" ou "Samsung" no nome/descrição
```

### Exemplo 4: Usuário com Múltiplos Filtros
```
Usuário: Ana
Preferências:
  - Categorias: [Eletrônicos]
  - Palavras-chave: ["iPhone"]
  - Produtos: ["iPhone 15 Pro"]
Resultado: Recebe se:
  - Produto é da categoria Eletrônicos OU
  - Produto contém "iPhone" OU
  - Produto é "iPhone 15 Pro"
```

### Exemplo 5: Usuário com Push Desativado
```
Usuário: Carlos
Preferências:
  - push_enabled: false
Resultado: NÃO recebe notificações (independente de outros filtros)
```

## 🧪 Como Testar

### 1. No App

```bash
# Build nativo
cd app
npx expo prebuild
npx expo run:android

# No app:
1. Fazer login
2. Ir em Configurações → Notificações
3. Ativar notificações (se ainda não ativou)
4. Selecionar categorias de interesse
5. Adicionar palavras-chave (ex: "iPhone")
6. Adicionar produtos específicos (ex: "iPhone 15")
7. Clicar em "Salvar Preferências"
```

### 2. No Backend

```bash
# Iniciar backend
cd backend
npm start

# Em outro terminal, aprovar um produto
# O sistema vai segmentar automaticamente
```

### 3. Verificar Logs

```bash
# Ver logs de segmentação
pm2 logs backend | grep "🎯 Segmentando"

# Exemplo de log:
# 🎯 Segmentando usuários para produto: iPhone 15 Pro
#    5 usuários com FCM token
#    ✅ Match por categoria: 123
#    ✅ Match por palavra-chave: iPhone
#    ✅ 3 usuários segmentados
```

## 📈 Estatísticas

Para ver estatísticas de segmentação:

```javascript
// No backend
const notificationSegmentationService = require('./src/services/notificationSegmentationService.js').default;
const stats = await notificationSegmentationService.getSegmentationStats();
console.log(stats);

// Resultado:
// {
//   total_users: 10,
//   users_with_preferences: 5,
//   users_with_category_filter: 3,
//   users_with_keyword_filter: 2,
//   users_with_product_name_filter: 1,
//   users_without_filters: 5
// }
```

## 🎉 Benefícios

1. **Usuários recebem apenas o que interessa**
   - Menos spam
   - Maior engajamento
   - Melhor experiência

2. **Flexibilidade**
   - Múltiplos filtros combinados
   - Fácil de configurar
   - Comportamento padrão inteligente (sem filtros = recebe tudo)

3. **Performance**
   - Segmentação eficiente
   - Menos notificações enviadas
   - Economia de recursos

4. **Controle Total**
   - Usuário decide o que quer receber
   - Pode desativar completamente
   - Pode ser muito específico ou genérico

## 📝 Notas Importantes

1. **Comportamento Padrão**: Usuários sem preferências recebem TODAS as notificações
2. **Lógica OR**: Se qualquer filtro der match, envia notificação
3. **Push Desativado**: Se `push_enabled = false`, não envia (independente de filtros)
4. **Categorias Vazias**: Se não selecionar categorias, recebe de todas
5. **Palavras-chave**: Case-insensitive, busca em nome e descrição
6. **Produtos Específicos**: Busca parcial (ex: "iPhone" encontra "iPhone 15 Pro")

## 🚀 Próximos Passos

1. ✅ Deploy no servidor
2. ✅ Testar no app nativo
3. ✅ Monitorar logs de segmentação
4. ✅ Coletar feedback dos usuários
5. ✅ Ajustar lógica se necessário

---

**Status**: ✅ Implementado e testado  
**Pronto para**: Deploy em produção
