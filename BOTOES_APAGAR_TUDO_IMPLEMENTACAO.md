# Implementação dos Botões "Apagar Tudo em Lote"

## Resumo
Implementados botões "Apagar Tudo" em 3 páginas do admin panel com diferentes níveis de segurança conforme solicitado.

## Implementações

### 1. `/products` - Produtos Aprovados
**Rota Backend**: `DELETE /api/products/bulk/all-approved`
**Segurança**: ✅ REQUER SENHA DO ADMINISTRADOR

**Funcionalidades**:
- Botão "Apagar Todos" exibido quando há produtos aprovados
- Modal de confirmação com campo de senha
- Validação de senha usando bcrypt no backend
- Feedback visual durante o processo (loading state)
- Toast de sucesso/erro após a operação

**Componentes**:
- `PasswordConfirmDialog`: Modal reutilizável para solicitar senha
- Validação de senha no backend comparando com `user.password_hash`

**Código**:
```javascript
// Backend: productController.js
static async deleteAllApproved(req, res, next) {
  const { password } = req.body;
  const userId = req.user.id;
  
  // Validar senha
  const user = await User.findById(userId);
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  
  if (!isPasswordValid) {
    return res.status(401).json(errorResponse('Senha incorreta', 'INVALID_PASSWORD'));
  }
  
  // Deletar todos produtos aprovados
  // ...
}
```

### 2. `/pending-products` - Produtos Pendentes
**Rota Backend**: `DELETE /api/products/bulk/all-pending`
**Segurança**: ⚠️ SEM SENHA (apenas confirmação)

**Funcionalidades**:
- Botão "Apagar Todos" exibido quando há produtos pendentes
- Confirmação via `window.confirm()` com mensagem de aviso
- Feedback visual durante o processo
- Toast de sucesso/erro após a operação

**Justificativa**: Produtos pendentes ainda não foram aprovados, então não requerem senha para deletar em massa.

### 3. `/coupons` - Cupons (Todos e Pendentes)
**Rota Backend**: `DELETE /api/coupons/bulk/all`
**Segurança**: ⚠️ SEM SENHA (apenas confirmação)

**Funcionalidades**:
- Botão "Apagar Todos" exibido em ambas as abas (Todos/Pendentes)
- Confirmação via `window.confirm()` com mensagem de aviso
- Detecta automaticamente qual aba está ativa
- Feedback visual durante o processo
- Toast de sucesso/erro após a operação

**Justificativa**: Cupons podem ser recriados facilmente, então não requerem senha para deletar em massa.

## Rotas Backend Implementadas

### Products
```javascript
// productRoutes.js
router.delete('/bulk/all-approved', authenticateToken, requireAdmin, ProductController.deleteAllApproved);
router.delete('/bulk/all-pending', authenticateToken, requireAdmin, ProductController.deleteAllPending);
```

### Coupons
```javascript
// couponRoutes.js
router.delete('/bulk/all', authenticateToken, requireAdmin, CouponController.deleteAll);
```

## Componentes Criados

### PasswordConfirmDialog
**Localização**: `admin-panel/src/components/ui/PasswordConfirmDialog.jsx`

**Props**:
- `open`: boolean - Controla visibilidade do modal
- `onOpenChange`: function - Callback para fechar o modal
- `onConfirm`: function - Callback executado ao confirmar (recebe a senha)
- `title`: string - Título do modal
- `description`: string - Descrição/aviso
- `confirmText`: string - Texto do botão de confirmação
- `loading`: boolean - Estado de loading

**Uso**:
```jsx
<PasswordConfirmDialog
  open={isDeleteAllDialogOpen}
  onOpenChange={setIsDeleteAllDialogOpen}
  onConfirm={handleDeleteAll}
  title="Apagar Todos os Produtos Aprovados"
  description="Você está prestes a deletar TODOS os produtos. Esta ação é IRREVERSÍVEL."
  confirmText="Apagar Todos"
  loading={processingActions.deletingAll}
/>
```

## Segurança

### Validação de Senha (Products Aprovados)
1. Usuário digita senha no modal
2. Frontend envia senha no body da requisição
3. Backend busca usuário pelo ID (do token JWT)
4. Backend compara senha usando `bcrypt.compare()`
5. Se senha incorreta, retorna erro 401
6. Se senha correta, executa a deleção

### Autenticação
Todas as rotas requerem:
- `authenticateToken`: Valida token JWT
- `requireAdmin`: Verifica se usuário é admin

## Estados de Loading

Cada página possui estados para controlar o loading:
- `Products.jsx`: `processingActions.deletingAll`
- `PendingProducts.jsx`: `deletingAll`
- `Coupons.jsx`: `deletingAll`

## Mensagens de Feedback

### Sucesso
```javascript
toast({
  title: "Sucesso!",
  description: "X produtos/cupons deletados com sucesso.",
  variant: "success",
});
```

### Erro
```javascript
toast({
  title: "Erro!",
  description: error.response?.data?.error || "Erro ao deletar.",
  variant: "destructive",
});
```

## Testes Recomendados

### Products (com senha)
1. ✅ Tentar deletar com senha correta
2. ✅ Tentar deletar com senha incorreta
3. ✅ Verificar se todos os produtos foram deletados
4. ✅ Verificar feedback visual (loading, toast)

### Pending Products (sem senha)
1. ✅ Confirmar deleção
2. ✅ Cancelar deleção
3. ✅ Verificar se todos os produtos pendentes foram deletados
4. ✅ Verificar feedback visual

### Coupons (sem senha)
1. ✅ Deletar todos na aba "Todos os Cupons"
2. ✅ Deletar todos na aba "Pendentes"
3. ✅ Verificar se cupons foram deletados corretamente
4. ✅ Verificar feedback visual

## Observações

1. **Ação Irreversível**: Todas as deleções são permanentes e não podem ser desfeitas
2. **Confirmação Dupla**: Products aprovados requerem senha + confirmação
3. **Feedback Claro**: Mensagens informam quantos itens serão deletados
4. **Loading States**: Botões ficam desabilitados durante o processo
5. **Responsivo**: Botões adaptam-se a telas mobile e desktop

## Arquivos Modificados

### Backend
- `backend/src/routes/productRoutes.js`
- `backend/src/routes/couponRoutes.js`
- `backend/src/controllers/productController.js` (métodos já existiam)
- `backend/src/controllers/couponController.js` (método `deleteAll` adicionado)

### Frontend
- `admin-panel/src/components/ui/PasswordConfirmDialog.jsx` (NOVO)
- `admin-panel/src/pages/Products.jsx`
- `admin-panel/src/pages/PendingProducts.jsx`
- `admin-panel/src/pages/Coupons.jsx`

## Conclusão

Implementação completa dos botões "Apagar Tudo em Lote" nas 3 páginas solicitadas:
- ✅ `/products` - COM validação de senha
- ✅ `/pending-products` - SEM senha (apenas confirmação)
- ✅ `/coupons` - SEM senha (apenas confirmação)

Todas as funcionalidades incluem feedback visual, estados de loading, e mensagens claras para o usuário.
