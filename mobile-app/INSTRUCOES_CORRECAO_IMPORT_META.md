# 🔧 Instruções para Corrigir Erro import.meta

## ⚠️ ERRO ATUAL

```
Uncaught SyntaxError: Cannot use 'import.meta' outside a module
```

Ocorrendo em: **Web, Android e iOS**

---

## ✅ CORREÇÕES APLICADAS

### 1. Metro Config ✅
**Arquivo:** `metro.config.js`

Adicionada linha:
```javascript
config.resolver.unstable_enablePackageExports = false;
```

**Por quê?** Isso desabilita o suporte a `package.exports`, que está causando o problema com `import.meta`.

### 2. API Config ✅
**Arquivo:** `src/services/api.js`

- ✅ Removido `import Constants from 'expo-constants'`
- ✅ Criado novo arquivo `src/config/api.js`
- ✅ Usa `Platform.OS` do React Native (não causa problemas)

**Novo arquivo:** `src/config/api.js`
- Configuração centralizada
- Fácil de ajustar IP

---

## 🚀 PASSOS PARA RESOLVER

### ⚠️ IMPORTANTE: Execute TODOS os passos na ordem!

### Passo 1: Limpar Cache COMPLETO

```bash
cd mobile-app

# Limpar todos os caches
rm -rf .expo
rm -rf .metro
rm -rf node_modules/.cache
rm -rf .expo-shared
```

**No Windows PowerShell:**
```powershell
cd mobile-app
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .metro -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .expo-shared -ErrorAction SilentlyContinue
```

### Passo 2: Reinstalar Dependências (Opcional mas Recomendado)

```bash
# Se o problema persistir, reinstale as dependências
rm -rf node_modules
npm install
```

### Passo 3: Reiniciar Expo com Cache Limpo

```bash
npx expo start --clear
```

**OU se ainda não funcionar:**
```bash
npx expo start --clear --reset-cache
```

### Passo 4: Testar

Após o Expo iniciar:
- **Web**: Pressione `w` no terminal
- **Android**: Pressione `a` no terminal  
- **iOS**: Pressione `i` no terminal

---

## ⚙️ CONFIGURAR IP DA API

### Para Mobile (Android/iOS)

Edite o arquivo: `mobile-app/src/config/api.js`

```javascript
const API_CONFIG = {
  mobile: 'http://SEU_IP_AQUI:3000/api',
};
```

### Como descobrir seu IP:

**Windows:**
```powershell
ipconfig
# Procure por "IPv4" - exemplo: 192.168.1.100
```

**Mac/Linux:**
```bash
ifconfig
# ou
ip addr
```

**Exemplo:**
Se seu IP for `192.168.1.100`, altere para:
```javascript
mobile: 'http://192.168.1.100:3000/api',
```

---

## 🔍 VERIFICAÇÕES

### Se ainda não funcionar:

1. **Verificar se as alterações foram aplicadas:**
   - ✅ `metro.config.js` tem `unstable_enablePackageExports = false`
   - ✅ `src/services/api.js` NÃO importa `expo-constants`
   - ✅ `src/config/api.js` existe

2. **Verificar versões:**
   ```bash
   npx expo --version
   node --version
   npm --version
   ```

3. **Limpar TUDO e reinstalar:**
   ```bash
   rm -rf node_modules
   rm -rf .expo
   rm -rf .metro
   npm install
   npx expo start --clear
   ```

---

## ✅ O QUE FOI CORRIGIDO

| Arquivo | Alteração | Status |
|---------|-----------|--------|
| `metro.config.js` | Adicionado `unstable_enablePackageExports = false` | ✅ |
| `src/services/api.js` | Removido `expo-constants` | ✅ |
| `src/config/api.js` | **NOVO** - Configuração centralizada | ✅ |
| `babel.config.js` | Simplificado | ✅ |

---

## 📝 NOTAS TÉCNICAS

### Por que isso resolve?

1. **`unstable_enablePackageExports = false`**:
   - Desabilita o suporte a `package.exports` no Metro
   - Força uso de resolução de módulos tradicional
   - Evita problemas com `import.meta` em dependências

2. **Remover `expo-constants`**:
   - `expo-constants` usa `import.meta` internamente
   - Ao remover, eliminamos a fonte do problema
   - Usamos `Platform.OS` que é nativo do React Native

---

## 🎯 RESULTADO ESPERADO

Após seguir os passos:
- ✅ App abre na web sem erros
- ✅ App abre no Android sem erros
- ✅ App abre no iOS sem erros
- ✅ API conecta corretamente

---

## 🆘 SE AINDA NÃO FUNCIONAR

1. Verifique se executou `--clear`
2. Verifique se limpou todos os caches
3. Tente reinstalar node_modules
4. Verifique se o backend está rodando
5. Verifique se o IP está correto em `src/config/api.js`

---

**Última atualização:** 13/12/2024  
**Status:** ✅ Correções aplicadas - Pronto para testar

