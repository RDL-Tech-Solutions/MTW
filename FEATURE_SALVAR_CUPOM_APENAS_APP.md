# 📱 Feature: Salvar Cupom Apenas no App

## 🎯 Objetivo

Permitir que o admin crie cupons que apareçam apenas no app mobile, sem enviar notificações para os canais (Telegram/WhatsApp).

## ✅ Implementação

### 1. Frontend (Admin Panel)

#### Novo Botão no Modal
Adicionado botão "📱 Salvar Apenas no App" no modal de criação de cupons:

```jsx
// admin-panel/src/pages/Coupons.jsx

<DialogFooter>
  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
    Cancelar
  </Button>
  
  {!editingCoupon && (
    <Button 
      variant="secondary" 
      onClick={(e) => handleSubmit(e, true)}
      className="bg-blue-100 hover:bg-blue-200 text-blue-700"
    >
      📱 Salvar Apenas no App
    </Button>
  )}
  
  <Button type="submit">
    {editingCoupon ? 'Salvar' : '📢 Criar e Publicar'}
  </Button>
</DialogFooter>
```

#### Modificação no handleSubmit
Adicionado parâmetro `skipNotifications` para controlar o envio de notificações:

```javascript
const handleSubmit = async (e, skipNotifications = false) => {
  e.preventDefault();
  
  // ... validações ...
  
  const submitData = {
    // ... dados do cupom ...
    skip_notifications: skipNotifications // Flag para pular notificações
  };
  
  // ... envio para API ...
  
  if (skipNotifications) {
    alert('Cupom salvo com sucesso! Disponível apenas no app (sem notificações nos canais).');
  }
};
```

### 2. Backend (Controller)

#### Modificação no CouponController.create()
Adicionada lógica para verificar flag `skip_notifications`:

```javascript
// backend/src/controllers/couponController.js

static async create(req, res, next) {
  try {
    // Extrair flag skip_notifications
    const { skip_notifications, ...couponData } = req.body;
    const skipNotifications = skip_notifications === true;

    const coupon = await Coupon.create(couponData);
    
    // Enviar notificação APENAS se skip_notifications for false
    if (!skipNotifications) {
      await couponNotificationService.notifyNewCoupon(coupon);
      logger.info(`✅ Notificação enviada para cupom: ${coupon.code}`);
    } else {
      logger.info(`📱 Cupom criado apenas para o app (sem notificações): ${coupon.code}`);
    }
    
    res.status(201).json(successResponse(coupon, 'Cupom criado com sucesso'));
  } catch (error) {
    next(error);
  }
}
```

## 🔄 Fluxo de Uso

### Opção 1: Criar e Publicar (Padrão)
```
1. Admin preenche formulário de cupom
   ↓
2. Clica em "📢 Criar e Publicar"
   ↓
3. Cupom é salvo no banco
   ↓
4. Notificações são enviadas para:
   - Telegram ✅
   - WhatsApp ✅
   - Push Notifications ✅
   ↓
5. Cupom aparece no app ✅
```

### Opção 2: Salvar Apenas no App (Novo)
```
1. Admin preenche formulário de cupom
   ↓
2. Clica em "📱 Salvar Apenas no App"
   ↓
3. Cupom é salvo no banco
   ↓
4. Notificações NÃO são enviadas:
   - Telegram ❌
   - WhatsApp ❌
   - Push Notifications ❌
   ↓
5. Cupom aparece APENAS no app ✅
```

## 📊 Comparação

| Aspecto | Criar e Publicar | Salvar Apenas no App |
|---------|------------------|----------------------|
| Salva no banco | ✅ Sim | ✅ Sim |
| Aparece no app | ✅ Sim | ✅ Sim |
| Telegram | ✅ Envia | ❌ Não envia |
| WhatsApp | ✅ Envia | ❌ Não envia |
| Push Notifications | ✅ Envia | ❌ Não envia |
| Uso | Cupons públicos | Cupons exclusivos do app |

## 🎨 Interface

### Botões no Modal:
```
┌─────────────────────────────────────────────┐
│  Novo Cupom                            [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  [Formulário de cupom]                      │
│                                             │
├─────────────────────────────────────────────┤
│  [Cancelar]  [📱 Salvar Apenas no App]     │
│                      [📢 Criar e Publicar]  │
└─────────────────────────────────────────────┘
```

### Cores e Estilos:
- **Cancelar**: Outline (cinza)
- **📱 Salvar Apenas no App**: Secondary (azul claro)
- **📢 Criar e Publicar**: Primary (vermelho/principal)

## 🧪 Como Testar

