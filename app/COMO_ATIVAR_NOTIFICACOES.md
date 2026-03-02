# Como Ativar Notificações Push no App

## ⚠️ Requisito Importante

As notificações push do OneSignal **NÃO funcionam no Expo Go**. Você precisa de um build nativo.

## Opção 1: Build com EAS (Recomendado)

### 1. Fazer Build de Preview
```bash
cd app
eas build --profile preview --platform android
```

### 2. Instalar o APK no Dispositivo
- Baixe o APK gerado pelo EAS Build
- Instale no seu dispositivo Android
- Abra o app

### 3. Ativar Notificações no App
1. Faça login no app
2. Vá em **Configurações** → **Notificações**
3. Clique em **"Ativar Notificações"**
4. Conceda a permissão quando solicitado

## Opção 2: Build Local

### 1. Preparar Build Nativo
```bash
cd app
npx expo prebuild
```

### 2. Executar no Dispositivo
```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

### 3. Ativar Notificações
Siga os mesmos passos da Opção 1, item 3.

## Verificar se Está Funcionando

### No App
1. Vá em **Configurações** → **Notificações**
2. Verifique o status:
   - ✅ OneSignal Inicializado: Sim
   - ✅ Permissão Concedida: Sim
   - ✅ Usuário Registrado: Sim

### Testar Notificação
Use o endpoint do backend:
```bash
curl -X POST http://seu-servidor:3000/api/notifications/test-push \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json"
```

Ou use o painel admin para enviar uma notificação de teste.

## Problemas Comuns

### "OneSignal Não Disponível"
**Causa**: Você está usando Expo Go
**Solução**: Faça um build nativo (EAS ou local)

### "Permissão Negada"
**Causa**: Você negou a permissão de notificações
**Solução**: 
1. Vá em Configurações do Android
2. Apps → PreçoCerto → Notificações
3. Ative as notificações

### "Usuário Não Registrado"
**Causa**: Você não está logado ou o login falhou
**Solução**:
1. Faça logout
2. Faça login novamente
3. Ative as notificações novamente

### Notificações Não Chegam
**Verificar**:
1. Conexão com internet está ativa?
2. App está em background ou fechado? (notificações só aparecem assim)
3. Permissão está concedida?
4. Usuário está registrado no OneSignal?

**Debug**:
1. Verifique os logs do app (console)
2. Verifique o painel do OneSignal
3. Teste com o endpoint `/api/notifications/test-push`

## Configuração do OneSignal

### App ID
```
40967aa6-5a0e-4ac3-813e-f22c589b89ce
```

### Firebase Project
```
precocerto-60872
```

### Package Name
```
com.precocerto.app
```

## Fluxo de Ativação

```
1. App Inicia
   ↓
2. OneSignal Inicializa (sem solicitar permissão)
   ↓
3. Usuário faz login
   ↓
4. Usuário vai em Configurações → Notificações
   ↓
5. Usuário clica em "Ativar Notificações"
   ↓
6. Sistema solicita permissão
   ↓
7. Usuário concede permissão
   ↓
8. OneSignal registra o usuário com external_id
   ↓
9. Backend pode enviar notificações para o usuário
```

## Tipos de Notificações

O app suporta os seguintes tipos:
- **new_product**: Novo produto adicionado
- **new_coupon**: Novo cupom disponível
- **price_drop**: Queda de preço em produto
- **coupon_expiring**: Cupom prestes a expirar
- **general**: Notificação geral

## Navegação Automática

Quando o usuário clica em uma notificação, o app navega automaticamente para:
- **ProductDetails**: Se a notificação tem `productId`
- **CouponDetails**: Se a notificação tem `couponId`
- **Home**: Para notificações gerais

## Tela de Configurações de Notificações

Criada em: `app/src/screens/settings/NotificationSettingsScreen.js`

Funcionalidades:
- ✅ Mostra status do OneSignal
- ✅ Mostra se permissão está concedida
- ✅ Mostra informações do dispositivo (Player ID, Push Token)
- ✅ Botão para ativar notificações
- ✅ Botão para abrir configurações do sistema
- ✅ Botão para atualizar status
- ✅ Instruções de ajuda

## Próximos Passos

1. Adicionar a tela de NotificationSettingsScreen na navegação
2. Fazer build com EAS
3. Testar no dispositivo físico
4. Enviar notificação de teste
5. Verificar se a navegação funciona corretamente
