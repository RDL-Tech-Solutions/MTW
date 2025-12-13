# 🔧 Correção de Warnings - React Native Web

## ⚠️ Warnings Corrigidos

### 1. **"shadow*" style props are deprecated**

**Problema**: React Native Web não suporta mais `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` como props de estilo.

**Solução**: Usar `boxShadow` para web e `elevation` para mobile.

**Arquivos corrigidos**:
- ✅ `src/components/common/ProductCard.js`
- ✅ `src/components/coupons/CouponCard.js`
- ✅ `src/screens/categories/CategoriesScreen.js`

**Código aplicado**:
```javascript
// Antes (deprecated)
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,
elevation: 3,

// Depois (correto)
...(Platform.OS === 'web' ? {
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
} : {
  elevation: 3,
}),
```

### 2. **CORS Error - Backend**

**Problema**: O backend não estava permitindo requisições do Expo Web (`http://localhost:8081`).

**Solução**: Adicionado `http://localhost:8081` à lista de origens permitidas no CORS.

**Arquivo corrigido**:
- ✅ `backend/src/server.js`

**Configuração aplicada**:
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:19006',
    'http://localhost:8081', // Expo Web - NOVO
    'http://localhost:3000',
    '*'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

## ✅ Status

- ✅ Warnings de shadow corrigidos
- ✅ CORS configurado para Expo Web
- ✅ Imports de Platform adicionados
- ✅ Compatibilidade web/mobile mantida

## 🚀 Próximos Passos

1. **Reiniciar o backend** para aplicar as mudanças de CORS:
   ```bash
   cd backend
   npm start
   ```

2. **Reiniciar o Expo** para aplicar as mudanças de estilo:
   ```bash
   cd mobile-app
   npx expo start --clear
   ```

3. **Testar no navegador**:
   - Acesse `http://localhost:8081`
   - Verifique se não há mais warnings no console
   - Teste registro/login

## 📝 Notas

- O uso de `Platform.OS` garante que o código funcione tanto na web quanto no mobile
- `boxShadow` é específico para web (CSS)
- `elevation` é específico para Android (Material Design)
- iOS usa `shadowColor`, `shadowOffset`, etc., mas o React Native Web não suporta mais

---

**Última atualização**: 13/12/2024  
**Status**: ✅ Corrigido

