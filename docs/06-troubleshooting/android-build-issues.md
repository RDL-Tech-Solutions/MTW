# 🔧 Problemas de Build Android

Guia completo para resolver problemas de build do app Android.

## 📋 Problema Conhecido: NDK 27 + Expo SDK 54

### Sintomas

```
BUILD FAILED in 2m 54s

ld: error: undefined symbol: __cxa_guard_acquire
ld: error: undefined symbol: std::runtime_error
ld: error: undefined symbol: operator new
ld: error: undefined symbol: operator delete
```

### Causa

Incompatibilidade entre:
- **NDK 27.1.12297006** (mais recente)
- **Expo SDK 54**
- **react-native-worklets** e **expo-modules-core**

O NDK 27 mudou a forma como linka bibliotecas C++, causando erros de símbolos indefinidos.

## ✅ Solução Recomendada: Expo Go

Para desenvolvimento, use **Expo Go** ao invés de build nativo:

### 1. Instalar Expo Go

- **Android**: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS**: [App Store](https://apps.apple.com/app/expo-go/id982107779)

### 2. Iniciar Desenvolvimento

```bash
cd app
npm start
```

### 3. Escanear QR Code

1. Abra o Expo Go no celular
2. Escaneie o QR code exibido no terminal
3. App será carregado automaticamente

### Vantagens

- ✅ Sem necessidade de build nativo
- ✅ Hot reload instantâneo
- ✅ Funciona em Android e iOS
- ✅ Sem problemas de NDK
- ✅ Desenvolvimento mais rápido

### Limitações

- ⚠️ Não suporta módulos nativos customizados
- ⚠️ Não é para produção

## 🚀 Solução para Produção: EAS Build

Para builds de produção, use **EAS Build** (build na nuvem):

### 1. Instalar EAS CLI

```bash
npm install -g eas-cli
```

### 2. Login no Expo

```bash
eas login
```

### 3. Configurar Projeto

```bash
cd app
eas build:configure
```

### 4. Build Android

```bash
eas build --platform android
```

### 5. Build iOS

```bash
eas build --platform ios
```

### Vantagens

- ✅ Build na nuvem (sem problemas locais)
- ✅ Suporta todos os módulos nativos
- ✅ Gera APK/AAB para produção
- ✅ Sem necessidade de Android Studio
- ✅ Sem problemas de NDK

### Custos

- **Gratuito**: 30 builds/mês
- **Pago**: Builds ilimitados ($29/mês)

## 🔧 Solução Alternativa: Downgrade NDK

Se precisar fazer build local, faça downgrade do NDK:

### 1. Abrir Android Studio

1. Abra Android Studio
2. Vá em **Tools** → **SDK Manager**
3. Aba **SDK Tools**
4. Marque **Show Package Details**

### 2. Instalar NDK 26

1. Expanda **NDK (Side by side)**
2. Desmarque NDK 27.x
3. Marque **26.3.11579264**
4. Clique em **Apply**

### 3. Configurar NDK no Projeto

Edite `app/android/local.properties`:

```properties
ndk.dir=C\:\\Users\\SeuUsuario\\AppData\\Local\\Android\\Sdk\\ndk\\26.3.11579264
```

### 4. Limpar e Rebuildar

```bash
cd app/android
./gradlew clean
cd ..
npm run android
```

### Desvantagens

- ⚠️ Usa versão antiga do NDK
- ⚠️ Pode ter problemas futuros
- ⚠️ Não é solução permanente

## 🧪 Teste de Build

### Verificar Configuração

```bash
cd app/android
./gradlew --version
```

### Limpar Cache

```bash
cd app/android
./gradlew clean
./gradlew cleanBuildCache
```

### Build Debug

```bash
cd app
npm run android
```

### Build Release

```bash
cd app/android
./gradlew assembleRelease
```

## 🔍 Troubleshooting

### Erro: "NDK not found"

**Solução**:
1. Instale NDK via Android Studio SDK Manager
2. Configure `ndk.dir` em `local.properties`

### Erro: "Gradle build failed"

**Solução**:
1. Limpe cache: `./gradlew clean`
2. Delete pasta `android/.gradle`
3. Delete pasta `android/app/build`
4. Tente novamente

### Erro: "Unable to load script"

**Solução**:
1. Inicie o Metro bundler: `npm start`
2. Aguarde "Bundling complete"
3. Tente novamente

### Build funciona mas app crasha

**Solução**:
1. Verifique logs: `adb logcat`
2. Verifique se todas as dependências estão instaladas
3. Limpe e rebuilde: `./gradlew clean && npm run android`

## 📊 Comparação de Soluções

| Solução | Desenvolvimento | Produção | Dificuldade | Recomendado |
|---------|----------------|----------|-------------|-------------|
| **Expo Go** | ✅ Excelente | ❌ Não | Fácil | ✅ Sim |
| **EAS Build** | ⚠️ Lento | ✅ Excelente | Fácil | ✅ Sim |
| **NDK Downgrade** | ✅ Bom | ✅ Bom | Médio | ⚠️ Temporário |
| **Build Local** | ❌ Problemático | ❌ Problemático | Difícil | ❌ Não |

## 📚 Documentação Adicional

- [Expo Go Documentation](https://docs.expo.dev/get-started/expo-go/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Android NDK Documentation](https://developer.android.com/ndk)
- [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting)

## ✅ Checklist

### Para Desenvolvimento
- [ ] Expo Go instalado no celular
- [ ] `npm start` executado
- [ ] QR code escaneado
- [ ] App carregado com sucesso

### Para Produção
- [ ] EAS CLI instalado
- [ ] Login no Expo realizado
- [ ] Projeto configurado (`eas build:configure`)
- [ ] Build executado (`eas build --platform android`)
- [ ] APK/AAB baixado e testado

### Para Build Local (Alternativo)
- [ ] NDK 26 instalado
- [ ] `local.properties` configurado
- [ ] Cache limpo
- [ ] Build executado com sucesso

---

**Próximo**: [Troubleshooting Geral](./README.md)
