# Exemplos de Uso da API OneSignal

## 📋 Visão Geral

Este documento contém exemplos práticos de uso da API OneSignal implementada no backend.

## 🔐 Autenticação

Todas as requisições requerem autenticação via JWT token:

```bash
# Obter token (login)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "senha123"
  }'

# Resposta:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}

# Usar token nas requisições
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 📊 Status e Estatísticas

### Verificar Status do OneSignal

```bash
curl -X GET http://localhost:3000/api/onesignal/status \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta**:
```json
{
  "success": true,
  "status": {
    "enabled": true,
    "initialized": true,
    "app_id": "12345678...",
    "has_api_key": true
  }
}
```

### Obter Estatísticas de Migração

```bash
curl -X GET http://localhost:3000/api/onesignal/migration/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta**:
```json
{
  "success": true,
  "stats": {
    "total_with_tokens": 1000,
    "total_expo_tokens": 800,
    "total_migrated": 500,
    "pending_migration": 300
  }
}
```

## 🔄 Migração de Usuários

### Migração em Dry Run (Simulação)

```bash
curl -X POST http://localhost:3000/api/onesignal/migration/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": true,
    "limit": 10
  }'
```

**Resposta**:
```json
{
  "success": true,
  "total": 10,
  "migrated": 10,
  "failed": 0,
  "skipped": 0
}
```

### Migração em Produção

```bash
# Migrar todos os usuários
curl -X POST http://localhost:3000/api/onesignal/migration/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": false
  }'

# Migrar com limite
curl -X POST http://localhost:3000/api/onesignal/migration/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": false,
    "limit": 100
  }'
```

### Migrar Usuário Específico

```bash
curl -X POST http://localhost:3000/api/onesignal/migration/user/123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": false
  }'
```

**Resposta**:
```json
{
  "success": true,
  "user_id": 123,
  "player_id": "abc123-def456-ghi789"
}
```

### Reverter Migração de Usuário

```bash
curl -X POST http://localhost:3000/api/onesignal/migration/rollback/123 \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta**:
```json
{
  "success": true,
  "user_id": 123
}
```

### Limpar Dados Antigos

```bash
curl -X POST http://localhost:3000/api/onesignal/migration/cleanup \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta**:
```json
{
  "success": true
}
```

## 📤 Envio de Notificações

### Notificação de Teste

```bash
curl -X POST http://localhost:3000/api/onesignal/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123",
    "title": "🧪 Teste OneSignal",
    "message": "Esta é uma notificação de teste"
  }'
```

**Resposta**:
```json
{
  "success": true,
  "notification_id": "abc123-def456",
  "recipients": 1
}
```

### Notificação Simples

```javascript
// No código do backend
import oneSignalService from './services/oneSignalService.js';

const result = await oneSignalService.sendToUser({
  external_id: '123',
  title: 'Nova Promoção!',
  message: 'Confira as ofertas de hoje',
  data: {
    type: 'promo',
    screen: 'Home'
  }
});
```

### Notificação com Imagem

```javascript
const result = await oneSignalService.sendToUser({
  external_id: '123',
  title: '🔥 Oferta Imperdível!',
  message: 'iPhone 13 com 30% OFF',
  image: 'https://example.com/iphone13.jpg',
  data: {
    type: 'product',
    productId: 456,
    screen: 'ProductDetails'
  }
});
```

### Notificação com Botões

```javascript
const result = await oneSignalService.sendToUser({
  external_id: '123',
  title: '💰 Cupom Disponível!',
  message: 'SAVE20 - 20% OFF em toda loja',
  buttons: [
    { id: 'view', text: 'Ver Cupom' },
    { id: 'dismiss', text: 'Depois' }
  ],
  data: {
    type: 'coupon',
    couponId: 789,
    screen: 'CouponDetails'
  }
});
```

### Notificação para Múltiplos Usuários

```javascript
const result = await oneSignalService.sendToMultiple(
  ['123', '456', '789'], // external_ids
  {
    title: '🎉 Novidade!',
    message: 'Novo recurso disponível no app',
    data: {
      type: 'announcement',
      screen: 'Announcements'
    }
  }
);

console.log(`Enviadas: ${result.total_sent}`);
console.log(`Falharam: ${result.total_failed}`);
```

### Notificação para Segmento

```javascript
const result = await oneSignalService.sendToSegment(
  'VIP Users', // nome do segmento
  {
    title: '👑 Oferta VIP',
    message: 'Acesso antecipado às promoções',
    priority: 'high'
  }
);
```

### Notificação com Filtros

```javascript
// Enviar para usuários com tag específica
const result = await oneSignalService.sendWithFilters(
  [
    { field: 'tag', key: 'category', relation: '=', value: 'electronics' },
    { operator: 'AND' },
    { field: 'tag', key: 'vip', relation: '=', value: 'true' }
  ],
  {
    title: '📱 Eletrônicos VIP',
    message: 'Ofertas exclusivas para você',
    priority: 'high'
  }
);
```

## 📊 Estatísticas de Notificações

### Obter Estatísticas

```bash
curl -X GET http://localhost:3000/api/onesignal/notification/abc123-def456/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta**:
```json
{
  "success": true,
  "stats": {
    "id": "abc123-def456",
    "successful": 950,
    "failed": 50,
    "errored": 0,
    "converted": 120,
    "remaining": 0,
    "queued_at": "2026-02-27T10:00:00Z",
    "send_after": "2026-02-27T10:00:00Z",
    "completed_at": "2026-02-27T10:05:00Z"
  }
}
```

