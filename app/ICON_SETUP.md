# 🎨 Configuração de Ícones do App

## ✅ Ícones Configurados

Os ícones do app foram configurados usando as imagens da pasta `AppIcons/`.

### Arquivos Copiados:

1. **Ícone Principal (iOS/Android)**
   - Origem: `AppIcons/playstore.png` (512x512px)
   - Destino: `app/assets/icon.png`
   - Uso: Ícone principal do app em todas as plataformas

2. **Ícone Adaptativo Android**
   - Origem: `AppIcons/android/mipmap-xxxhdpi/ic_launcher.png`
   - Destino: `app/assets/adaptive-icon.png`
   - Uso: Foreground do adaptive icon no Android

### Configuração no app.json:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "ios": {
      "icon": "./assets/icon.png"
    },
    "android": {
      "icon": "./assets/icon.png",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#DC2626"
      }
    },
    "web": {
      "favicon": "./assets/icon.png"
    }
  }
}
```

## 📱 Ícones Disponíveis na Pasta AppIcons

### Android (Mipmaps)
- `mipmap-mdpi/` - 48x48px
- `mipmap-hdpi/` - 72x72px
- `mipmap-xhdpi/` - 96x96px
- `mipmap-xxhdpi/` - 144x144px
- `mipmap-xxxhdpi/` - 192x192px

### iOS (Assets.xcassets)
- Todos os tamanhos necessários para iOS (20pt a 1024pt)
- Configurados no `AppIcon.appiconset/`

### Stores
- `playstore.png` - 512x512px (Google Play Store)
- `appstore.png` - 1024x1024px (Apple App Store)

## 🚀 Como Gerar Builds com os Ícones

### Android APK/AAB

```bash
# Development
eas build --profile development --platform android

# Preview
eas build --profile preview --platform android

# Production
eas build --profile production --platform android
```

### iOS

```bash
# Development
eas build --profile development --platform ios

# Production
eas build --profile production --platform ios
```

## ✨ O que Acontece Automaticamente

Quando você executa `eas build`, o Expo:

1. ✅ Lê as configurações do `app.json`
2. ✅ Usa o `icon.png` como ícone base
3. ✅ Gera automaticamente todos os tamanhos necessários para iOS
4. ✅ Usa o `adaptive-icon.png` para o Android adaptive icon
5. ✅ Aplica o `backgroundColor` no adaptive icon
6. ✅ Inclui os ícones no APK/AAB/IPA final

## 🔄 Para Atualizar os Ícones

Se você quiser mudar os ícones no futuro:

1. Substitua os arquivos em `app/assets/`:
   - `icon.png` (512x512px ou maior)
   - `adaptive-icon.png` (para Android)

2. Execute um novo build:
   ```bash
   eas build --profile production --platform all
   ```

## 📝 Notas Importantes

- O Expo gera automaticamente todos os tamanhos necessários
- Não é necessário copiar manualmente os mipmaps do Android
- O adaptive icon do Android usa o foreground + backgroundColor
- Para iOS, o Expo redimensiona automaticamente o ícone principal
- Os ícones são incluídos automaticamente em todos os builds (APK, AAB, IPA)

## 🎯 Resultado

Agora, quando você gerar um APK, AAB ou IPA:
- ✅ O ícone correto aparecerá na tela inicial
- ✅ O adaptive icon funcionará no Android 8+
- ✅ Todos os tamanhos estarão corretos
- ✅ O ícone aparecerá nas lojas (Play Store / App Store)
