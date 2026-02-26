# 📖 Guia de Uso: Sistema de Cupom Esgotado

## 🎯 Para que serve?

Este sistema permite que você marque cupons como "esgotados" quando eles não estiverem mais disponíveis. Quando você faz isso:

1. O cupom desaparece do app mobile automaticamente
2. Todos os canais que receberam o cupom são notificados
3. Usuários que visualizaram o cupom recebem notificação push

---

## 🤖 Como usar no Bot Telegram

### Passo 1: Listar Cupons
Digite no chat com o bot:
```
/cupons
```

### Passo 2: Selecionar Cupom
O bot vai mostrar uma lista de cupons ativos. Clique no cupom que deseja gerenciar.

### Passo 3: Marcar como Esgotado
Clique no botão **"🚫 Marcar como Esgotado"**

### Passo 4: Confirmar
O bot vai pedir confirmação. Clique em **"✅ Sim, marcar"**

### Passo 5: Pronto!
O bot vai:
- Marcar o cupom como esgotado
- Enviar notificações para todos os canais
- Mostrar quantas notificações foram enviadas

**Exemplo de feedback:**
```
✅ Cupom PROMO10 marcado como esgotado!

📊 Notificações enviadas:
• Telegram: 3 canais
• WhatsApp: 2 canais
• Push: 15 usuários
```

---

## 💬 Como usar no Bot WhatsApp

### Passo 1: Listar Cupons
Digite no chat com o bot:
```
cupons
```
ou
```
/cupons
```

### Passo 2: Selecionar Cupom
O bot vai mostrar uma lista numerada. Digite o número do cupom:
```
1
```

### Passo 3: Escolher Ação
O bot vai mostrar opções. Digite **1** para marcar como esgotado:
```
1
```

### Passo 4: Confirmar
O bot vai pedir confirmação. Digite **sim**:
```
sim
```

### Passo 5: Pronto!
O bot vai marcar o cupom e mostrar as estatísticas de notificações enviadas.

---

## 🖥️ Como usar no Painel Admin

### Passo 1: Acessar Cupons
Entre no painel admin e vá para a página **"Cupons"**

### Passo 2: Encontrar o Cupom
Use a busca ou navegue pela lista para encontrar o cupom

### Passo 3: Marcar como Esgotado
Clique no botão **"Esgotado"** (vermelho) na linha do cupom

### Passo 4: Confirmar
Uma mensagem de confirmação vai aparecer:
```
Deseja marcar o cupom PROMO10 como esgotado?

Isso irá:
• Remover o cupom do app mobile
• Notificar todos os canais que receberam este cupom
• Enviar notificação push para usuários que visualizaram
```

Clique em **"OK"**

### Passo 5: Pronto!
O cupom será marcado e você verá:
- Badge **"🚫 Esgotado"** na coluna Status
- Botão muda para **"Disponível"** (verde)
- Mensagem de sucesso

---

## 🔄 Como restaurar um cupom

### No Bot Telegram
Atualmente não há opção direta. Use o painel admin.

### No Bot WhatsApp
Atualmente não há opção direta. Use o painel admin.

### No Painel Admin
1. Encontre o cupom com badge **"🚫 Esgotado"**
2. Clique no botão **"Disponível"** (verde)
3. Confirme a ação
4. O cupom volta a aparecer no app mobile

---

## 📱 O que acontece no App Mobile?

### Quando você marca como esgotado:
- ✅ Cupom desaparece da lista imediatamente
- ✅ Se usuário estava vendo o cupom, botão fica desabilitado
- ✅ Código aparece riscado
- ✅ Mensagem "Cupom Esgotado" aparece

### Quando você restaura:
- ✅ Cupom volta a aparecer na lista
- ✅ Usuários podem copiar o código novamente
- ✅ Tudo volta ao normal

---

## 📢 Notificações Enviadas

### Canais Telegram
Todos os canais que receberam o cupom vão receber:
```
🚫 CUPOM ESGOTADO

O cupom PROMO10 foi esgotado e não está mais disponível.

📦 Plataforma: Mercado Livre
💰 Desconto: 10% OFF

⚠️ Este cupom não pode mais ser utilizado.
```

### Canais WhatsApp
Mesma mensagem, formatada para WhatsApp

### Usuários do App
Notificação push:
```
🚫 Cupom Esgotado
O cupom PROMO10 não está mais disponível
```

---

## ❓ Perguntas Frequentes

### Posso desfazer depois?
Sim! Use o botão "Disponível" no painel admin para restaurar o cupom.

### As notificações são enviadas automaticamente?
Sim! Assim que você marca como esgotado, todas as notificações são enviadas automaticamente.

### O cupom é deletado?
Não! O cupom continua no banco de dados, apenas fica marcado como esgotado.

### Posso ver quantas notificações foram enviadas?
Sim! O bot mostra as estatísticas logo após marcar como esgotado.

### O que acontece se eu restaurar o cupom?
O cupom volta a aparecer no app mobile normalmente. Nenhuma notificação é enviada.

### Posso marcar vários cupons de uma vez?
Não no momento. Você precisa marcar um por um.

---

## 🎯 Dicas de Uso

### Quando marcar como esgotado?
- Quando o cupom não funciona mais
- Quando a loja removeu o cupom
- Quando o limite de usos foi atingido
- Quando você quer remover temporariamente

### Quando restaurar?
- Quando o cupom volta a funcionar
- Quando a loja reativa o cupom
- Quando você marcou por engano

### Boas práticas
- ✅ Sempre confirme antes de marcar
- ✅ Verifique se o cupom realmente está esgotado
- ✅ Use o painel admin para restaurar
- ✅ Monitore as notificações enviadas

---

## 📞 Suporte

Se tiver dúvidas ou problemas:
1. Verifique este guia primeiro
2. Teste no painel admin (mais fácil)
3. Entre em contato com o suporte técnico

---

**Última atualização:** Fevereiro 2026
**Versão:** 1.0
