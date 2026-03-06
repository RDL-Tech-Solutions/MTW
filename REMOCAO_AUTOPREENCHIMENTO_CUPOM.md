# Remoção: Autopreenchimento de Código de Cupom

## Problema
No modal de criar/editar cupom, quando o usuário digitava um código, o sistema automaticamente buscava cupons existentes e preenchia todos os campos do formulário. Isso causava confusão e comportamento indesejado.

## Comportamento Anterior
1. Usuário digitava código (mínimo 4 caracteres)
2. Sistema aguardava 800ms após parar de digitar
3. Buscava cupom na API da plataforma selecionada
4. Se não encontrasse, buscava no banco local
5. Se encontrasse, preenchia TODOS os campos automaticamente:
   - Plataforma
   - Descrição
   - Tipo de desconto
   - Valor do desconto
   - Compra mínima
   - Desconto máximo
   - Produtos aplicáveis
   - Datas de validade
   - Etc.

## Problemas Identificados
- Usuário perdia controle do formulário
- Campos eram sobrescritos sem aviso
- Confusão ao criar cupons novos com códigos similares
- Comportamento não intuitivo
- Spinner de loading desnecessário

## Solução Implementada
Removida completamente a lógica de autopreenchimento:

1. Função `handleCodeChange` simplificada:
   ```javascript
   const handleCodeChange = (code) => {
     const upperCode = code.toUpperCase().trim();
     setFormData({ ...formData, code: upperCode });
   };
   ```

2. Removidos estados desnecessários:
   - `isLoadingCoupon`
   - `codeSearchTimeout`

3. Removido useEffect de limpeza de timeout

4. Removidos elementos visuais:
   - Spinner de loading no input
   - Mensagem de dica de autopreenchimento
   - Handler onBlur que retriggava a busca
   - Chamada `setIsLoadingCoupon(false)` no onClick do botão "Novo Cupom"

5. Adicionado `autoComplete="off"` no input para evitar sugestões do navegador

## Arquivos Modificados
- `admin-panel/src/pages/Coupons.jsx`
  - Simplificada função `handleCodeChange` (linha ~118)
  - Removidos estados `isLoadingCoupon` e `codeSearchTimeout` (linha ~75)
  - Removido useEffect de cleanup (linha ~122)
  - Simplificado JSX do input de código (linha ~852)
  - Removida chamada `setIsLoadingCoupon(false)` do botão "Novo Cupom" (linha ~705)
  - Adicionado `autoComplete="off"`

## Comportamento Atual
- Input de código apenas converte para maiúsculas
- Nenhum autopreenchimento automático
- Usuário tem controle total do formulário
- Experiência mais previsível e intuitiva

## Teste
1. Abrir modal de criar cupom
2. Digitar código no campo "Código"
3. Verificar que:
   - Código é convertido para maiúsculas
   - Nenhum outro campo é preenchido automaticamente
   - Não aparece spinner de loading
   - Não há mensagem sobre autopreenchimento
   - Não há erros no console

## Erros Corrigidos
- ❌ `ReferenceError: setIsLoadingCoupon is not defined` (linha 705)
- ✅ Todas as referências a `isLoadingCoupon` e `setIsLoadingCoupon` removidas

## Status
✅ Removido - Autopreenchimento desabilitado completamente
✅ Sem erros no console
