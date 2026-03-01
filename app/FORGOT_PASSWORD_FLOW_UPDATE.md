# Atualização: Fluxo de Recuperação de Senha

## 🔄 Mudança Implementada

### Antes (2 Steps):
1. **Step 1**: Digitar email → Enviar código
2. **Step 2**: Digitar código + nova senha + confirmar senha → Redefinir

❌ **Problema**: Usuário via código e senha juntos, sem validar o código primeiro

### Depois (3 Steps):
1. **Step 1**: Digitar email → Enviar código
2. **Step 2**: Digitar código → Verificar código ✅
3. **Step 3**: Digitar nova senha + confirmar → Redefinir

✅ **Solução**: Usuário confirma o código primeiro, depois define a nova senha

## 📱 Fluxo Detalhado

### Step 1: Solicitar Código
```
┌─────────────────────────────┐
│  Esqueceu sua senha?        │
│                             │
│  Digite seu email e         │
│  enviaremos um código       │
│                             │
│  Email: [____________]      │
│                             │
│  [Enviar Código]            │
│  [Voltar ao Login]          │
└─────────────────────────────┘
```

**Ação**: 
- Usuário digita email
- Sistema envia código de 6 dígitos por email
- Avança para Step 2

### Step 2: Verificar Código (NOVO)
```
┌─────────────────────────────┐
│  Digite o Código            │
│                             │
│  Enviamos um código de      │
│  6 dígitos para             │
│  usuario@email.com          │
│                             │
│  Código: [______]           │
│                             │
│  [Verificar Código]         │
│  [Reenviar Código]          │
│  [Voltar]                   │
└─────────────────────────────┘
```

**Ação**:
- Usuário digita código de 6 dígitos
- Sistema valida código no backend
- Se válido: Avança para Step 3
- Se inválido: Mostra erro
- Pode reenviar código se necessário

### Step 3: Nova Senha
```
┌─────────────────────────────┐
│  Nova Senha                 │
│                             │
│  Defina uma nova senha      │
│  para sua conta             │
│                             │
│  Nova Senha: [_________]    │
│  Confirmar:  [_________]    │
│                             │
│  [Redefinir Senha]          │
│  [Voltar]                   │
└─────────────────────────────┘
```

**Ação**:
- Usuário define nova senha
- Confirma senha
- Sistema valida e redefine senha
- Redireciona para login

## 🔧 Mudanças Técnicas

### Arquivo Modificado
`app/src/screens/auth/ForgotPasswordScreen.js`

### Mudanças no State
```javascript
// Antes
const [step, setStep] = useState(1); // 1: email, 2: code + password

// Depois
const [step, setStep] = useState(1); // 1: email, 2: code verification, 3: new password
```

### Novas Funções

#### 1. Validação Separada
```javascript
// Antes: validateReset() - validava código E senha juntos

// Depois:
validateCode()     // Valida apenas código
validatePassword() // Valida apenas senha
```

#### 2. Nova Função de Verificação
```javascript
handleVerifyCode() // Verifica código antes de permitir mudança de senha
```

### Funções do AuthStore Utilizadas
```javascript
const { 
  forgotPassword,      // Step 1: Envia código
  verifyResetCode,     // Step 2: Verifica código (NOVO USO)
  resetPasswordWithCode // Step 3: Redefine senha
} = useAuthStore();
```

## 🎯 Benefícios

### 1. Segurança
- ✅ Valida código antes de mostrar campos de senha
- ✅ Impede tentativas de adivinhar senha sem código válido
- ✅ Feedback claro se código está correto

### 2. UX Melhorada
- ✅ Fluxo mais claro e intuitivo
- ✅ Usuário sabe que código foi validado antes de continuar
- ✅ Menos confusão com múltiplos campos na mesma tela
- ✅ Foco em uma tarefa por vez

### 3. Feedback Visual
- ✅ Alert de "Código Verificado" antes de avançar
- ✅ Mensagens claras em cada etapa
- ✅ Botão "Voltar" permite corrigir informações

## 📋 Endpoints Utilizados

### 1. Solicitar Código
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "usuario@email.com"
}
```

### 2. Verificar Código (NOVO ENDPOINT USADO)
```http
POST /api/auth/verify-reset-code
Content-Type: application/json

{
  "email": "usuario@email.com",
  "code": "123456"
}
```

### 3. Redefinir Senha
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "usuario@email.com",
  "code": "123456",
  "newPassword": "novaSenha123"
}
```

## 🧪 Testando

### Fluxo Completo:
1. Abrir app
2. Tela de login → "Esqueceu sua senha?"
3. **Step 1**: Digitar email → "Enviar Código"
4. Verificar email recebido
5. **Step 2**: Digitar código → "Verificar Código"
6. Ver mensagem "Código Verificado"
7. **Step 3**: Digitar nova senha → "Redefinir Senha"
8. Ver mensagem "Senha Redefinida"
9. Fazer login com nova senha

### Casos de Teste:

#### ✅ Código Válido
- Digitar código correto
- Ver mensagem de sucesso
- Avançar para step 3

#### ❌ Código Inválido
- Digitar código errado
- Ver mensagem de erro
- Permanecer no step 2
- Poder tentar novamente

#### 🔄 Reenviar Código
- Clicar em "Reenviar Código"
- Receber novo código por email
- Código anterior é invalidado

#### ⏱️ Código Expirado
- Esperar 15 minutos
- Tentar usar código
- Ver mensagem "Código expirado"
- Reenviar novo código

## 🎨 Melhorias de UI

### AutoFocus
```javascript
// Step 2: Foco automático no campo de código
<Input autoFocus />

// Step 3: Foco automático no campo de senha
<Input autoFocus />
```

### Navegação
- Botão "Voltar" em cada step
- Step 2 → Step 1 (reenviar código)
- Step 3 → Step 2 (corrigir código)

### Feedback
- Alerts informativos em cada transição
- Mensagens de erro claras
- Loading states durante requisições

## 📊 Status

- [x] Step 1: Solicitar código (já existia)
- [x] Step 2: Verificar código (NOVO)
- [x] Step 3: Nova senha (separado)
- [x] Validações separadas
- [x] AutoFocus nos inputs
- [x] Navegação entre steps
- [x] Mensagens de feedback
- [x] Sem erros de diagnóstico

## 🚀 Pronto para Uso!

O fluxo de recuperação de senha agora está mais seguro e intuitivo, com validação do código antes de permitir a mudança de senha.
