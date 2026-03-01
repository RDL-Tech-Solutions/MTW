# ✅ Checklist de Validação - Sistema de Notificações Push

## 📋 Checklist Completo

### 🔧 Configuração Inicial

- [ ] **Backend rodando**
  - [ ] `npm start` ou `node src/server.js`
  - [ ] Porta 3000 acessível
  - [ ] Variáveis de ambiente configuradas

- [ ] **OneSignal configurado**
  - [ ] `ONESIGNAL_APP_ID` definido
  - [ ] `ONESIGNAL_REST_API_KEY` definido
  - [ ] `ONESIGNAL_ENABLED=true`
  - [ ] Dashboard OneSignal acessível

- [ ] **Build nativo criado**
  - [ ] `npx expo prebuild` executado
  - [ ] `npx expo run:android` funcionando
  - [ ] App instalado em dispositivo físico

### 📱 App - Inicialização

- [ ] **OneSignal inicializa**
  - [ ] Log: "🔔 Inicializando OneSignal..."
  - [ ] Log: "✅ OneSignal inicializado com sucesso"
  - [ ] Sem erros no console

- [ ] **Permissão solicitada**
  - [ ] Dialog de permissão aparece no primeiro login
  - [ ] Funciona no Android 13+
  - [ ] Funciona no iOS

- [ ] **Usuário registrado**
  - [ ] Log: "🔐 Registrando usuário no OneSignal após autenticação"
  - [ ] Log: "✅ Login no OneSignal realizado: [user_id]"
  - [ ] Log: "📱 Player ID: [player_id]"
  - [ ] Log: "📱 Push Token: true"

### 🏷️ Tags e Preferências

- [ ] **Preferências carregam**
  - [ ] Tela Settings → Notification Settings abre
  - [ ] Preferências existentes aparecem
  - [ ] Pode adicionar categorias
  - [ ] Pode adicionar palavras-chave
  - [ ] Pode adicionar nomes de produtos

- [ ] **Tags sincronizam**
  - [ ] Ao salvar preferências, log: "Tags OneSignal sincronizadas"
  - [ ] No OneSignal Dashboard, usuário tem tags
  - [ ] Tags incluem: categories, keywords, product_names
  - [ ] Tags incluem: home_platforms, home_categories

### 🔔 Envio de Notificações

- [ ] **Notificação de teste**
  - [ ] Endpoint `/api/notifications/test-push` funciona
  - [ ] Notificação chega no dispositivo
  - [ ] Título e mensagem corretos
  - [ ] Ícone do app aparece

- [ ] **Notificação em diferentes estados**
  - [ ] **Foreground** (app aberto)
    - [ ] Notificação aparece
    - [ ] Log: "🔔 Notificação recebida em foreground"
  - [ ] **Background** (app minimizado)
    - [ ] Notificação na barra
    - [ ] Som/vibração funciona
  - [ ] **Fechado** (app não está rodando)
    - [ ] Notificação na barra
    - [ ] Abre o app ao clicar

### 🧭 Deep Linking

- [ ] **Navegação funciona**
  - [ ] Clicar em notificação abre o app
  - [ ] Log: "👆 Notificação clicada"
  - [ ] Log: "🧭 Navegando baseado na notificação"
  - [ ] Log: "→ Navegando para [screen]"

- [ ] **Telas corretas**
  - [ ] `type: "new_product"` → ProductDetails
  - [ ] `type: "new_coupon"` → CouponDetails
  - [ ] `type: "price_drop"` → ProductDetails
  - [ ] `screen: "Home"` → Home
  - [ ] Parâmetros (id) passados corretamente

### 📊 Debug Component

- [ ] **Component aparece**
  - [ ] Settings → Seção DEBUG (apenas em DEV)
  - [ ] Mostra status de inicialização
  - [ ] Mostra permissão
  - [ ] Mostra User ID
  - [ ] Mostra Player ID
  - [ ] Mostra Push Token
  - [ ] Mostra Subscribed

