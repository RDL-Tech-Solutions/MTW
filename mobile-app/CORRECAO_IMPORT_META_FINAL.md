# ✅ Correção Final - Erro import.meta

## 🐛 Problema

Erro ocorrendo em todas as plataformas (web, Android, iOS):
```
Uncaught SyntaxError: Cannot use 'import.meta' outside a module
```

## 🔍 Causa Raiz

O problema é causado pelo Metro Bundler tentando usar `package.exports` de algumas dependências (como `expo-constants`) que usam `import.meta` internamente, mas o Metro não está transpilando corretamente.

## ✅ Solução Aplicada

### 1. Metro Config - Desabilitar package.exports ✅

**Arquivo:** `metro.config.js`

Adicionado:
```javascript
config.resolver.unstable_enablePackageExports = false;
```

Isso desabilita o suporte a `package.exports`, forçando o Metro a usar a resolução de módulos tradicional, que não tem problemas com `import.meta`.

### 2. API Config - Remover dependência de expo-constants ✅

**Arquivo:** `src/services/api.js`

- ✅ Removido `import Constants from 'expo-constants'`
- ✅ Criado arquivo `src/config/api.js` com configuração centralizada
- ✅ Usa `Platform.OS` do React Native (não causa problemas)

**Novo arquivo:** `src/config/api.js`
- Configuração centralizada da URL da API
- Suporte a web, mobile e produção
- Fácil de ajustar

## 🚀 Como Aplicar

### Passo 1: Limpar TUDO

```bash
cd mobile-app

# Limpar cache do Metro
rm -rf node_modules/.cache
rm -rf .expo
rm -rf .metro

# Limpar node_modules (opcional, mas recomendado)
rm -rf node_modules
npm install
```

### Passo 2: Reiniciar com Cache Limpo

```bash
npx expo start --clear
```

### Passo 3: Testar

- **Web**: Pressione `w` no terminal
- **Android**: Pressione `a` no terminal
- **iOS**: Pressione `i` no terminal

## ⚙️ Configuração da API

### Ajustar IP para Mobile

Edite `mobile-app/src/config/api.js`:

```javascript
const API_CONFIG = {
  mobile: 'http://SEU_IP_AQUI:3000/api',
};
```

**Como descobrir seu IP:**
- Windows: `ipconfig` (procure por IPv4)
- Mac/Linux: `ifconfig` ou `ip addr`

## 📝 O que foi alterado

1. ✅ `metro.config.js` - Desabilitado `unstable_enablePackageExports`
2. ✅ `src/services/api.js` - Removido `expo-constants`, usando `config/api.js`
3. ✅ `src/config/api.js` - **NOVO** - Configuração centralizada

## ✅ Status

- ✅ Metro config corrigido
- ✅ API config refatorado
- ✅ Dependência problemática removida
- ✅ Pronto para testar

## 🎯 Próximos Passos

1. **Limpar cache** (muito importante!)
2. **Reiniciar Expo** com `--clear`
3. **Testar** em todas as plataformas
4. **Ajustar IP** em `src/config/api.js` se necessário

---

**IMPORTANTE**: Sempre use `--clear` ao reiniciar após essas mudanças!

