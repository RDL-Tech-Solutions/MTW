# 📱 MTW Promo - Mobile App

## 🎯 Objetivo
Aplicativo mobile para usuários finais visualizarem produtos em promoção, cupons e gerenciarem favoritos.

---

## 🏗️ Arquitetura

### Stack Tecnológico
- **Framework**: React Native + Expo
- **Estilização**: NativeWind (Tailwind CSS para RN)
- **Navegação**: React Navigation
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Notificações**: Expo Notifications
- **Autenticação**: JWT + AsyncStorage
- **Ícones**: Expo Vector Icons / Lucide React Native

---

## 📱 Telas do App

### 1. **Autenticação**
- [ ] Splash Screen
- [ ] Login
- [ ] Registro
- [ ] Recuperar Senha

### 2. **Principal (Tab Navigator)**
- [ ] **Home** - Feed de produtos em destaque
- [ ] **Categorias** - Grid de categorias
- [ ] **Favoritos** - Produtos salvos
- [ ] **Perfil** - Dados do usuário

### 3. **Navegação Stack**
- [ ] Detalhes do Produto
- [ ] Lista de Produtos por Categoria
- [ ] Lista de Cupons
- [ ] Configurações
- [ ] Sobre o App

### 4. **VIP (Condicional)**
- [ ] Tela de Upgrade para VIP
- [ ] Benefícios VIP
- [ ] Produtos Exclusivos VIP

---

## 🎨 Design System

### Cores (Baseado no Admin)
```javascript
const colors = {
  primary: '#DC2626',      // Vermelho principal
  secondary: '#000000',    // Preto
  accent: '#EF4444',       // Vermelho claro
  background: '#F9FAFB',   // Cinza claro
  card: '#FFFFFF',         // Branco
  text: '#111827',         // Preto texto
  textMuted: '#6B7280',    // Cinza texto
  border: '#E5E7EB',       // Cinza borda
  success: '#10B981',      // Verde
  warning: '#F59E0B',      // Amarelo
  error: '#EF4444',        // Vermelho
}
```

### Componentes Base
- [ ] Button
- [ ] Card
- [ ] Input
- [ ] Badge
- [ ] Avatar
- [ ] Loading
- [ ] EmptyState
- [ ] ErrorBoundary

---

## 📂 Estrutura de Pastas

```
mobile-app/
├── src/
│   ├── components/
│   │   ├── common/          # Componentes reutilizáveis
│   │   ├── home/            # Componentes da Home
│   │   ├── product/         # Componentes de Produto
│   │   └── profile/         # Componentes de Perfil
│   ├── screens/
│   │   ├── auth/            # Telas de autenticação
│   │   ├── home/            # Tela Home
│   │   ├── categories/      # Telas de Categorias
│   │   ├── favorites/       # Tela de Favoritos
│   │   ├── profile/         # Tela de Perfil
│   │   └── product/         # Detalhes do Produto
│   ├── navigation/
│   │   ├── AppNavigator.js  # Navegação principal
│   │   ├── AuthNavigator.js # Navegação de auth
│   │   └── TabNavigator.js  # Bottom tabs
│   ├── services/
│   │   ├── api.js           # Cliente Axios
│   │   ├── auth.js          # Serviços de auth
│   │   └── storage.js       # AsyncStorage
│   ├── stores/
│   │   ├── authStore.js     # Estado de autenticação
│   │   ├── productStore.js  # Estado de produtos
│   │   └── favoriteStore.js # Estado de favoritos
│   ├── utils/
│   │   ├── constants.js     # Constantes
│   │   ├── helpers.js       # Funções auxiliares
│   │   └── validators.js    # Validações
│   ├── hooks/
│   │   ├── useAuth.js       # Hook de autenticação
│   │   └── useProducts.js   # Hook de produtos
│   └── theme/
│       ├── colors.js        # Cores do tema
│       ├── fonts.js         # Fontes
│       └── spacing.js       # Espaçamentos
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── app.json
├── package.json
├── tailwind.config.js
└── babel.config.js
```

---

## 🔌 Integração com API

### Endpoints Principais

#### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

#### Produtos
- `GET /api/products` - Listar produtos
- `GET /api/products/:id` - Detalhes do produto
- `GET /api/products/category/:id` - Produtos por categoria
- `POST /api/products/:id/click` - Registrar clique

#### Categorias
- `GET /api/categories` - Listar categorias

#### Cupons
- `GET /api/coupons` - Listar cupons ativos
- `GET /api/coupons/:id` - Detalhes do cupom

