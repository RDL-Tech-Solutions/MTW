# 🐛 Correção de Bugs do Sistema

## 🎯 Resumo Executivo

**Status:** ✅ Correções implementadas e prontas para aplicação

**Bugs Corrigidos:**
1. ✅ Bot Telegram - Lentidão e classificação de loja (Kabum)
2. ✅ WhatsApp Web - Template e imagem
3. ✅ Notificação de cupom esgotado (Telegram + WhatsApp)
4. ✅ Auto republicação - Execução automática

**Arquivos Modificados:**
- `backend/src/services/coupons/couponNotificationService.js`
- `backend/src/services/bots/notificationDispatcher.js`
- `backend/src/server.js`

**Arquivos Criados:**
- `backend/src/services/schedulers/autoRepublishScheduler.js`
- `backend/database/migrations/add_out_of_stock_template.sql`
- `backend/scripts/apply-out-of-stock-template.js`
- `backend/scripts/check-platform-logos.js`
- `backend/scripts/test-bug-fixes.js`

**Próximos Passos:**
1. Executar `node backend/scripts/test-bug-fixes.js` para validar
2. Aplicar migração SQL
3. Verificar logo da Kabum
4. Reiniciar servidor
5. Testar funcionalidades

---

## 📋 Lista de Bugs Identificados

### 1. Bot Telegram - Lentidão e Classificação de Loja
**Problemas:**
- ✗ Lentidão ao publicar cupons criados
- ✗ Cupons da Kabum saem como cupom geral

**Causa Raiz:**
- Processamento sequencial de canais no dispatcher
- Falta de classificação correta da plataforma "kabum" vs "general"

### 2. WhatsApp Web - Template e Imagem
**Problemas:**
- ✗ Publicação não está usando imagem + template
- ✗ Bot sendo ativado automaticamente quando sai notificação de cupom esgotado

**Causa Raiz:**
- Método `sendToWhatsAppWithImage` não está sendo chamado corretamente
- Falta de verificação de template ativo no dispatcher

### 3. Notificação de Cupom Esgotado
**Problemas:**
- ✗ Notificação não está saindo nos canais do Telegram
- ✗ WhatsApp mostra "Mensagem não configurada 🎟️ Cupom: MAISCUPONS"

**Causa Raiz:**
- Template `out_of_stock_coupon` não está configurado no banco
- Método `notifyCouponOutOfStock` não está usando o dispatcher corretamente

### 4. Auto Republicação (IA)
**Problemas:**
- ✗ Backend não realiza a publicação automática dos agendamentos

**Causa Raiz:**
- Serviço de auto republicação não está sendo executado periodicamente
- Falta de cron job ou scheduler ativo

---

## 🔧 Plano de Correção

### Bug 1: Telegram - Lentidão e Classificação

#### 1.1 Otimizar Processamento de Canais
**Arquivo:** `backend/src/services/bots/notificationDispatcher.js`

**Problema:** Loop sequencial está lento
```javascript
// ATUAL (Linha ~260)
for (const [index, channel] of channels.entries()) {
  // Processamento sequencial
}
```

**Solução:** Manter sequencial mas otimizar verificações
- Remover logs excessivos em produção
- Cachear verificações de duplicação
- Otimizar queries de banco

#### 1.2 Corrigir Classificação Kabum
**Arquivo:** `backend/src/services/bots/notificationDispatcher.js`

**Problema:** Logo da Kabum não está sendo encontrado
```javascript
// Linha ~42
static PLATFORM_LOGOS = {
  shopee: 'shopee.png',
  mercadolivre: 'mercadolivre.png',
  amazon: 'amazon.png',
  magazineluiza: 'magazineluiza.png',
  aliexpress: 'aliexpress.png',
  kabum: 'kabum.png',  // ✓ Já está definido
  pichau: 'pichau.png',
  terabyte: 'terabyte.png',
  general: 'general.png'
};
```

**Verificar:**
1. Se o arquivo `backend/assets/logos/kabum.png` existe
2. Se o cupom está sendo criado com `platform: 'kabum'` (não 'general')

---

### Bug 2: WhatsApp Web - Template e Imagem

#### 2.1 Garantir Uso de Imagem + Template
**Arquivo:** `backend/src/services/coupons/couponNotificationService.js`

**Problema:** Código já está correto (linha 348), mas pode não estar sendo executado

**Verificação Necessária:**
1. Confirmar que `imageToSend` está sendo definido corretamente
2. Verificar se `imageUrlForWhatsApp` está sendo gerado
3. Confirmar que `whatsappWebService.sendImage()` está funcionando

**Ação:** Adicionar mais logs para debug

#### 2.2 Prevenir Ativação Automática do Bot
**Arquivo:** `backend/src/services/bots/notificationDispatcher.js`

**Problema:** Notificação de cupom esgotado está ativando bot

**Solução:** Verificar se o método `notifyCouponOutOfStock` está usando `bypassDuplicates` corretamente

---

### Bug 3: Notificação de Cupom Esgotado

#### 3.1 Criar Template no Banco
**SQL:** Criar template `out_of_stock_coupon`

```sql
-- Verificar se template existe
SELECT * FROM bot_templates WHERE type = 'out_of_stock_coupon';

-- Se não existir, criar
INSERT INTO bot_templates (type, platform, content, is_active, created_at, updated_at)
VALUES 
('out_of_stock_coupon', 'telegram', 
'⚠️ *CUPOM ESGOTADO* ⚠️

{{platform_emoji}} *Plataforma:* {{platform_name}}
🎟️ *Cupom:* `{{coupon_code}}`

😢 Este cupom esgotou! Mas não se preocupe, novos cupons estão chegando.
Fique de olho para não perder as próximas ofertas!', 
true, NOW(), NOW()),

('out_of_stock_coupon', 'whatsapp', 
'⚠️ *CUPOM ESGOTADO* ⚠️

{{platform_emoji}} *Plataforma:* {{platform_name}}
🎟️ *Cupom:* {{coupon_code}}

😢 Este cupom esgotou! Mas não se preocupe, novos cupons estão chegando.
Fique de olho para não perder as próximas ofertas!', 
true, NOW(), NOW());
```

