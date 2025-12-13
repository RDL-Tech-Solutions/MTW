# 🔧 Correção de Warnings React Native Web

## ⚠️ Warnings Encontrados

1. **`"shadow*" style props are deprecated. Use "boxShadow"`**
   - Localização: `AuthNavigator.js` (vindo do React Navigation)
   - Status: ⚠️ Warning do React Navigation (não podemos corrigir diretamente)

2. **`"textShadow*" style props are deprecated. Use "textShadow"`**
   - Localização: `SplashScreen.js`
   - Status: ✅ **CORRIGIDO**

3. **`useNativeDriver is not supported`**
   - Localização: `SplashScreen.js`
   - Status: ✅ **CORRIGIDO**

4. **`props.pointerEvents is deprecated. Use style.pointerEvents`**
   - Localização: Vindo de bibliotecas externas
   - Status: ⚠️ Warning de bibliotecas (não podemos corrigir diretamente)

5. **CORS Error**
   - Localização: Backend `server.js`
   - Status: ✅ **CORRIGIDO**

---

## ✅ Correções Aplicadas

### 1. SplashScreen - textShadow

**Antes:**
```javascript
title: {
  textShadowColor: 'rgba(0, 0, 0, 0.3)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 4,
}
```

**Depois:**
```javascript
title: {
  // Web: usar textShadow CSS, Mobile: usar propriedades separadas
  ...(Platform.OS === 'web' ? {
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
  } : {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  }),
}
```

### 2. SplashScreen - useNativeDriver

**Antes:**
```javascript
Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 800,
  useNativeDriver: true, // ❌ Não funciona na web
}),
```

**Depois:**
```javascript
const canUseNativeDriver = Platform.OS !== 'web';

Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 800,
  useNativeDriver: canUseNativeDriver, // ✅ Desabilitado na web
}),
```

### 3. Backend - CORS Melhorado

**Antes:**
```javascript
app.use(cors({
  origin: [
    'http://localhost:8081',
    '*'
  ],
  // ...
}));
```

**Depois:**
```javascript
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:19006',
      'http://localhost:8081', // Expo Web
      'http://localhost:3000',
    ];
    
    // Permitir requisições sem origin (mobile apps)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight
```

---

## ⚠️ Warnings que Não Podemos Corrigir

### 1. React Navigation - shadow* props
O warning `"shadow*" style props are deprecated` em `AuthNavigator.js` vem do React Navigation internamente. Não podemos corrigir diretamente, mas não afeta a funcionalidade.

**Solução**: Aguardar atualização do React Navigation ou ignorar o warning (não afeta funcionalidade).

### 2. pointerEvents warning
O warning `props.pointerEvents is deprecated` vem de bibliotecas externas. Não podemos corrigir diretamente.

**Solução**: Aguardar atualização das bibliotecas ou ignorar o warning.

---

## 🧪 Como Testar

1. **Reiniciar Backend**:
   ```bash
   cd backend
   npm start
   ```

2. **Limpar Cache do Mobile App**:
   ```bash
   cd mobile-app
   npx expo start --clear
   ```

3. **Testar Registro**:
   - Abrir app em `http://localhost:8081`
   - Tentar registrar um novo usuário
   - Verificar se CORS error desapareceu

4. **Verificar Warnings**:
   - Abrir console do navegador
   - Verificar se warnings de `textShadow` e `useNativeDriver` desapareceram
   - Warnings do React Navigation podem ainda aparecer (normal)

---

## 📝 Notas

- ✅ **CORS**: Configuração melhorada com callback function
- ✅ **textShadow**: Usa formato CSS na web
- ✅ **useNativeDriver**: Desabilitado automaticamente na web
- ⚠️ **React Navigation warnings**: Não podemos corrigir (vem da biblioteca)
- ⚠️ **pointerEvents warning**: Não podemos corrigir (vem de bibliotecas)

---

**Status**: ✅ Correções aplicadas - Warnings principais corrigidos

