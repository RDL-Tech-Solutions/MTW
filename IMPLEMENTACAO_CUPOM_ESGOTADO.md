# 🎫 Implementação: Sistema de Cupom Esgotado

## 📋 Requisitos

1. ✅ Adicionar opção nos bots (Telegram e WhatsApp) para marcar cupom como esgotado
2. ✅ Atualizar campo `is_out_of_stock` no banco de dados
3. ✅ Enviar notificação para todos os canais que receberam o cupom
4. ✅ Atualizar template de "cupom expirado" para "cupom esgotado"
5. ✅ Refletir mudança no app mobile
6. ✅ Atualizar painel admin
7. ✅ Substituir toda lógica de "expirado" por "esgotado"

## 🗂️ Estrutura de Implementação

### 1. Backend

#### 1.1 Modelo Coupon
- ✅ Campo `is_out_of_stock` já existe
- ✅ Adicionar método `markAsOutOfStock(couponId)`
- ✅ Adicionar método `getChannelsWithCoupon(couponId)` - buscar canais que receberam o cupom

#### 1.2 Controller
- ✅ Endpoint `PUT /api/coupons/:id/out-of-stock` - marcar como esgotado
- ✅ Endpoint `PUT /api/coupons/:id/restore-stock` - restaurar estoque

#### 1.3 Serviço de Notificação
- ✅ Método `notifyCouponOutOfStock(coupon, channels)` - enviar para todos os canais
- ✅ Template de mensagem "Cupom Esgotado"

#### 1.4 Rotas
- ✅ Adicionar rotas no `couponRoutes.js`

### 2. Bots

#### 2.1 Bot Telegram Admin
- ✅ Comando `/cupons` - listar cupons ativos
- ✅ Botão "🚫 Marcar como Esgotado" em cada cupom
- ✅ Confirmação antes de marcar
- ✅ Feedback após marcar

#### 2.2 Bot WhatsApp Web
- ✅ Comando "cupons" - listar cupons ativos
- ✅ Opção para marcar como esgotado
- ✅ Confirmação e feedback

### 3. App Mobile

#### 3.1 Tela de Cupons
- ✅ Filtrar cupons esgotados (não exibir ou exibir com indicador)
- ✅ Badge "Esgotado" nos cupons
- ✅ Desabilitar botão de copiar código

#### 3.2 Detalhes do Cupom
- ✅ Mensagem "Cupom Esgotado" em destaque
- ✅ Desabilitar ações

### 4. Painel Admin

#### 4.1 Lista de Cupons
- ✅ Coluna "Status" com indicador de esgotado
- ✅ Filtro por status (ativo/esgotado)
- ✅ Ação "Marcar como Esgotado"
- ✅ Ação "Restaurar Estoque"

#### 4.2 Detalhes do Cupom
- ✅ Toggle para marcar/desmarcar como esgotado
- ✅ Histórico de mudanças

## 📝 Arquivos a Modificar

### Backend
1. `backend/src/models/Coupon.js` - Adicionar métodos
2. `backend/src/controllers/couponController.js` - Adicionar endpoints
3. `backend/src/routes/couponRoutes.js` - Adicionar rotas
4. `backend/src/services/bots/notificationDispatcher.js` - Template esgotado
5. `backend/src/models/NotificationLog.js` - Registrar notificações

### Bots
6. `backend/src/services/adminBot/handlers/couponHandler.js` - Criar handler
7. `backend/src/services/whatsappWeb/handlers/whatsappCouponHandler.js` - Criar handler

### App Mobile
8. `app/src/screens/coupons/CouponsScreen.js` - Filtrar esgotados
9. `app/src/components/coupons/CouponCard.js` - Badge esgotado
10. `app/src/screens/coupon/CouponDetailsScreen.js` - Desabilitar ações

### Painel Admin
11. `admin-panel/src/pages/Coupons.jsx` - Adicionar ações
12. `admin-panel/src/services/api.js` - Adicionar endpoints

## 🔄 Fluxo de Funcionamento

### Marcar Cupom como Esgotado

```
1. Admin acessa bot (Telegram/WhatsApp)
2. Lista cupons ativos
3. Seleciona cupom
4. Clica em "Marcar como Esgotado"
5. Confirma ação
6. Backend:
   - Atualiza is_out_of_stock = true
   - Busca todos os canais que receberam o cupom
   - Envia notificação "Cupom Esgotado" para cada canal
   - Registra no log
7. App Mobile:
   - Cupom aparece como esgotado
   - Botão de copiar desabilitado
8. Painel Admin:
   - Status atualizado
   - Indicador visual
```

### Restaurar Estoque

```
1. Admin acessa painel ou bot
2. Seleciona cupom esgotado
3. Clica em "Restaurar Estoque"
4. Backend:
   - Atualiza is_out_of_stock = false
5. App Mobile:
   - Cupom volta a aparecer como ativo
6. Painel Admin:
   - Status atualizado
```

## 📊 Template de Notificação

### Telegram
```
🚫 CUPOM ESGOTADO

O cupom abaixo não está mais disponível:

🎫 Código: [CODIGO]
🏪 Loja: [PLATAFORMA]
💰 Desconto: [VALOR]

❌ Este cupom esgotou e não pode mais ser utilizado.

Fique atento aos nossos canais para novos cupons!
```

### WhatsApp
```
🚫 *CUPOM ESGOTADO*

O cupom abaixo não está mais disponível:

🎫 *Código:* [CODIGO]
🏪 *Loja:* [PLATAFORMA]
💰 *Desconto:* [VALOR]

❌ Este cupom esgotou e não pode mais ser utilizado.

Fique atento aos nossos canais para novos cupons!
```

## 🎯 Prioridades

1. ✅ Backend (modelo, controller, rotas)
2. ✅ Serviço de notificação
3. ✅ Bot Telegram
4. ✅ Bot WhatsApp
5. ✅ App Mobile
6. ✅ Painel Admin

## 🧪 Testes

### Backend
- [ ] Marcar cupom como esgotado
- [ ] Restaurar estoque
- [ ] Buscar canais que receberam cupom
- [ ] Enviar notificações

### Bots
- [ ] Listar cupons ativos
- [ ] Marcar como esgotado
- [ ] Confirmação e feedback

### App
- [ ] Cupom esgotado não aparece ou aparece desabilitado
- [ ] Badge "Esgotado" visível
- [ ] Botão de copiar desabilitado

### Painel
- [ ] Filtrar por status
- [ ] Marcar/desmarcar como esgotado
- [ ] Indicador visual

## 📅 Cronograma

- Dia 1: Backend (modelo, controller, rotas, serviço)
- Dia 2: Bots (Telegram e WhatsApp)
- Dia 3: App Mobile
- Dia 4: Painel Admin
- Dia 5: Testes e ajustes