### Cancelar Notificação Agendada

```bash
curl -X DELETE http://localhost:3000/api/onesignal/notification/abc123-def456 \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta**:
```json
{
  "success": true,
  "notification_id": "abc123-def456"
}
```

## 🎯 Casos de Uso Específicos

### Caso 1: Notificar Novo Cupom

```javascript
import oneSignalService from './services/oneSignalService.js';
import User from './models/User.js';

// Buscar usuários interessados
const users = await User.findByCategory('electronics');

// Enviar notificação
const result = await oneSignalService.notifyNewCoupon(users, {
  id: 123,
  code: 'TECH20',
  discount_value: 20,
  discount_type: 'percentage'
});

console.log(`Notificações enviadas: ${result.total_sent}`);
```

### Caso 2: Notificar Queda de Preço

```javascript
const users = await User.findByFavoriteProduct(productId);

const result = await oneSignalService.notifyPriceDrop(
  users,
  product,
  oldPrice: 1000,
  newPrice: 800
);
```

### Caso 3: Notificar Cupom Expirando

```javascript
const users = await User.findWithUnusedCoupon(couponId);

const result = await oneSignalService.notifyExpiringCoupon(
  users,
  coupon,
  daysLeft: 1
);
```

### Caso 4: Notificação Personalizada

```javascript
const users = await User.findVIPUsers();

const result = await oneSignalService.sendCustomNotification(
  users,
  '👑 Oferta Exclusiva VIP',
  'Acesso antecipado às promoções de Black Friday',
  {
    type: 'vip_offer',
    screen: 'VIPOffers',
    offer_id: 999
  },
  {
    priority: 'high',
    image: 'https://example.com/vip-offer.jpg'
  }
);
```

## 🏷️ Gerenciamento de Tags

### Definir Tags de Usuário

```javascript
// No app mobile
import { useOneSignalStore } from './stores/oneSignalStore';

const { setUserTags } = useOneSignalStore();

// Definir tags
await setUserTags({
  category: 'electronics',
  vip: 'true',
  location: 'SP',
  language: 'pt-BR'
});
```

### Remover Tags

```javascript
const { deleteUserTags } = useOneSignalStore();

await deleteUserTags(['vip', 'location']);
```

## 📱 Integração no App

### Inicializar OneSignal

```javascript
// App.js
import { useOneSignalStore } from './src/stores/oneSignalStore';

function App() {
  const { initialize } = useOneSignalStore();

  useEffect(() => {
    initialize();
  }, []);

  return <AppNavigator />;
}
```

### Registrar Usuário

```javascript
// Após login
import { useOneSignalStore } from './stores/oneSignalStore';
import { useAuthStore } from './stores/authStore';

const { registerUser } = useOneSignalStore();
const { user } = useAuthStore();

await registerUser(user.id);
```

### Configurar Navegação

```javascript
// AppNavigator.js
import { useOneSignalStore } from './stores/oneSignalStore';

function AppNavigator() {
  const navigation = useNavigation();

  useEffect(() => {
    // Configurar handler de navegação
    global.notificationNavigationHandler = (data) => {
      const { screen, productId, couponId } = data;

      if (screen === 'ProductDetails' && productId) {
        navigation.navigate('ProductDetails', { id: productId });
      } else if (screen === 'CouponDetails' && couponId) {
        navigation.navigate('CouponDetails', { id: couponId });
      }
    };
  }, [navigation]);

  return <Stack.Navigator>...</Stack.Navigator>;
}
```

## 🔍 Debug e Troubleshooting

### Verificar Device State

```javascript
const { getDeviceState } = useOneSignalStore();

const deviceState = await getDeviceState();
console.log('Device State:', deviceState);

// Resposta:
{
  userId: 'abc123',
  pushToken: 'def456',
  emailUserId: null,
  emailAddress: null,
  isSubscribed: true,
  isPushDisabled: false,
  hasNotificationPermission: true
}
```

### Logs Detalhados

```javascript
// Habilitar logs detalhados (desenvolvimento)
OneSignal.setLogLevel(6, 0); // 6 = VERBOSE, 0 = NONE

// Desabilitar logs (produção)
OneSignal.setLogLevel(0, 0);
```

### Testar Permissões

```javascript
const { getPermissionStatus, requestPermission } = useOneSignalStore();

const hasPermission = await getPermissionStatus();
console.log('Has Permission:', hasPermission);

if (!hasPermission) {
  const granted = await requestPermission();
  console.log('Permission Granted:', granted);
}
```

## 📚 Referências

- [OneSignal REST API](https://documentation.onesignal.com/reference/create-notification)
- [OneSignal React Native SDK](https://documentation.onesignal.com/docs/react-native-sdk-setup)
- [OneSignal Segments](https://documentation.onesignal.com/docs/segmentation)
- [OneSignal Tags](https://documentation.onesignal.com/docs/add-user-data-tags)

---

**Última atualização**: 2026-02-27
**Versão**: 1.0
