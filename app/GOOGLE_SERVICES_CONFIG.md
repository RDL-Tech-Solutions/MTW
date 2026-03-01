# Configuração do Google Services (Firebase)

## ✅ Configuração Completa

### 1. Arquivo google-services.json
- **Localização**: `app/google-services.json` (raiz do projeto)
- **Status**: ✅ Configurado
- **Project ID**: precocerto-60872
- **Package Name**: com.precocerto.app

### 2. Configuração no app.json
```json
"android": {
  "googleServicesFile": "./google-services.json",
  ...
}
```
- **Status**: ✅ Configurado

### 3. EAS Build
O EAS Build automaticamente:
- Copia o `google-services.json` para `android/app/` durante o build
- Configura o plugin do Google Services no Gradle
- Integra com Firebase Cloud Messaging (FCM)

### 4. Recursos do Android
Adicionados os recursos necessários para notificações:
- ✅ `notification_icon_color` em `values/colors.xml`
- ✅ `notification_icon_color` em `values-night/colors.xml`

## Como Fazer Build

### Build de Desenvolvimento
```bash
eas build --profile development --platform android
```

### Build de Preview
```bash
eas build --profile preview --platform android
```

### Build de Produção
```bash
eas build --profile production --platform android
```

## Integração com OneSignal

O OneSignal usa o Firebase Cloud Messaging (FCM) para enviar notificações push no Android. Com o `google-services.json` configurado:

1. ✅ FCM está habilitado
2. ✅ OneSignal pode enviar notificações via FCM
3. ✅ Cor do ícone de notificação configurada (#DC2626)

## Verificação

Para verificar se está tudo correto:
1. O arquivo `google-services.json` deve estar na raiz do projeto
2. O `app.json` deve ter a propriedade `googleServicesFile`
3. O package name deve corresponder: `com.precocerto.app`

## Notas Importantes

- ⚠️ Não commitar o `google-services.json` em repositórios públicos
- ⚠️ Usar variáveis de ambiente no EAS Build para produção
- ✅ O arquivo já está configurado para o projeto PreçoCerto

## Próximos Passos

1. Fazer build com EAS: `eas build --profile preview --platform android`
2. Testar notificações push no dispositivo
3. Verificar logs do OneSignal para confirmar integração
