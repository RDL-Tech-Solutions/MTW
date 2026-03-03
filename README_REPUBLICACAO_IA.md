# 🤖 Republicação Automática com IA

## 📝 O que é?

Sistema que usa IA para republicar produtos aprovados de forma inteligente e estratégica.

## ✨ Benefícios

- 🎯 **Automático**: IA decide quando e como republicar
- 📅 **Estratégico**: Distribui em 7 dias, horários de pico
- 🚫 **Sem Spam**: Máximo 5 produtos/dia, espaçados
- 🔥 **Prioriza**: Melhores ofertas primeiro
- 💰 **Cupons**: Produtos com cupom têm prioridade

## 🚀 Como Usar (3 passos)

### 1. Executar SQL no Supabase
```sql
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS auto_republish_enabled BOOLEAN DEFAULT false;
```

### 2. Testar
```bash
node backend/scripts/test-auto-republish.js
```

### 3. Usar no Admin
1. Acesse `/products`
2. Clique **"Ativar IA"**
3. Clique **"Republicar Agora"**
4. Veja agendamentos em `/scheduled-posts`

## 📁 Arquivos

### Código
- `backend/src/services/autoRepublishService.js` - Serviço principal
- `backend/src/controllers/autoRepublishController.js` - Controller
- `backend/src/routes/autoRepublishRoutes.js` - Rotas
- `admin-panel/src/pages/Products.jsx` - Interface (modificado)

### Scripts
- `backend/scripts/test-auto-republish.js` - Teste completo

### Documentação
- `GUIA_RAPIDO_REPUBLICACAO_IA.md` - Guia rápido
- `TESTE_REPUBLICACAO_IA.md` - Instruções de teste
- `REPUBLICACAO_AUTOMATICA_IA.md` - Documentação técnica
- `RESUMO_REPUBLICACAO_IA.md` - Resumo detalhado

## 🎯 Exemplo

**Antes**: 25 produtos aprovados, sem agendamento

**Depois de clicar "Republicar Agora"**:
- ✅ 15 produtos agendados
- 📅 Distribuídos em 3 dias
- ⏰ Horários: 10h, 12h, 14h, 16h, 19h
- 🔥 Prioridade: Maior desconto primeiro

## 📊 Estratégia da IA

```
Dia 1: 5 produtos (melhores ofertas)
  10:00 - iPhone 14 Pro 60% OFF + Cupom
  12:00 - Galaxy S23 50% OFF + Cupom
  14:00 - Notebook Dell 40% OFF
  16:00 - Mouse Gamer 35% OFF
  19:00 - Teclado RGB 30% OFF

Dia 2: 5 produtos (ofertas médias)
  10:00 - Fone Bluetooth 25% OFF
  ...

Dia 3: 5 produtos (ofertas menores)
  10:00 - Cabo USB 15% OFF
  ...
```

## 🔧 Requisitos

- ✅ OpenRouter configurado (já está!)
- ✅ Produtos com status "approved"
- ✅ Cron jobs ativos

## 🎨 Interface

### Botões em /products
```
[Ativar IA] → [IA Ativa 🧠] [Republicar Agora ⚡]
```

### Card Informativo
```
┌──────────────────────────────────────┐
│ 🧠 Republicação Automática Ativada   │
│                                       │
│ ⚡ Prioriza melhores ofertas         │
│ 📅 Distribui ao longo de 7 dias      │
│ 🧠 Evita repetições                  │
└──────────────────────────────────────┘
```

## 🐛 Problemas?

### Sem produtos para republicar
→ Aprove produtos em `/products` primeiro

### Erro ao executar
→ Execute: `node backend/scripts/test-auto-republish.js`

### Agendamentos não publicam
→ Verifique: `GET /api/scheduled-posts/debug`

## 📚 Documentação Completa

- **Guia Rápido**: `GUIA_RAPIDO_REPUBLICACAO_IA.md`
- **Teste**: `TESTE_REPUBLICACAO_IA.md`
- **Técnica**: `REPUBLICACAO_AUTOMATICA_IA.md`

## ✅ Status

🟢 **Pronto para uso!**

Todos os arquivos criados, testados e documentados.

---

**Dúvidas?** Consulte os arquivos de documentação acima.