#### Favoritos
- `GET /api/users/favorites` - Listar favoritos
- `POST /api/users/favorites/:productId` - Adicionar favorito
- `DELETE /api/users/favorites/:productId` - Remover favorito

#### Usuário
- `GET /api/users/me` - Dados do usuário
- `PUT /api/users/me` - Atualizar perfil
- `POST /api/users/push-token` - Registrar token de notificação

---

## 🔔 Notificações Push

### Tipos de Notificação
1. **Novo Produto em Destaque**
2. **Novo Cupom Disponível**
3. **Produto Favorito em Promoção**
4. **Lembrete de Cupom Expirando**

### Implementação
```javascript
// Registrar token
const registerForPushNotifications = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  
  const token = await Notifications.getExpoPushTokenAsync();
  await api.post('/users/push-token', { token: token.data });
};
```

---

## 🎯 Funcionalidades Principais

### 1. Home Feed
- [x] Lista de produtos em destaque
- [x] Filtro por categoria
- [x] Busca de produtos
- [x] Pull to refresh
- [x] Infinite scroll
- [x] Badge de desconto
- [x] Botão de favoritar

### 2. Detalhes do Produto
- [x] Imagem do produto
- [x] Nome e descrição
- [x] Preço original e com desconto
- [x] Percentual de desconto
- [x] Plataforma (Shopee/ML)
- [x] Botão "Ver Oferta" (abre link afiliado)
- [x] Botão de favoritar
- [x] Produtos relacionados

### 3. Categorias
- [x] Grid de categorias com ícones
- [x] Contador de produtos
- [x] Navegação para lista de produtos

### 4. Favoritos
- [x] Lista de produtos favoritos
- [x] Remover favorito
- [x] Empty state quando vazio
- [x] Sincronização com backend

### 5. Perfil
- [x] Dados do usuário
- [x] Status VIP
- [x] Botão de upgrade para VIP
- [x] Configurações
- [x] Notificações
- [x] Logout

---

## 🎨 UI/UX

### Princípios
1. **Simplicidade** - Interface limpa e intuitiva
2. **Performance** - Carregamento rápido
3. **Feedback Visual** - Animações suaves
4. **Acessibilidade** - Suporte a leitores de tela
5. **Responsividade** - Adaptar a diferentes tamanhos

### Animações
- Fade in ao carregar
- Slide in ao navegar
- Scale ao pressionar
- Skeleton loading

---

## 📦 Dependências Principais

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "@react-navigation/stack": "^6.3.0",
    "nativewind": "^4.0.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "expo-notifications": "~0.28.0",
    "expo-linking": "~6.3.0",
    "@expo/vector-icons": "^14.0.0",
    "react-native-safe-area-context": "^4.10.0",
    "react-native-screens": "^3.31.0",
    "@react-native-async-storage/async-storage": "^1.23.0"
  }
}
```

---

## 🚀 Roadmap

### Fase 1: Setup (Hoje)
- [x] Criar projeto Expo
- [ ] Configurar NativeWind
- [ ] Setup navegação
- [ ] Configurar API client
- [ ] Criar estrutura de pastas

### Fase 2: Autenticação
- [ ] Tela de Login
- [ ] Tela de Registro
- [ ] Gerenciamento de token
- [ ] Proteção de rotas

### Fase 3: Telas Principais
- [ ] Home Feed
- [ ] Categorias
- [ ] Favoritos
- [ ] Perfil

### Fase 4: Detalhes e Funcionalidades
- [ ] Detalhes do Produto
- [ ] Sistema de Favoritos
- [ ] Busca
- [ ] Filtros

### Fase 5: VIP e Extras
- [ ] Tela VIP
- [ ] Notificações Push
- [ ] Compartilhamento
- [ ] Deep Links

### Fase 6: Polimento
- [ ] Animações
- [ ] Loading states
- [ ] Error handling
- [ ] Testes

---

## 📱 Testes

### Dispositivos Alvo
- iOS 13+
- Android 8.0+

### Ferramentas
- Expo Go (desenvolvimento)
- EAS Build (produção)

---

## 🎯 Métricas de Sucesso

1. **Performance**
   - Tempo de carregamento < 2s
   - FPS > 60

2. **Engajamento**
   - Taxa de cliques em produtos
   - Produtos favoritados
   - Tempo na aplicação

3. **Conversão**
   - Cliques em links de afiliado
   - Uso de cupons

---

**Vamos começar!** 🚀