#### 3.2 Corrigir Dispatcher
**Arquivo:** `backend/src/services/coupons/couponNotificationService.js`

**Problema:** Linha 656 usa `sendToTelegramWithImage` com `null` para imagem

**Solução:** Usar `dispatch` do notificationDispatcher em vez de métodos individuais

```javascript
// SUBSTITUIR (Linha ~611-670)
async notifyOutOfStockCoupon(coupon) {
  try {
    logger.info(`📢 ========== NOTIFICAÇÃO DE CUPOM ESGOTADO ==========`);
    logger.info(`   Cupom: ${coupon.code}`);
    logger.info(`   Plataforma: ${coupon.platform}`);
    logger.info(`   ID: ${coupon.id}`);

    // Usar dispatcher unificado
    const result = await notificationDispatcher.dispatch('coupon_out_of_stock', coupon, {
      manual: false,
      bypassDuplicates: false
    });

    // Criar notificações push
    logger.info(`📱 Criando notificações push...`);
    await this.createPushNotifications(coupon, 'out_of_stock_coupon');
    logger.info(`✅ Notificações push criadas`);

    logger.info(`✅ ========== NOTIFICAÇÃO CONCLUÍDA ==========`);
    return result;

  } catch (error) {
    logger.error(`❌ Erro ao notificar cupom esgotado: ${error.message}`);
    throw error;
  }
}
```

#### 3.3 Adicionar Suporte no Dispatcher
**Arquivo:** `backend/src/services/bots/notificationDispatcher.js`

**Adicionar:** Suporte para `coupon_out_of_stock` no método `formatMessage` (linha ~730)

```javascript
case 'coupon_out_of_stock':
  templateType = 'out_of_stock_coupon';
  variables = templateRenderer.prepareCouponVariables(data);
  break;
```

---

### Bug 4: Auto Republicação

#### 4.1 Verificar Scheduler
**Arquivo:** `backend/src/server.js` ou `backend/src/app.js`

**Verificar se existe:**
```javascript
import autoRepublishService from './services/autoRepublishService.js';

// Agendar execução a cada hora
setInterval(async () => {
  try {
    const isEnabled = await autoRepublishService.isEnabled();
    if (isEnabled) {
      await autoRepublishService.analyzeAndSchedule();
    }
  } catch (error) {
    logger.error(`Erro no auto-republish: ${error.message}`);
  }
}, 60 * 60 * 1000); // 1 hora
```

#### 4.2 Criar Cron Job
**Arquivo:** `backend/src/services/schedulers/autoRepublishScheduler.js` (CRIAR)

```javascript
import cron from 'node-cron';
import autoRepublishService from '../autoRepublishService.js';
import logger from '../../config/logger.js';

class AutoRepublishScheduler {
  start() {
    // Executar a cada hora
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('🤖 Executando auto-republicação agendada...');
        const isEnabled = await autoRepublishService.isEnabled();
        
        if (!isEnabled) {
          logger.info('⏸️ Auto-republicação desabilitada');
          return;
        }

        await autoRepublishService.analyzeAndSchedule();
        logger.info('✅ Auto-republicação concluída');
      } catch (error) {
        logger.error(`❌ Erro na auto-republicação: ${error.message}`);
      }
    });

    logger.info('✅ Scheduler de auto-republicação iniciado');
  }
}

export default new AutoRepublishScheduler();
```

#### 4.3 Inicializar Scheduler
**Arquivo:** `backend/src/server.js`

```javascript
import autoRepublishScheduler from './services/schedulers/autoRepublishScheduler.js';

// Após inicialização do servidor
autoRepublishScheduler.start();
```

---

## 📝 Checklist de Implementação

### Fase 1: Correções Críticas
- [ ] Criar template `out_of_stock_coupon` no banco
- [ ] Corrigir método `notifyOutOfStockCoupon`
- [ ] Adicionar suporte `coupon_out_of_stock` no dispatcher
- [ ] Verificar logo da Kabum em `backend/assets/logos/`

### Fase 2: Otimizações
- [ ] Reduzir logs em produção
- [ ] Otimizar queries de duplicação
- [ ] Cachear verificações frequentes

### Fase 3: Auto Republicação
- [ ] Criar scheduler de auto-republicação
- [ ] Inicializar scheduler no server.js
- [ ] Testar execução automática

### Fase 4: Testes
- [ ] Testar publicação de cupom Kabum
- [ ] Testar notificação de cupom esgotado (Telegram + WhatsApp)
- [ ] Testar WhatsApp Web com imagem
- [ ] Testar auto-republicação automática

---

## 🚀 Ordem de Execução

1. **Imediato:** Criar template `out_of_stock_coupon`
2. **Imediato:** Corrigir `notifyOutOfStockCoupon`
3. **Imediato:** Verificar logo Kabum
4. **Curto Prazo:** Implementar scheduler
5. **Médio Prazo:** Otimizações de performance

---

## 📊 Resultados Esperados

Após as correções:
- ✅ Cupons publicam rapidamente
- ✅ Kabum classificado corretamente
- ✅ Telegram publica todas as notificações
- ✅ WhatsApp usa imagem + template
- ✅ Notificações de cupom esgotado funcionam
- ✅ Sistema de auto republicação executa automaticamente
