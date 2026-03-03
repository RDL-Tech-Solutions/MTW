# Animações do Onboarding - PreçoCerto

## Visão Geral

Implementadas animações fluidas e profissionais nas telas de onboarding para criar uma experiência de primeira impressão memorável.

## OnboardingScreen - Animações dos Slides

### 1. Entrada do Ícone
**Tipo:** Spring + Rotation
- Escala de 0.3 → 1.0 (efeito de zoom)
- Rotação de -10° → 0° (efeito de giro suave)
- Fade in de 0 → 1 (opacidade)
- Duração: 600ms
- Efeito: Ícone "salta" para a tela com rotação

```javascript
Animated.spring(scaleAnim, {
  toValue: 1,
  tension: 50,
  friction: 7,
  useNativeDriver: true,
})
```

### 2. Entrada do Texto
**Tipo:** Slide Up + Fade In
- Translação Y de 50px → 0px (sobe)
- Fade in de 0 → 1 (opacidade)
- Duração: 500ms
- Efeito: Texto desliza de baixo para cima

### 3. Botão "Próximo/Começar"
**Tipo:** Pulse Loop (contínuo)
- Escala de 1.0 → 1.05 → 1.0
- Duração: 2s (1s para crescer, 1s para voltar)
- Loop infinito
- Efeito: Botão "respira" chamando atenção

### 4. Botão "Pular"
**Tipo:** Fade In + Estilo Melhorado
- Fade in sincronizado com o slide
- Background branco semi-transparente
- Sombra suave
- Cor vermelha (#DC2626) para destaque

### 5. Paginação (Dots)
**Tipo:** Width + Opacity Interpolation
- Dot ativo: largura 30px, opacidade 1.0
- Dots inativos: largura 10px, opacidade 0.3
- Transição suave baseada no scroll
- Efeito: Dot ativo "cresce" e fica mais visível

### 6. Transição entre Slides
**Tipo:** Reset + Replay
- Ao mudar de slide, todas as animações resetam
- Novas animações iniciam automaticamente
- Efeito: Cada slide tem sua própria "entrada"

## AuthChoiceScreen - Animações de Entrada

### 1. Logo (Ícone)
**Tipo:** Scale + Rotation 360°
- Escala de 0 → 1.0 (zoom in)
- Rotação de 0° → 360° (giro completo)
- Duração: 800ms
- Efeito: Logo "gira" entrando na tela

```javascript
Animated.spring(logoScale, {
  toValue: 1,
  tension: 50,
  friction: 7,
  useNativeDriver: true,
})
```

### 2. Texto do Logo
**Tipo:** Fade In + Slide Up
- Fade in de 0 → 1
- Translação Y de 50px → 0px
- Duração: 500ms
- Efeito: Texto aparece deslizando de baixo

### 3. Botão "Criar Conta"
**Tipo:** Spring Scale (delay 200ms)
- Escala de 0.8 → 1.0
- Delay de 200ms após o logo
- Spring animation (efeito elástico)
- Sombra forte para destaque

### 4. Botão "Já tenho conta"
**Tipo:** Spring Scale (delay 300ms)
- Escala de 0.8 → 1.0
- Delay de 300ms após o logo
- Spring animation (efeito elástico)
- Background semi-transparente + sombra

### 5. Círculos Decorativos (3 círculos)
**Tipo:** Loop Infinito com Movimentos Diferentes

#### Círculo 1 (topo direita)
- Translação Y: 0 → -20px → 0
- Escala: 1.0 → 1.2 → 1.0
- Duração: 6s (3s ida, 3s volta)
- Efeito: Flutua para cima e cresce

#### Círculo 2 (baixo esquerda)
- Translação X: 0 → 20px → 0
- Duração: 8s (4s ida, 4s volta)
- Efeito: Flutua para direita

#### Círculo 3 (meio direita)
- Escala: 1.0 → 1.2 → 1.0
- Duração: 7s (3.5s ida, 3.5s volta)
- Efeito: Pulsa (cresce e diminui)

### 6. Sequência de Entrada
1. Logo aparece com rotação (800ms)
2. Texto aparece deslizando (500ms)
3. Botão 1 aparece (delay 200ms)
4. Botão 2 aparece (delay 300ms)
5. Círculos começam animação contínua

## Melhorias Visuais

### Sombras
- Ícones dos slides: sombra suave (elevation 12)
- Botão "Pular": sombra leve (elevation 3)
- Botão "Próximo": sombra forte vermelha (elevation 8)
- Logo: sombra forte (elevation 16)
- Botões AuthChoice: sombras fortes (elevation 12 e 4)

### Cores e Transparências
- Botão "Pular": background branco 90% opaco
- Círculos decorativos: branco 5-10% opaco
- Botão secundário: background branco 10% opaco

### Efeitos de Toque
- `activeOpacity={0.8}` em todos os botões
- Feedback visual ao pressionar
- Transição suave

## Performance

### Otimizações
- `useNativeDriver: true` em todas as animações
- Animações rodando na thread nativa (60 FPS)
- Sem re-renders desnecessários
- Animações leves e fluidas

### Tipos de Animação Usados
1. **Animated.timing** - Transições lineares/suaves
2. **Animated.spring** - Efeitos elásticos naturais
3. **Animated.loop** - Animações contínuas
4. **Animated.sequence** - Animações em sequência
5. **Animated.parallel** - Animações simultâneas
6. **interpolate** - Transformações de valores

## Experiência do Usuário

### Primeira Impressão
- Logo rotacionando cria impacto visual
- Animações suaves transmitem qualidade
- Pulse no botão guia o usuário

### Feedback Visual
- Cada ação tem resposta visual
- Transições suaves entre telas
- Elementos decorativos dão vida à interface

### Fluidez
- 60 FPS garantidos
- Sem travamentos
- Transições naturais

## Código de Exemplo

### Reset de Animações (OnboardingScreen)
```javascript
const viewableItemsChanged = useRef(({ viewableItems }) => {
  if (viewableItems.length > 0) {
    // Reset animações para novo slide
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.3);
    slideUpAnim.setValue(50);
    setCurrentIndex(viewableItems[0].index);
  }
}).current;
```

### Animação de Loop (AuthChoiceScreen)
```javascript
Animated.loop(
  Animated.sequence([
    Animated.timing(circle1Anim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: true,
    }),
    Animated.timing(circle1Anim, {
      toValue: 0,
      duration: 3000,
      useNativeDriver: true,
    }),
  ])
).start();
```

## Resultado Final

- Onboarding profissional e moderno
- Primeira impressão memorável
- Experiência fluida e agradável
- Animações que guiam o usuário
- Performance otimizada (60 FPS)
