# Fluxo de Onboarding - PreçoCerto

## Visão Geral

Implementado um fluxo completo de onboarding que aparece apenas na primeira vez que o usuário abre o app.

## Estrutura do Fluxo

### 1. Splash Screen (6 segundos)
- Vídeo de introdução (intro.mp4)
- Carregamento inicial do app
- Inicialização de stores (Auth, FCM, Theme, Notifications)

### 2. Onboarding (3 Slides)
**Tela:** `app/src/screens/onboarding/OnboardingScreen.js`

Slides com animação horizontal:

#### Slide 1: Melhores Ofertas
- Ícone: pricetag (vermelho)
- Título: "Melhores Ofertas"
- Descrição: "Encontre os melhores preços e cupons de desconto das principais lojas do Brasil"

#### Slide 2: Notificações Personalizadas
- Ícone: notifications (laranja)
- Título: "Notificações Personalizadas"
- Descrição: "Receba alertas de produtos e categorias que você realmente se interessa"

#### Slide 3: Salve seus Favoritos
- Ícone: heart (verde)
- Título: "Salve seus Favoritos"
- Descrição: "Marque produtos e cupons favoritos para acessar rapidamente quando precisar"

**Funcionalidades:**
- Navegação por swipe horizontal
- Paginação animada (dots)
- Botão "Pular" (canto superior direito)
- Botão "Próximo" / "Começar"
- Salva flag `@onboarding_completed` no AsyncStorage

### 3. Escolha de Autenticação
**Tela:** `app/src/screens/onboarding/AuthChoiceScreen.js`

Design moderno com gradiente vermelho:
- Logo do PreçoCerto (ícone + texto)
- Tagline: "Economize com inteligência"
- Botão primário: "Criar Conta" (branco)
- Botão secundário: "Já tenho conta" (outline branco)
- Termos de uso e política de privacidade
- Elementos decorativos (círculos)

**Navegação:**
- "Criar Conta" → Tela de Registro
- "Já tenho conta" → Tela de Login

## Arquivos Modificados

### Novos Arquivos
1. `app/src/screens/onboarding/OnboardingScreen.js` - Tela de slides
2. `app/src/screens/onboarding/AuthChoiceScreen.js` - Tela de escolha

### Arquivos Atualizados
1. `app/src/services/storage.js`
   - Adicionado `ONBOARDING_COMPLETED` key
   - Métodos `setOnboardingCompleted()` e `getOnboardingCompleted()`

2. `app/src/navigation/AuthNavigator.js`
   - Importa novas telas de onboarding
   - Verifica flag de onboarding para definir rota inicial
   - `initialRouteName`: "Onboarding" ou "AuthChoice"

3. `app/src/navigation/AppNavigator.js`
   - Verifica flag de onboarding no mount
   - Passa informação para AuthNavigator

## Fluxo de Navegação

```
App.js (Splash 6s)
    ↓
AppNavigator
    ↓
[Primeira vez?]
    ↓
    ├─ SIM → Onboarding (3 slides)
    │           ↓
    │       AuthChoice
    │           ↓
    │       ├─ Criar Conta → Register
    │       └─ Já tenho conta → Login
    │
    └─ NÃO → AuthChoice (direto)
                ↓
            ├─ Criar Conta → Register
            └─ Já tenho conta → Login
```

## Persistência

A flag `@onboarding_completed` é salva no AsyncStorage quando:
- Usuário completa os 3 slides (botão "Começar")
- Usuário clica em "Pular"

Uma vez salva, o onboarding nunca mais aparece, indo direto para AuthChoice.

## Design

### OnboardingScreen
- Fundo branco
- Ícones grandes (80px) em círculos coloridos
- Títulos em negrito (28px)
- Descrições em cinza (16px)
- Paginação animada com dots
- Botão vermelho com sombra

### AuthChoiceScreen
- Gradiente vermelho (#DC2626 → #B91C1C → #991B1B)
- Logo em círculo branco com sombra
- Botões grandes e espaçados
- Elementos decorativos (círculos transparentes)
- Texto de termos no rodapé

## Como Testar

### Primeira Instalação
1. Instalar o app
2. Ver splash screen (6s)
3. Ver onboarding (3 slides)
4. Ver tela de escolha
5. Escolher login ou cadastro

### Resetar Onboarding (para testes)
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// No console ou em um botão de debug
await AsyncStorage.removeItem('@onboarding_completed');
```

### Pular Onboarding
- Clicar em "Pular" no canto superior direito
- Vai direto para AuthChoice

## Dependências

Todas as dependências já estão instaladas:
- `expo-linear-gradient` - Gradientes
- `@expo/vector-icons` - Ícones
- `@react-native-async-storage/async-storage` - Persistência
- `@react-navigation/stack` - Navegação

## Próximos Passos

O fluxo está completo e funcional. Para testar:

```bash
cd app
npx expo start
```

Ou para build nativo:

```bash
cd app
npx expo prebuild
npx expo run:android
```
