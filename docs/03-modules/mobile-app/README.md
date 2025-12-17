# 📱 App Mobile

Documentação completa do aplicativo mobile MTW Promo.

## 📋 Visão Geral

O app mobile é uma aplicação React Native construída com Expo, permitindo que usuários visualizem produtos, cupons e gerenciem favoritos.

## 🏗️ Estrutura

```
mobile-app/
├── src/
│   ├── components/      # Componentes reutilizáveis
│   ├── screens/         # Telas da aplicação
│   ├── navigation/      # Navegação
│   ├── services/        # Serviços (API, Storage)
│   ├── stores/         # Estado global (Zustand)
│   └── theme/          # Tema e cores
```

## 📱 Telas

### Autenticação
- **LoginScreen** - Login
- **RegisterScreen** - Registro

### Principal (Tabs)
- **HomeScreen** - Feed de produtos
- **CategoriesScreen** - Categorias
- **FavoritesScreen** - Favoritos
- **ProfileScreen** - Perfil

### Detalhes
- **ProductDetailsScreen** - Detalhes do produto

## 🎨 Design

### Cores
- **Primary**: #DC2626 (Vermelho)
- **Secondary**: #000000 (Preto)
- **Background**: #F9FAFB (Cinza claro)
- **Card**: #FFFFFF (Branco)

### Componentes
- **ProductCard** - Card de produto
- **Button** - Botões
- **Input** - Campos de entrada

## 🔐 Autenticação

O app usa JWT para autenticação. O token é armazenado no AsyncStorage.

### Fluxo
1. Usuário faz login
2. Recebe `accessToken`
3. Token é salvo no AsyncStorage
4. Token é enviado em todas as requisições

## 📦 Funcionalidades

### Produtos
- Visualizar produtos em promoção
- Buscar produtos
- Filtrar por categoria
- Ver detalhes do produto
- Favoritar produtos

### Cupons
- Visualizar cupons ativos
- Copiar código do cupom
- Ver detalhes do cupom

### Favoritos
- Adicionar/remover favoritos
- Visualizar lista de favoritos

### Perfil
- Ver dados do usuário
- Editar perfil
- Configurações

## 🔔 Notificações Push

O app suporta notificações push via Expo Notifications.

### Configuração
1. Configure `expo_access_token` no backend
2. Registre o token no backend
3. Receba notificações

## 🛠️ Tecnologias

- **React Native** - Framework
- **Expo** SDK 54 - Plataforma
- **React Navigation** - Navegação
- **NativeWind** - Estilização (Tailwind)
- **Zustand** - Estado global
- **Axios** - HTTP client
- **Expo Notifications** - Notificações

## 🚀 Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar Expo
npm start

# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## 📱 Build

### Android
```bash
eas build --platform android
```

### iOS
```bash
eas build --platform ios
```

## 📚 Mais Informações

- [Backend API](./backend/README.md)
- [API Reference](../05-api-reference/README.md)
- [Troubleshooting](../06-troubleshooting/README.md)

---

**Próximo**: [Integrações](../04-integrations/README.md)





