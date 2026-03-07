# 🎨 Ícones da Extensão

## Como Gerar os Ícones

### Opção 1: Usar o Gerador HTML (Recomendado)

1. Abra o arquivo `generate-icons.html` no seu navegador
2. Clique em "Baixar Todos"
3. Salve os 3 arquivos PNG nesta pasta

### Opção 2: Converter o SVG Manualmente

Use um conversor online como:
- https://cloudconvert.com/svg-to-png
- https://convertio.co/svg-png/
- https://www.aconvert.com/image/svg-to-png/

Converta `icon.svg` para PNG nos seguintes tamanhos:
- 16x16 pixels → `icon16.png`
- 48x48 pixels → `icon48.png`
- 128x128 pixels → `icon128.png`

### Opção 3: Usar Ferramentas de Design

Se você tem Photoshop, Figma, Illustrator ou outra ferramenta:

1. Importe o arquivo `icon.svg`
2. Exporte nos tamanhos:
   - 16x16 pixels
   - 48x48 pixels
   - 128x128 pixels
3. Salve como PNG com os nomes corretos

## Design do Ícone

- **Fundo**: Gradiente roxo (#667eea → #764ba2)
- **Ícone**: Caixa/pacote branco
- **Badge**: Círculo verde com seta de download
- **Estilo**: Moderno, flat design

## Arquivos Necessários

```
icons/
├── icon16.png   (16x16 pixels)
├── icon48.png   (48x48 pixels)
└── icon128.png  (128x128 pixels)
```

## Verificação

Após gerar os ícones:

1. Verifique se os 3 arquivos PNG estão nesta pasta
2. Confirme os tamanhos corretos
3. Recarregue a extensão em `chrome://extensions/`
4. O ícone deve aparecer na barra de ferramentas do Chrome
