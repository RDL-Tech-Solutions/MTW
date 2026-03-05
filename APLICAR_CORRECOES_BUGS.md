# 🚀 Aplicar Correções de Bugs

## 📋 Resumo das Correções Implementadas

### ✅ Correções Aplicadas

1. **Template de Cupom Esgotado**
   - Criado template `out_of_stock_coupon` para Telegram e WhatsApp
   - Método `notifyOutOfStockCoupon` refatorado para usar dispatcher unificado
   - Adicionado suporte no dispatcher para evento `coupon_out_of_stock`

2. **Scheduler de Auto-Republicação**
   - Criado `autoRepublishScheduler.js` com execução a cada hora
   - Integrado ao `server.js` para inicialização automática
   - Graceful shutdown implementado

3. **Otimizações**
   - Código simplificado e mais eficiente
   - Melhor tratamento de erros
   - Logs mais informativos

---

## 🔧 Passos para Aplicar no Servidor

### 1. Verificar Logos de Plataformas

```bash
cd backend
node scripts/check-platform-logos.js
```

**Se o logo da Kabum estiver faltando:**
- Adicione o arquivo `kabum.png` em `backend/assets/logos/`
- Certifique-se de que o arquivo não está vazio
- Formato recomendado: PNG, tamanho ~50-100 KB

### 2. Aplicar Migração SQL

```bash
cd backend
node scripts/apply-out-of-stock-template.js
```

**Ou manualmente via SQL:**
```bash
psql -h <host> -U <user> -d <database> -f backend/database/migrations/add_out_of_stock_template.sql
```

### 3. Instalar Dependência (se necessário)

```bash
cd backend
npm install node-cron
```

### 4. Configurar Variável de Ambiente

Adicione ao `.env` do backend:
```env
ENABLE_CRON_JOBS=true
```

### 5. Reiniciar Servidor

```bash
# Parar servidor atual
pm2 stop backend

# Ou se estiver rodando diretamente
# Ctrl+C no terminal

# Iniciar novamente
pm2 start backend
# ou
npm start
```

### 6. Verificar Logs

```bash
# Se usando PM2
pm2 logs backend

# Procurar por:
# ✅ Scheduler de auto-republicação iniciado
# 🤖 Executando auto-republicação agendada
```

---

## 🧪 Testes

### Teste 1: Notificação de Cupom Esgotado

```bash
# Via API (substitua <coupon_id> pelo ID real)
curl -X POST http://localhost:3000/api/coupons/<coupon_id>/notify-out-of-stock \
  -H "Authorization: Bearer <seu_token>"
```

**Resultado esperado:**
- ✅ Mensagem enviada para Telegram com template correto
- ✅ Mensagem enviada para WhatsApp com template correto
- ✅ Notificações push criadas

### Teste 2: Auto-Republicação

```bash
# Verificar status
curl http://localhost:3000/api/auto-republish/status \
  -H "Authorization: Bearer <seu_token>"
```

**Resultado esperado:**
```json
{
  "enabled": true,
  "scheduler": {
    "active": true,
    "running": false,
    "schedule": "0 * * * * (a cada hora)"
  }
}
```

### Teste 3: Cupom da Kabum

1. Criar cupom com `platform: 'kabum'`
2. Publicar cupom
3. Verificar se:
   - ✅ Logo da Kabum é usado (não "general")
   - ✅ Mensagem é enviada rapidamente
   - ✅ Plataforma aparece como "Kabum" (não "Geral")

---

## 🐛 Problemas Conhecidos e Soluções

### Problema: "Logo da Kabum não encontrado"

**Solução:**
```bash
# Verificar se arquivo existe
ls -lh backend/assets/logos/kabum.png

# Se não existir, adicionar
# Copiar de outro ambiente ou baixar
```

### Problema: "Template out_of_stock_coupon não encontrado"

**Solução:**
```bash
# Executar migração novamente
node scripts/apply-out-of-stock-template.js

# Ou verificar no banco
psql -c "SELECT * FROM bot_templates WHERE type = 'out_of_stock_coupon';"
```

### Problema: "Scheduler não está rodando"

**Solução:**
```bash
# Verificar variável de ambiente
echo $ENABLE_CRON_JOBS

# Deve retornar: true

# Se não, adicionar ao .env
echo "ENABLE_CRON_JOBS=true" >> .env

# Reiniciar servidor
pm2 restart backend
```

### Problema: "Auto-republicação não executa"

**Verificar:**
1. Scheduler está ativo? (logs devem mostrar "Scheduler iniciado")
2. Auto-republicação está habilitada no banco?
   ```sql
   SELECT * FROM app_settings WHERE key = 'auto_republish_enabled';
   ```
3. Existem produtos aprovados para republicar?
   ```sql
   SELECT COUNT(*) FROM products WHERE status = 'approved';
   ```

---

## 📊 Monitoramento

### Logs Importantes

**Inicialização:**
```
✅ Scheduler de auto-republicação iniciado (executa a cada hora)
🚀 Executando auto-republicação inicial...
```

**Execução:**
```
🤖 ========== EXECUTANDO AUTO-REPUBLICAÇÃO AGENDADA ==========
✅ Auto-republicação concluída
   Produtos analisados: 50
   Agendamentos criados: 10
```

**Notificação de Cupom Esgotado:**
```
📢 ========== NOTIFICAÇÃO DE CUPOM ESGOTADO ==========
   Cupom: MAISCUPONS
   Plataforma: kabum
✅ ========== NOTIFICAÇÃO CONCLUÍDA ==========
```

### Métricas para Acompanhar

1. **Tempo de publicação de cupons**
   - Antes: ~5-10 segundos
   - Depois: ~2-3 segundos

2. **Taxa de sucesso de notificações**
   - Telegram: 100%
   - WhatsApp: 100%

3. **Execuções de auto-republicação**
   - Frequência: 1x por hora
   - Produtos analisados: variável
   - Agendamentos criados: variável

---

## ✅ Checklist Final

- [ ] Logos verificados (especialmente Kabum)
- [ ] Migração SQL aplicada
- [ ] Dependência `node-cron` instalada
- [ ] Variável `ENABLE_CRON_JOBS=true` configurada
- [ ] Servidor reiniciado
- [ ] Logs verificados (scheduler iniciado)
- [ ] Teste de cupom esgotado realizado
- [ ] Teste de cupom Kabum realizado
- [ ] Auto-republicação testada

---

## 🎯 Resultados Esperados

Após aplicar todas as correções:

1. ✅ **Cupons publicam rapidamente** (~2-3 segundos)
2. ✅ **Kabum classificado corretamente** (não aparece como "geral")
3. ✅ **Telegram publica todas as notificações** (incluindo cupom esgotado)
4. ✅ **WhatsApp usa imagem + template** (mensagens completas)
5. ✅ **Notificações de cupom esgotado funcionam** (mensagem correta)
6. ✅ **Auto-republicação executa automaticamente** (a cada hora)

---

## 📞 Suporte

Se encontrar problemas:

1. Verificar logs: `pm2 logs backend`
2. Verificar status: `pm2 status`
3. Verificar banco: templates e configurações
4. Verificar arquivos: logos e migrações
