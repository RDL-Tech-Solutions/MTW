# 📱 MTW Promo - Mobile App

Aplicativo mobile React Native + Expo para o sistema MTW Promo.

## 🚀 Instalação

```bash
npm install
```

## 🏃 Executar

```bash
# Iniciar Expo
npx expo start

# Android
npx expo start --android

# iOS
npx expo start --ios

# Web
npx expo start --web
```

## 📦 Build

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Configurar projeto
eas build:configure

# Build Android
eas build --platform android

# Build iOS
eas build --platform ios
```

## 🎨 Estrutura

```
src/
├── components/      # Componentes reutilizáveis
├── screens/         # Telas do app
├── navigation/      # Configuração de navegação
├── services/        # API e serviços
├── stores/          # Estado global (Zustand)
├── utils/           # Utilitários
└── constants/       # Constantes
```

## 🔧 Configuração

Edite `app.json` para configurar:
- Nome do app
- Bundle identifier
- Ícones e splash screen
- Permissões

## 📝 Funcionalidades

- ✅ Navegação por tabs
- ✅ Listagem de produtos
- ✅ Sistema de favoritos
- ✅ Notificações push
- ✅ Copiar cupons
- ✅ Links de afiliados
- ✅ Modo VIP

## 🎯 Próximos Passos

1. Implementar autenticação
2. Conectar com API
3. Adicionar notificações push
4. Implementar favoritos
5. Criar telas de detalhes
6. Adicionar filtros e busca
