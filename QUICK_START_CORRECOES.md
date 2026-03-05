# ⚡ Quick Start - Aplicar Correções de Bugs

## 🚀 Aplicação Rápida (5 minutos)

### 1️⃣ Testar Correções
```bash
cd backend
node scripts/test-bug-fixes.js
```

### 2️⃣ Aplicar Migração SQL
```bash
node scripts/apply-out-of-stock-template.js
```

### 3️⃣ Verificar Logo Kabum
```bash
node scripts/check-platform-logos.js
```

**Se faltar logo da Kabum:**
- Adicione `kabum.png` em `backend/assets/logos/`

### 4️⃣ Instalar Dependência
```bash
npm install node-cron
```

### 5️⃣ Configurar .env
```bash
echo "ENABLE_CRON_JOBS=true" >> .env
```

### 6️⃣ Reiniciar Servidor
```bash
pm2 restart backend
# ou
npm start
```

### 7️⃣ Verificar Logs
```bash
pm2 logs backend --lines 50
```

**Procurar por:**
- ✅ Scheduler de auto-republicação iniciado
- ✅ Servidor rodando na porta 3000

---

## ✅ Checklist Rápido

- [ ] Testes executados com sucesso
- [ ] Migração SQL aplicada
- [ ] Logo Kabum verificado
- [ ] node-cron instalado
- [ ] ENABLE_CRON_JOBS=true no .env
- [ ] Servidor reiniciado
- [ ] Logs verificados

---

## 🧪 Testes Rápidos

### Teste 1: Cupom Esgotado
```bash
# Criar cupom de teste
curl -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "code": "TESTE123",
    "platform": "kabum",
    "discount_value": 10,
    "discount_type": "percentage"
  }'

# Notificar cupom esgotado
curl -X POST http://localhost:3000/api/coupons/<id>/notify-out-of-stock \
  -H "Authorization: Bearer <token>"
```

**Resultado esperado:**
- ✅ Mensagem no Telegram: "⚠️ CUPOM ESGOTADO"
- ✅ Mensagem no WhatsApp: "⚠️ CUPOM ESGOTADO"

### Teste 2: Auto-Republicação
```bash
# Verificar status
curl http://localhost:3000/api/auto-republish/status \
  -H "Authorization: Bearer <token>"
```

**Resultado esperado:**
```json
{
  "enabled": true,
  "scheduler": {
    "active": true,
    "running": false
  }
}
```

### Teste 3: Cupom Kabum
1. Criar cupom com `platform: "kabum"`
2. Publicar cupom
3. Verificar:
   - ✅ Logo da Kabum usado
   - ✅ Plataforma: "Kabum" (não "Geral")

---

## 🐛 Problemas Comuns

### "Template não encontrado"
```bash
node scripts/apply-out-of-stock-template.js
```

### "Logo não encontrado"
```bash
# Adicionar logo
cp /caminho/para/kabum.png backend/assets/logos/
```

### "Scheduler não inicia"
```bash
# Verificar .env
cat .env | grep ENABLE_CRON_JOBS

# Deve mostrar: ENABLE_CRON_JOBS=true
```

### "node-cron não instalado"
```bash
npm install node-cron
```

---

## 📊 Monitoramento

### Logs Importantes
```bash
# Ver logs em tempo real
pm2 logs backend --lines 100

# Filtrar por auto-republicação
pm2 logs backend | grep "auto-republicação"

# Filtrar por cupom esgotado
pm2 logs backend | grep "CUPOM ESGOTADO"
```

### Verificar Execução
```bash
# Status do PM2
pm2 status

# Informações detalhadas
pm2 info backend

# Reiniciar se necessário
pm2 restart backend
```

---

## 📞 Suporte

**Documentação completa:**
- `CORRECAO_BUGS_SISTEMA.md` - Análise detalhada
- `APLICAR_CORRECOES_BUGS.md` - Instruções completas

**Scripts úteis:**
- `test-bug-fixes.js` - Testar todas as correções
- `check-platform-logos.js` - Verificar logos
- `apply-out-of-stock-template.js` - Aplicar migração

**Logs:**
```bash
pm2 logs backend
```

---

## 🎉 Sucesso!

Se todos os testes passaram:
- ✅ Sistema corrigido e funcionando
- ✅ Cupons publicam rapidamente
- ✅ Notificações funcionam corretamente
- ✅ Auto-republicação ativa

**Próximos passos:**
- Monitorar logs por 24h
- Testar com cupons reais
- Verificar performance
