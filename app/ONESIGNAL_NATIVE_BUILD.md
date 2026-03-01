# 🔨 OneSignal - Build Nativo Necessário

## ⚠️ Importante

O OneSignal **não funciona no Expo Go**. Você precisa fazer um **development build** ou **standalone build** para usar o OneSignal.

## 📱 Status Atual

✅ Código OneSignal implementado e pronto
⚠️ OneSignal não disponível no Expo Go
💡 Solução: Fazer build nativo

## 🛠️ Opções de Build

### Opção 1: Development Build (Recomendado para Desenvolvimento)

Um development build é como o Expo Go, mas com suas dependências nativas incluídas.

#### Passo 1: Instalar EAS CLI

```bash
npm install -g eas-cli
```

#### Passo 2: Login no Expo

```bash
eas login
```

#### Passo 3: Configurar EAS

```bash
cd app
eas build:configure
```

#### Passo 4: Criar Development Build

**Para Android:**
```bash
eas build --profile development --platform android
```

**Para iOS:**
```bash
eas build --profile development --platform ios
```

#### Passo 5: Instalar no Dispositivo

Após o build completar, você receberá um link para baixar o APK (Android) ou instalar via TestFlight (iOS).

#### Passo 6: Executar

```bash
npx expo start --dev-client
```

### Opção 2: Prebuild Local (Mais Rápido)

Se você tem Android Studio ou Xcode instalado:

#### Passo 1: Gerar Arquivos Nativos

```bash
cd app
npx expo prebuild
```

Isso cria as pastas `android/` e `ios/` com código nativo.

#### Passo 2: Executar Build Local

**Android:**
```bash
npx expo run:android
```

**iOS:**
```bash
npx expo run:ios
```

### Opção 3: Standalone Build (Para Produção)

Para publicar na Play Store ou App Store:

```bash
# Android
eas build --profile production --platform android

# iOS
eas build --profile production --platform ios
```

## 📋 Configuração Adicional do OneSignal

### Android

1. **Adicionar plugin no app.json:**

```json
{
  "expo": {
    "plugins": [
      [
        "onesignal-expo-plugin",
        {
          "mode": "development"
        }
      ]
    ]
  }
}
```

2. **Instalar plugin:**

```bash
npm install onesignal-expo-plugin
```

### iOS

1. **Configurar certificados push:**
   - Acesse Apple Developer Console
   - Configure Push Notifications
   - Gere certificado .p12
   - Faça upload no OneSignal Dashboard

2. **Adicionar capabilities:**

O plugin do OneSignal adiciona automaticamente as capabilities necessárias.

## 🧪 Testando

### 1. Verificar se OneSignal está disponível:

Ao abrir o app, você deve ver:
```
🔔 Inicializando OneSignal...
✅ OneSignal inicializado com sucesso
```

Se ver:
```
⚠️ OneSignal não disponível (Expo Go)
```

Significa que você ainda está usando Expo Go.

### 2. Fazer Login:

- Faça login no app
- Você deve ver:
  ```
  🔐 Fazendo login no OneSignal: [user-id]
  ✅ Login no OneSignal realizado: [user-id]
  ```

### 3. Enviar Notificação de Teste:

No backend:
```bash
cd backend
npm run test:push-quick
```

### 4. Verificar Recebimento:

- Notificação deve aparecer no dispositivo
- Ao clicar, app deve abrir
- Logs devem mostrar o processamento

## 🔍 Troubleshooting

### "OneSignal não disponível"

**Causa:** Você está usando Expo Go

**Solução:** Faça um development build ou prebuild

### "Module not found: react-native-onesignal"

**Causa:** Dependência não instalada

**Solução:**
```bash
cd app
npm install react-native-onesignal
npx expo prebuild --clean
```

### Build falha no EAS

**Causa:** Configuração incorreta

**Solução:**
1. Verifique `eas.json`
2. Verifique `app.json`
3. Veja logs do build no dashboard EAS

### Notificações não chegam

**Causa:** Várias possíveis

**Soluções:**
1. Verifique permissões no dispositivo
2. Verifique se external_id está correto
3. Veja logs do OneSignal Dashboard
4. Teste notificação manual no dashboard

## 📝 Arquivos de Configuração

### eas.json (criar se não existir)

```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### app.json (adicionar plugins)

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "color": "#DC2626"
        }
      ],
      [
        "onesignal-expo-plugin",
        {
          "mode": "development"
        }
      ]
    ]
  }
}
```

## 🚀 Fluxo Recomendado

### Para Desenvolvimento:

1. ✅ Instalar `onesignal-expo-plugin`
2. ✅ Configurar `app.json`
3. ✅ Fazer development build com EAS
4. ✅ Instalar no dispositivo
5. ✅ Testar notificações

### Para Produção:

1. ✅ Configurar certificados (iOS)
2. ✅ Configurar Firebase (Android)
3. ✅ Fazer production build
4. ✅ Testar em staging
5. ✅ Publicar nas lojas

## 💡 Alternativa Temporária

Enquanto não faz o build nativo, você pode:

1. ✅ Testar o backend (já está funcionando)
2. ✅ Desenvolver outras features do app
3. ✅ Preparar UI de notificações
4. ✅ Implementar navegação

O código OneSignal já está pronto e funcionará assim que você fizer o build nativo!

## 📚 Recursos

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [OneSignal Expo Plugin](https://github.com/OneSignal/onesignal-expo-plugin)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [OneSignal React Native SDK](https://documentation.onesignal.com/docs/react-native-sdk-setup)

## ✅ Checklist

Antes de fazer o build:

- [ ] `onesignal-expo-plugin` instalado
- [ ] `app.json` configurado com plugins
- [ ] EAS CLI instalado
- [ ] Login no Expo realizado
- [ ] Certificados configurados (iOS)
- [ ] Firebase configurado (Android)
- [ ] Código OneSignal implementado ✅
- [ ] Backend configurado ✅

## 🎯 Próximo Passo

Execute:

```bash
cd app
npm install onesignal-expo-plugin
npx expo prebuild
npx expo run:android
```

Ou para build na nuvem:

```bash
eas build --profile development --platform android
```

Depois disso, o OneSignal funcionará perfeitamente! 🚀
