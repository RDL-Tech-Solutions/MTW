# 🌐 Guia para Rodar o App na Web

## ✅ Configuração Completa!

O app agora está configurado para rodar na web com **React Native Web**!

---

## 🚀 Como Abrir na Web

### Opção 1: Comando Direto
```bash
cd mobile-app
npm run web
```

### Opção 2: Pelo Menu do Expo
1. Inicie o Expo:
   ```bash
   npm start
   ```

2. No terminal, pressione **`w`** para abrir no navegador

### Opção 3: Acessar URL Diretamente
Abra o navegador e acesse:
```
http://localhost:8081
```

---

## 📱 Testando em Diferentes Plataformas

### Web (Navegador)
```bash
npm run web
# ou pressione 'w' no terminal do Expo
```

### Android
```bash
npm run android
# ou pressione 'a' no terminal do Expo
```

### iOS (apenas Mac)
```bash
npm run ios
# ou pressione 'i' no terminal do Expo
```

### Expo Go (Celular)
- Escaneie o QR code com o app Expo Go

---

## 🎨 Recursos da Versão Web

### ✅ Funcionalidades Disponíveis
- ✅ Autenticação (Login/Registro)
- ✅ Navegação entre telas
- ✅ Listagem de produtos
- ✅ Busca de produtos
- ✅ Favoritos
- ✅ Perfil do usuário
- ✅ Detalhes do produto

### ⚠️ Limitações da Web
- ❌ Push Notifications (apenas mobile)
- ❌ Algumas animações nativas
- ❌ Gestos nativos (swipe, etc)

---

## 🔧 Troubleshooting

### Erro: "Port already in use"
**Solução**: O Expo irá sugerir outra porta automaticamente. Aceite com `Y`.

### Erro: "Module not found"
**Solução**:
```bash
rm -rf node_modules
npm install --legacy-peer-deps
npm run web
```

### Página em branco
**Solução**:
1. Limpe o cache:
   ```bash
   npx expo start --clear
   ```
2. Pressione `w` para abrir na web

### Estilos não aparecem
**Solução**: Alguns componentes React Native podem não ter equivalente web perfeito. Verifique o console do navegador para erros.

---

## 📊 Portas Utilizadas

| Serviço | Porta | URL |
|---------|-------|-----|
| **Backend** | 3000 | http://localhost:3000 |
| **Expo Metro** | 8081 | http://localhost:8081 |
| **Web App** | 8081 | http://localhost:8081 |

---

## 🎯 Dicas para Desenvolvimento Web

### 1. DevTools do Navegador
- Pressione `F12` para abrir o console
- Use o modo responsivo para simular mobile

### 2. Hot Reload
- Alterações no código recarregam automaticamente
- Se não funcionar, pressione `r` no terminal do Expo

### 3. Testar Responsividade
No DevTools:
- Pressione `Ctrl + Shift + M` (Windows/Linux)
- Pressione `Cmd + Shift + M` (Mac)
- Escolha diferentes tamanhos de tela

---

## 🌐 Deploy para Produção Web

### Opção 1: Netlify
```bash
# Build
npx expo export:web

# Deploy
cd web-build
netlify deploy --prod
```

### Opção 2: Vercel
```bash
# Build
npx expo export:web

# Deploy
cd web-build
vercel --prod
```

### Opção 3: GitHub Pages
```bash
# Build
npx expo export:web

# Copie a pasta web-build para seu repositório
```

---

## ✅ Checklist de Teste Web

- [ ] Login funciona
- [ ] Registro funciona
- [ ] Listagem de produtos aparece
- [ ] Busca funciona
- [ ] Favoritos funcionam
- [ ] Navegação entre telas funciona
- [ ] Detalhes do produto aparecem
- [ ] Logout funciona
- [ ] Responsivo em diferentes tamanhos

---

## 🎉 Pronto!

Agora você pode desenvolver e testar o app em:
- 📱 **Mobile** (Android/iOS via Expo Go)
- 💻 **Web** (Navegador)
- 🖥️ **Desktop** (Electron - futuro)

---

**Desenvolvido com ❤️ para MTW Promo**
