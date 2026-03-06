# Correção: Contador de Visualizações Não Funciona

## Problema Identificado
O contador de visualizações na tela de detalhes do produto sempre mostra "0", mesmo quando o produto é visualizado várias vezes.

## Causa Raiz
O app não estava registrando as visualizações dos produtos. Embora o código de tracking existisse no `productStore.js` (método `registerClick`), ele nunca era chamado na tela de detalhes do produto.

## Como Funciona o Sistema de Visualizações

### Backend
1. **Tabela `click_tracking`**: Armazena cada visualização/clique
   - `user_id`: ID do usuário (pode ser null para não autenticados)
   - `product_id`: ID do produto visualizado
   - `created_at`: Data/hora da visualização

2. **View `products_full`**: Calcula automaticamente o contador
   ```sql
   (SELECT COUNT(*) FROM click_tracking ct WHERE ct.product_id = p.id) as click_count
   ```

3. **Endpoint**: `POST /products/:id/click`
   - Registra uma nova visualização na tabela `click_tracking`
   - Requer autenticação (token JWT)

### Frontend
- **Store**: `productStore.js` tem o método `registerClick(productId)`
- **Problema**: Método nunca era chamado na tela de detalhes

## Solução Implementada

### Arquivo Modificado: `app/src/screens/product/ProductDetailsScreen.js`

#### 1. Adicionar `registerClick` ao destructuring do store
```javascript
// ANTES
const { addFavorite, removeFavorite, isFavorite, fetchProductById } = useProductStore();

// DEPOIS
const { addFavorite, removeFavorite, isFavorite, fetchProductById, registerClick } = useProductStore();
```

#### 2. Registrar visualização quando produto é carregado via ID
```javascript
const loadProduct = async () => {
  try {
    setLoading(true);
    const result = await fetchProductById(productId);
    if (result.success && result.product) {
      setProduct(result.product);
      setFavorite(isFavorite(result.product.id));
      // ✅ NOVO: Registrar visualização do produto
      registerClick(result.product.id);
    }
    // ...
  }
};
```

#### 3. Registrar visualização quando produto vem como parâmetro
```javascript
useEffect(() => {
  if (!initialProduct && productId) {
    loadProduct();
  } else if (!initialProduct && !productId) {
    Alert.alert('Erro', 'Produto não encontrado', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  } else if (initialProduct) {
    setFavorite(isFavorite(initialProduct.id));
    // ✅ NOVO: Registrar visualização do produto
    registerClick(initialProduct.id);
  }
  // ...
}, []);
```

## Comportamento Após Correção

### Quando o usuário abre um produto:
1. ✅ Tela carrega os dados do produto
2. ✅ Chamada automática para `registerClick(productId)`
3. ✅ Backend registra visualização na tabela `click_tracking`
4. ✅ Próxima vez que o produto for carregado, `click_count` será incrementado

### Exemplo de Fluxo:
```
Usuário abre produto ID 123
  ↓
ProductDetailsScreen carrega
  ↓
registerClick(123) é chamado
  ↓
POST /products/123/click
  ↓
INSERT INTO click_tracking (user_id, product_id)
  ↓
Contador incrementado na view products_full
```

## Observações Importantes

### 1. Autenticação Necessária
O endpoint `/products/:id/click` requer autenticação. Usuários não logados não terão suas visualizações contadas.

**Possível melhoria futura**: Permitir tracking anônimo (sem user_id) para contar todas as visualizações.

### 2. Tracking em Background
O método `registerClick` não bloqueia a UI:
```javascript
registerClick: async (productId) => {
  try {
    // Não bloquear a UI, fazer em background
    api.post(`/products/${productId}/click`).catch(err => {
      console.error('Erro ao registrar clique:', err);
    });
  } catch (error) {
    console.error('Erro ao registrar clique:', error);
  }
}
```

### 3. Contador Atualiza na Próxima Carga
O contador não atualiza em tempo real na tela atual. Será atualizado quando:
- Usuário sair e voltar para o produto
- Produto for recarregado do backend
- Lista de produtos for atualizada

## Teste de Validação

### Como testar:
1. Abrir o app e fazer login
2. Navegar para um produto
3. Verificar no console: `Erro ao registrar clique:` NÃO deve aparecer
4. Sair e voltar para o mesmo produto
5. Contador de visualizações deve ter incrementado

### Verificar no banco de dados:
```sql
-- Ver visualizações de um produto específico
SELECT COUNT(*) as total_views
FROM click_tracking
WHERE product_id = 123;

-- Ver últimas visualizações
SELECT ct.*, u.name as user_name, p.name as product_name
FROM click_tracking ct
LEFT JOIN users u ON ct.user_id = u.id
LEFT JOIN products p ON ct.product_id = p.id
ORDER BY ct.created_at DESC
LIMIT 10;
```

## Status
✅ **CORRIGIDO** - Visualizações agora são registradas automaticamente

## Arquivos Modificados
- `app/src/screens/product/ProductDetailsScreen.js`

## Próximos Passos (Opcional)
1. Considerar permitir tracking anônimo (sem autenticação)
2. Adicionar debounce para evitar múltiplos registros rápidos
3. Implementar atualização em tempo real do contador (WebSocket ou polling)
