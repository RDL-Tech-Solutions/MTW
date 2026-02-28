# Guia de Configuração do OneSignal

## 📋 Visão Geral

Este guia detalha o processo completo de configuração do OneSignal para substituir o Expo Notifications no sistema PreçoCerto.

## 🎯 Pré-requisitos

- Conta no OneSignal (gratuita)
- Acesso ao Firebase Console (para Android)
- Acesso ao Apple Developer (para iOS - opcional)
- Node.js 18+ instalado
- Acesso ao código-fonte do backend e app

## 📱 Parte 1: Configuração no OneSignal Dashboard

### 1.1 Criar Conta e App

1. Acesse [https://onesignal.com](https://onesignal.com)
2. Crie uma conta gratuita
3. Clique em "New App/Website"
4. Nome do app: "PreçoCerto"
5. Selecione plataformas: **Mobile App**

### 1.2 Configurar Android (Firebase)

#### Passo 1: Firebase Console

1. Acesse [https://console.firebase.google.com](https://console.firebase.google.com)
2. Crie um novo projeto ou use existente
3. Adicione um app Android:
   - Package name: `com.precocerto.app`
   - Baixe o arquivo `google-services.json`

#### Passo 2: Obter Server Key

1. No Firebase Console, vá em **Project Settings** > **Cloud Messaging**
2. Na aba **Cloud Messaging API (Legacy)**:
   - Se desabilitado, clique em "Enable"
   - Copie o **Server Key**
3. Copie também o **Sender ID**

#### Passo 3: Configurar no OneSignal

1. No OneSignal Dashboard, vá em **Settings** > **Platforms**
2. Clique em **Google Android (FCM)**
3. Cole o **Server Key** do Firebase
4. Cole o **Sender ID** do Firebase
5. Clique em **Save**

### 1.3 Configurar iOS (Opcional)

#### Passo 1: Apple Developer

1. Acesse [https://developer.apple.com](https://developer.apple.com)
2. Vá em **Certificates, Identifiers & Profiles**
3. Crie um **App ID** para `com.precocerto.app`
4. Habilite **Push Notifications**

#### Passo 2: Criar Certificado Push

1. Crie um **APNs Auth Key** ou **Certificate**
2. Baixe o arquivo `.p8` (Auth Key) ou `.p12` (Certificate)

#### Passo 3: Configurar no OneSignal

1. No OneSignal Dashboard, vá em **Settings** > **Platforms**
2. Clique em **Apple iOS (APNs)**
3. Faça upload do certificado ou Auth Key
4. Preencha os dados solicitados
5. Clique em **Save**

### 1.4 Obter Credenciais

Após configurar as plataformas:

1. Vá em **Settings** > **Keys & IDs**
2. Copie o **OneSignal App ID**
3. Copie o **REST API Key**

**IMPORTANTE**: Guarde essas credenciais em local seguro!

## 🔧 Parte 2: Configuração do Backend

### 2.1 Instalar Dependências

```bash
cd backend
npm install onesignal-node --save
```

### 2.2 Configurar Variáveis de Ambiente

Edite o arquivo `backend/.env`:

```env
# OneSignal Configuration
ONESIGNAL_ENABLED=true
ONESIGNAL_APP_ID=seu-app-id-aqui
ONESIGNAL_REST_API_KEY=sua-api-key-aqui

# Expo Fallback (opcional, para transição gradual)
EXPO_NOTIFICATIONS_FALLBACK=false
```

### 2.3 Aplicar Migração do Banco de Dados

```bash
cd backend
node scripts/apply-onesignal-migration.js
```

Ou execute manualmente o SQL:

```bash
psql -h seu-host -U seu-usuario -d seu-banco -f database/migrations/add_onesignal_columns.sql
```

### 2.4 Testar Configuração

```bash
cd backend
npm start
```

Verifique os logs:
```
✅ OneSignal inicializado com sucesso
```

## 📱 Parte 3: Configuração do App Mobile

### 3.1 Instalar Dependências

```bash
cd app
npm install react-native-onesignal --save
```

### 3.2 Configurar Android

#### Arquivo: `app/android/app/build.gradle`

Adicione no topo:

```gradle
apply plugin: 'com.onesignal.androidsdk.onesignal-gradle-plugin'
```

Adicione nas dependencies:

```gradle
dependencies {
    // ... outras dependências
    implementation 'com.onesignal:OneSignal:[5.0.0, 5.99.99]'
}
```

#### Arquivo: `app/android/build.gradle`

Adicione no buildscript:

```gradle
buildscript {
    repositories {
        // ... outros repositórios
        gradlePluginPortal()
    }
    dependencies {
        // ... outras dependências
        classpath 'gradle.plugin.com.onesignal:onesignal-gradle-plugin:[0.14.0, 0.99.99]'
    }
}
```

#### Arquivo: `app/android/app/google-services.json`

Copie o arquivo baixado do Firebase para `app/android/app/google-services.json`

### 3.3 Configurar iOS (Opcional)

#### Arquivo: `app/ios/Podfile`

Adicione:

```ruby
target 'PreçoCerto' do
  # ... outras configurações
  
  pod 'OneSignalXCFramework', '>= 5.0.0', '< 6.0'
end
```

Execute:

```bash
cd app/ios
pod install
```

### 3.4 Configurar Variáveis de Ambiente

Edite o arquivo `app/.env`:

```env
# OneSignal
ONESIGNAL_APP_ID=seu-app-id-aqui
```

### 3.5 Atualizar App.js

Substitua a inicialização de notificações:

```javascript
// Antes (Expo Notifications)
import { useNotificationStore } from './src/stores/notificationStore';

// Depois (OneSignal)
import { useOneSignalStore } from './src/stores/oneSignalStore';

// No useEffect
const { initialize: initializeNotifications } = useOneSignalStore();
```

### 3.6 Build e Teste

#### Android

```bash
cd app
npx expo run:android
```

#### iOS

```bash
cd app
npx expo run:ios
```

## 🧪 Parte 4: Testes

### 4.1 Testar Registro de Usuário

1. Abra o app
2. Faça login
3. Aceite as permissões de notificação
4. Verifique os logs:
   ```
   ✅ OneSignal inicializado
   ✅ Usuário registrado no OneSignal: 123
   ```

### 4.2 Testar Envio de Notificação

#### Via API (Postman/cURL)

```bash
curl -X POST http://localhost:3000/api/onesignal/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "user_id": "123",
    "title": "Teste",
    "message": "Mensagem de teste"
  }'
```

#### Via OneSignal Dashboard

1. Vá em **Messages** > **New Push**
2. Selecione **Send to Test Device**
3. Adicione seu device (Player ID)
4. Envie a mensagem

### 4.3 Testar Navegação

1. Envie uma notificação com dados:
   ```json
   {
     "type": "new_coupon",
     "couponId": "456",
     "screen": "CouponDetails"
   }
   ```
2. Clique na notificação
3. Verifique se o app abre na tela correta

## 🔄 Parte 5: Migração de Usuários Existentes

### 5.1 Verificar Estatísticas

```bash
curl -X GET http://localhost:3000/api/onesignal/migration/stats \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"
```

Resposta:
```json
{
  "success": true,
  "stats": {
    "total_with_tokens": 1000,
    "total_expo_tokens": 800,
    "total_migrated": 0,
    "pending_migration": 800
  }
}
```

### 5.2 Executar Migração (Dry Run)

```bash
curl -X POST http://localhost:3000/api/onesignal/migration/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
  -d '{
    "dryRun": true,
    "limit": 10
  }'
```

### 5.3 Executar Migração (Produção)

```bash
curl -X POST http://localhost:3000/api/onesignal/migration/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
  -d '{
    "dryRun": false
  }'
```

### 5.4 Monitorar Progresso

Acompanhe os logs do backend:

```bash
tail -f backend/logs/app.log | grep OneSignal
```

## 🔐 Parte 6: Segurança

### 6.1 Proteger Credenciais

- Nunca commite credenciais no Git
- Use variáveis de ambiente
- Em produção, use secrets management (AWS Secrets Manager, etc)

### 6.2 Configurar CORS

No OneSignal Dashboard:

1. Vá em **Settings** > **All Browsers**
2. Adicione seus domínios permitidos
3. Configure HTTPS

### 6.3 Validar Webhooks (Opcional)

Se usar webhooks do OneSignal:

1. Configure um secret
2. Valide a assinatura das requisições

## 📊 Parte 7: Monitoramento

### 7.1 OneSignal Dashboard

- **Delivery**: Taxa de entrega
- **Outcomes**: Taxa de abertura, conversões
- **Audience**: Usuários ativos, devices

### 7.2 Logs do Backend

```bash
# Ver logs de notificações
tail -f backend/logs/app.log | grep "OneSignal\|notification"

# Ver erros
tail -f backend/logs/app.log | grep "ERROR"
```

### 7.3 Métricas Importantes

- Taxa de entrega: > 95%
- Taxa de abertura: > 10%
- Latência: < 5 segundos
- Taxa de erro: < 1%

## 🚨 Parte 8: Troubleshooting

### Problema: "OneSignal não inicializado"

**Solução**:
1. Verifique se `ONESIGNAL_APP_ID` está configurado
2. Verifique se `ONESIGNAL_REST_API_KEY` está configurado
3. Reinicie o backend

### Problema: "Notificações não chegam no Android"

**Solução**:
1. Verifique se `google-services.json` está no lugar correto
2. Verifique se o Server Key do Firebase está correto
3. Verifique se o app tem permissão de notificação
4. Teste com o app em foreground e background

### Problema: "Erro ao migrar usuários"

**Solução**:
1. Verifique os logs: `tail -f backend/logs/app.log`
2. Verifique se as colunas foram criadas no banco
3. Execute a migração com `dryRun: true` primeiro
4. Migre em pequenos lotes (limit: 100)

### Problema: "Push token inválido"

**Solução**:
1. OneSignal usa `external_id`, não push token
2. Certifique-se de passar o `user_id` correto
3. Verifique se o usuário foi registrado no OneSignal

## 📚 Recursos Adicionais

- [Documentação OneSignal](https://documentation.onesignal.com/)
- [OneSignal React Native SDK](https://documentation.onesignal.com/docs/react-native-sdk-setup)
- [OneSignal REST API](https://documentation.onesignal.com/reference/create-notification)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)

## ✅ Checklist de Configuração

- [ ] Conta OneSignal criada
- [ ] App configurado no OneSignal
- [ ] Firebase configurado (Android)
- [ ] Credenciais obtidas (App ID, API Key)
- [ ] Backend configurado (.env)
- [ ] Migração do banco aplicada
- [ ] App mobile configurado
- [ ] Dependências instaladas
- [ ] Build Android testado
- [ ] Build iOS testado (se aplicável)
- [ ] Notificação de teste enviada
- [ ] Navegação testada
- [ ] Migração de usuários executada
- [ ] Monitoramento configurado
- [ ] Documentação atualizada

---

**Última atualização**: 2026-02-27
**Versão**: 1.0
