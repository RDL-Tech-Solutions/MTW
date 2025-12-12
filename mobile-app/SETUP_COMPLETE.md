# 📱 MTW Promo Mobile App - Setup Completo

## ✅ O Que Foi Criado

### 1. Navegação
- ✅ `AppNavigator.js` - Navegação principal com autenticação
- ✅ `AuthNavigator.js` - Navegação de autenticação
- ✅ `TabNavigator.js` - Bottom tabs (Home, Categorias, Favoritos, Perfil)

### 2. Serviços
- ✅ `api.js` - Cliente Axios configurado
- ✅ `storage.js` - AsyncStorage wrapper

### 3. Stores (Zustand)
- ✅ `authStore.js` - Autenticação
- ✅ `productStore.js` - Produtos e favoritos

### 4. Componentes UI
- ✅ `Button.js` - Botão customizado
- ✅ `Input.js` - Input com validação
- ✅ `ProductCard.js` - Card de produto

### 5. Telas Criadas
- ✅ `LoginScreen.js` - Tela de login

### 6. Tema
- ✅ `colors.js` - Paleta de cores
- ✅ `constants.js` - Constantes do app

---

## 📋 Telas Que Faltam Criar

Crie os seguintes arquivos para completar o app:

### Auth
```javascript
// src/screens/auth/RegisterScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import colors from '../../theme/colors';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();

  const handleRegister = async () => {
    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Erro', result.error);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Criar Conta</Text>
        <Input label="Nome" value={name} onChangeText={setName} leftIcon="person-outline" />
        <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" leftIcon="mail-outline" />
        <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry leftIcon="lock-closed-outline" />
        <Button title="Criar Conta" onPress={handleRegister} loading={loading} />
        <Button title="Já tenho conta" onPress={() => navigation.goBack()} variant="ghost" style={{ marginTop: 16 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, justifyContent: 'center', flexGrow: 1 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 32 },
});
```

### Home
```javascript
// src/screens/home/HomeScreen.js
import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useProductStore } from '../../stores/productStore';
import ProductCard from '../../components/common/ProductCard';
import { SCREEN_NAMES } from '../../utils/constants';
import colors from '../../theme/colors';

export default function HomeScreen({ navigation }) {
  const { products, fetchProducts, addFavorite, removeFavorite, isFavorite } = useProductStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    await fetchProducts();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const handleFavorite = async (productId) => {
    if (isFavorite(productId)) {
      await removeFavorite(productId);
    } else {
      await addFavorite(productId);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => navigation.navigate(SCREEN_NAMES.PRODUCT_DETAILS, { product: item })}
            onFavoritePress={() => handleFavorite(item.id)}
            isFavorite={isFavorite(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
});
```

### Outras Telas (Estrutura Básica)
```javascript
// src/screens/categories/CategoriesScreen.js
// src/screens/favorites/FavoritesScreen.js
// src/screens/profile/ProfileScreen.js
// src/screens/product/ProductDetailsScreen.js
```

---

## 🚀 Como Rodar

### 1. Instalar Dependências
```bash
cd mobile-app
npm install
```

### 2. Configurar API URL
Crie o arquivo `app.json` e adicione:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://SEU_IP:3000/api"
    }
  }
}
```

### 3. Iniciar o App
```bash
npm start
```

### 4. Testar
- Pressione `i` para iOS
- Pressione `a` para Android
- Ou escaneie o QR code com Expo Go

---

## 📱 Estrutura Final

```
mobile-app/
├── src/
│   ├── components/
│   │   └── common/
│   │       ├── Button.js ✅
│   │       ├── Input.js ✅
│   │       └── ProductCard.js ✅
│   ├── navigation/
│   │   ├── AppNavigator.js ✅
│   │   ├── AuthNavigator.js ✅
│   │   └── TabNavigator.js ✅
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.js ✅
│   │   │   └── RegisterScreen.js ⏳
│   │   ├── home/
│   │   │   └── HomeScreen.js ⏳
│   │   ├── categories/
│   │   │   └── CategoriesScreen.js ⏳
│   │   ├── favorites/
│   │   │   └── FavoritesScreen.js ⏳
│   │   ├── profile/
│   │   │   └── ProfileScreen.js ⏳
│   │   └── product/
│   │       └── ProductDetailsScreen.js ⏳
│   ├── services/
│   │   ├── api.js ✅
│   │   └── storage.js ✅
│   ├── stores/
│   │   ├── authStore.js ✅
│   │   └── productStore.js ✅
│   ├── theme/
│   │   └── colors.js ✅
│   └── utils/
│       └── constants.js ✅
├── App.js
└── package.json
```

---

## 🎯 Próximos Passos

1. **Criar telas restantes** (use os exemplos acima)
2. **Atualizar App.js** para usar AppNavigator
3. **Testar autenticação**
4. **Testar listagem de produtos**
5. **Implementar favoritos**
6. **Adicionar notificações push**

---

## ✅ Progresso

- **Estrutura**: 100% ✅
- **Navegação**: 100% ✅
- **Serviços**: 100% ✅
- **Stores**: 100% ✅
- **Componentes**: 60% ⏳
- **Telas**: 20% ⏳
- **Total**: **~70%**

---

**Continue criando as telas restantes usando os exemplos fornecidos!** 🚀