### Teste 1: Criar e Publicar (Padrão)
```bash
1. Abrir admin panel
2. Ir em "Cupons" > "Novo Cupom"
3. Preencher formulário:
   - Código: "TESTE10"
   - Plataforma: "Shopee"
   - Desconto: 10%
4. Clicar em "📢 Criar e Publicar"
5. Verificar:
   ✅ Cupom salvo no banco
   ✅ Notificação enviada ao Telegram
   ✅ Notificação enviada ao WhatsApp
   ✅ Push notification enviada
   ✅ Cupom aparece no app
```

### Teste 2: Salvar Apenas no App
```bash
1. Abrir admin panel
2. Ir em "Cupons" > "Novo Cupom"
3. Preencher formulário:
   - Código: "APPONLY15"
   - Plataforma: "Amazon"
   - Desconto: 15%
4. Clicar em "📱 Salvar Apenas no App"
5. Verificar:
   ✅ Cupom salvo no banco
   ❌ Nenhuma notificação no Telegram
   ❌ Nenhuma notificação no WhatsApp
   ❌ Nenhuma push notification
   ✅ Cupom aparece no app
   ✅ Alerta: "Cupom salvo com sucesso! Disponível apenas no app"
```

### Teste 3: Edição de Cupom
```bash
1. Editar cupom existente
2. Verificar:
   ✅ Botão "📱 Salvar Apenas no App" NÃO aparece
   ✅ Apenas botão "Salvar" aparece
   ✅ Edição não envia notificações (comportamento padrão)
```

## 📝 Logs do Backend

### Criar e Publicar:
```
📝 Criando novo cupom...
✅ Cupom criado com sucesso: TESTE10 (ID: 123)
   Skip notifications: false
📢 Iniciando envio de notificação para cupom: TESTE10
✅ Notificação enviada com sucesso para cupom: TESTE10
```

### Salvar Apenas no App:
```
📝 Criando novo cupom...
✅ Cupom criado com sucesso: APPONLY15 (ID: 124)
   Skip notifications: true
📱 Cupom criado apenas para o app (sem notificações nos canais): APPONLY15
```

## 🎯 Casos de Uso

### 1. Cupons Exclusivos do App
Cupons que você quer disponibilizar apenas para usuários do app, sem divulgar nos canais públicos.

### 2. Testes Internos
Criar cupons de teste sem notificar todos os usuários dos canais.

### 3. Cupons Personalizados
Cupons específicos que serão compartilhados manualmente, não via broadcast.

### 4. Cupons de Parceiros
Cupons fornecidos por parceiros que devem aparecer no app mas não nos canais públicos.

## ⚠️ Observações

1. **Apenas na Criação**: O botão "📱 Salvar Apenas no App" aparece apenas ao criar novos cupons, não na edição.

2. **Não Afeta o App**: Cupons salvos apenas no app aparecem normalmente na lista de cupons do app mobile.

3. **Pode Publicar Depois**: Se necessário, o admin pode usar "Forçar Publicação" para enviar notificações posteriormente.

4. **Logs Claros**: Os logs do backend indicam claramente quando um cupom foi criado sem notificações.

5. **Retrocompatível**: Cupons criados sem a flag `skip_notifications` funcionam normalmente (enviam notificações).

## 📁 Arquivos Modificados

- ✅ `admin-panel/src/pages/Coupons.jsx`
  - Adicionado botão "📱 Salvar Apenas no App"
  - Modificado `handleSubmit()` para aceitar parâmetro `skipNotifications`
  - Atualizado texto do botão principal para "📢 Criar e Publicar"

- ✅ `backend/src/controllers/couponController.js`
  - Modificado `create()` para verificar flag `skip_notifications`
  - Adicionados logs para indicar modo de criação

## ✅ Checklist de Validação

- [ ] Botão "📱 Salvar Apenas no App" aparece no modal de criação
- [ ] Botão NÃO aparece no modal de edição
- [ ] Clicar no botão salva cupom sem enviar notificações
- [ ] Alerta de sucesso diferenciado é exibido
- [ ] Cupom aparece no app mobile
- [ ] Nenhuma notificação é enviada ao Telegram
- [ ] Nenhuma notificação é enviada ao WhatsApp
- [ ] Nenhuma push notification é enviada
- [ ] Logs do backend indicam "Skip notifications: true"
- [ ] Botão "📢 Criar e Publicar" continua funcionando normalmente

## 🚀 Próximos Passos

1. ✅ Testar criação de cupom com ambos os botões
2. ✅ Verificar que cupom aparece no app
3. ✅ Validar que notificações não são enviadas
4. ✅ Confirmar logs do backend
5. ✅ Testar em produção
