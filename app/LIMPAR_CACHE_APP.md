# 🔄 Limpar Cache do App - Ver Nova Tela de Notificações

## ❓ Problema

A tela de configurações de notificações não mostra as novas funcionalidades (categorias, palavras-chave, produtos específicos).

## 🔍 Causa

O app está usando uma versão em cache. A nova tela já está implementada em:
`app/src/screens/settings/NotificationSettingsScreen.js`

## ✅ Solução

### Opção 1: Limpar Cache do Expo (Mais Rápido)

```bash
# No diretório do app
cd app

# Limpar cache
npx expo start -c

# Ou
npx expo start --clear
```

### Opção 2: Limpar Cache Completo

```bash
cd app

# Parar o servidor se estiver rodando
# Ctrl+C

# Limpar cache do Metro
npx react-native start --reset-cache

# Ou limpar tudo
rm -rf node_modules
rm -rf .expo
npm install
npx expo start -c
```

### Opção 3: Rebuild Completo (Recomendado para Build Nativo)

```bash
cd app

# Android
npx expo prebuild --clean
npx expo run:android

# iOS
npx expo prebuild --clean
npx expo run:ios
```

### Opção 4: Limpar Cache do Dispositivo

**Android**:
1. Configurações do dispositivo
2. Apps
3. PreçoCerto
4. Armazenamento
5. Limpar cache
6. Limpar dados (vai fazer logout)

**iOS**:
1. Desinstalar o app
2. Reinstalar

## 📱 Nova Tela de Notificações

Após limpar o cache, você verá:

### ✅ Status das Notificações
- Permissão do sistema
- Token FCM registrado

### ⚙️ Configurações Gerais
- Switch: Notificações Push
- Switch: Notificações por Email

### 📂 Categorias de Interesse
- Lista de todas as categorias
- Checkbox para selecionar/desselecionar
- Se nenhuma selecionada = recebe de todas

### 🔑 Palavras-chave
- Campo de texto para adicionar
- Tags removíveis
- Exemplos: "iPhone", "Samsung", "Notebook"

### 📦 Produtos Específicos
- Campo de texto para adicionar
- Tags removíveis
- Exemplos: "iPhone 15", "Galaxy S24"

### 💾 Botão Salvar
- Salva todas as preferências
- Feedback de sucesso/erro

## 🧪 Como Testar

1. **Limpar cache**:
   ```bash
   cd app
   npx expo start -c
   ```

2. **Abrir app no dispositivo**

3. **Ir em**: Configurações → Notificações

4. **Verificar se aparece**:
   - Seção "Categorias de Interesse"
   - Seção "Palavras-chave"
   - Seção "Produtos Específicos"

5. **Testar funcionalidades**:
   - Selecionar categorias
   - Adicionar palavras-chave
   - Adicionar produtos
   - Salvar preferências

## 📝 Verificar Arquivo

Para confirmar que o arquivo está correto:

```bash
# Ver o arquivo
cat app/src/screens/settings/NotificationSettingsScreen.js | grep -A 5 "Categorias de Interesse"

# Deve mostrar:
# <Text style={styles.sectionTitle}>Categorias de Interesse</Text>
```

## 🔧 Se Ainda Não Funcionar

### 1. Verificar se o arquivo foi salvo

```bash
# Ver última modificação
ls -la app/src/screens/settings/NotificationSettingsScreen.js
```

### 2. Verificar se não há erros de sintaxe

```bash
cd app
npx expo start
# Ver se há erros no console
```

### 3. Verificar se a navegação está correta

```bash
# Ver se a tela está registrada
cat app/src/navigation/AppNavigator.js | grep NotificationSettings
```

Deve mostrar:
```javascript
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';
...
<Stack.Screen
  name={SCREEN_NAMES.NOTIFICATION_SETTINGS}
  component={NotificationSettingsScreen}
  options={{ headerShown: false }}
/>
```

## 🚀 Rebuild Completo (Se Nada Funcionar)

```bash
cd app

# 1. Limpar tudo
rm -rf node_modules
rm -rf .expo
rm -rf android/build
rm -rf ios/build

# 2. Reinstalar
npm install

# 3. Rebuild nativo
npx expo prebuild --clean

# 4. Rodar
npx expo run:android
# ou
npx expo run:ios
```

## 📊 Checklist

- [ ] Cache limpo (`npx expo start -c`)
- [ ] App reiniciado
- [ ] Navegou para Configurações → Notificações
- [ ] Vê seção "Categorias de Interesse"
- [ ] Vê seção "Palavras-chave"
- [ ] Vê seção "Produtos Específicos"
- [ ] Consegue adicionar palavras-chave
- [ ] Consegue selecionar categorias
- [ ] Botão "Salvar Preferências" aparece
- [ ] Salvar funciona sem erro

## 💡 Dica

Se você está usando Expo Go, algumas funcionalidades podem não funcionar. Para ver tudo funcionando:

```bash
# Fazer build nativo
npx expo prebuild
npx expo run:android
```

## 🆘 Suporte

Se ainda não funcionar:

1. Verificar logs do app:
   ```bash
   npx react-native log-android
   # ou
   npx react-native log-ios
   ```

2. Verificar se há erros no console do Expo

3. Tentar em um dispositivo diferente

4. Desinstalar e reinstalar o app completamente

---

**A nova tela está implementada e pronta!** Só precisa limpar o cache para ver. 🎉