- [ ] **Botões funcionam**
  - [ ] "Solicitar Permissão" funciona
  - [ ] "Re-registrar Usuário" funciona
  - [ ] "Atualizar Status" funciona
  - [ ] Status atualiza após ações

### 🔄 Backend - Cron Jobs

- [ ] **Cron job roda**
  - [ ] `/api/cron/send-notifications` acessível
  - [ ] Log: "🔄 Enviando notificações pendentes via OneSignal..."
  - [ ] Notificações são enviadas
  - [ ] Log: "✅ X notificações enviadas, Y falharam"

- [ ] **Retry funciona**
  - [ ] Falhas são retentadas
  - [ ] Log: "⚠️ Tentativa X falhou, tentando novamente..."
  - [ ] Máximo 3 tentativas
  - [ ] Delay de 5s entre tentativas

### 🎯 OneSignal Dashboard

- [ ] **Usuário aparece**
  - [ ] Audience → All Users
  - [ ] Procurar por External User ID
  - [ ] Device Type: Android
  - [ ] Subscribed: Yes
  - [ ] Last Active: recente

- [ ] **Tags aparecem**
  - [ ] Usuário tem tags
  - [ ] Tags corretas (categories, keywords, etc.)
  - [ ] Tags atualizadas ao mudar preferências

- [ ] **Notificações enviadas**
  - [ ] Messages → Sent Messages
  - [ ] Notificações aparecem
  - [ ] Status: Delivered
  - [ ] Recipients > 0

### 🐛 Troubleshooting

- [ ] **Logs detalhados**
  - [ ] App: Logs no console
  - [ ] Backend: Logs no terminal
  - [ ] OneSignal: Logs no dashboard

- [ ] **Erros tratados**
  - [ ] Sem crashes
  - [ ] Erros logados
  - [ ] Fallbacks funcionam

### 📈 Performance

- [ ] **Sem lentidão**
  - [ ] App abre rápido
  - [ ] Notificações chegam rápido
  - [ ] Navegação fluida

- [ ] **Sem vazamento de memória**
  - [ ] App não trava
  - [ ] Uso de memória estável

## 🎯 Critérios de Aceitação

### Mínimo Viável (MVP)
- ✅ Permissão solicitada
- ✅ Usuário registrado no OneSignal
- ✅ Notificação de teste chega
- ✅ Deep linking funciona

### Completo
- ✅ Todos os itens do MVP
- ✅ Tags sincronizadas
- ✅ Preferências funcionam
- ✅ Retry implementado
- ✅ Debug component funciona
- ✅ Logs detalhados

### Produção
- ✅ Todos os itens Completo
- ✅ Testado em múltiplos dispositivos
- ✅ Testado em Android e iOS
- ✅ Sem erros em 24h de uso
- ✅ Performance aceitável

## 📝 Notas de Teste

### Dispositivos Testados
- [ ] Android 13+
- [ ] Android 11-12
- [ ] Android 9-10
- [ ] iOS 16+
- [ ] iOS 14-15

### Cenários Testados
- [ ] Primeiro login (novo usuário)
- [ ] Login existente
- [ ] Logout e login novamente
- [ ] Permissão negada
- [ ] Permissão concedida depois
- [ ] Sem internet
- [ ] Internet lenta
- [ ] App em background
- [ ] App fechado
- [ ] Múltiplas notificações
- [ ] Notificação com imagem
- [ ] Notificação sem imagem

### Problemas Encontrados
```
[Anotar aqui qualquer problema encontrado durante os testes]

Exemplo:
- Data: 2024-XX-XX
- Problema: Notificação não chega em background
- Dispositivo: Samsung Galaxy S21, Android 13
- Solução: [descrever solução]
```

## ✅ Aprovação Final

- [ ] Todos os testes passaram
- [ ] Sem problemas críticos
- [ ] Documentação completa
- [ ] Código revisado
- [ ] Pronto para produção

---

**Testado por:** _________________
**Data:** _________________
**Versão:** _________________
**Status:** [ ] Aprovado [ ] Reprovado [ ] Pendente
