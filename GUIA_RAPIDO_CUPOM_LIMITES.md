# Guia Rápido: Aplicar Limites de Cupons

## 🚀 Passo a Passo

### 1. Aplicar Migration no Banco de Dados

```bash
cd backend
node scripts/apply-coupon-limits-migration.js
```

**Saída esperada:**
```
🚀 Iniciando migration de limites de cupons...

📄 Arquivo de migration carregado
📝 Executando SQL...

✅ Migration executada com sucesso!

🔍 Verificando estrutura da tabela...

📊 Estrutura da tabela coupons:
   ✓ min_purchase: ✅ Presente
   ✓ max_discount_value: ✅ Presente

🎉 Migration aplicada com sucesso!

📝 Próximos passos:
   1. Os campos min_purchase e max_discount_value agora estão disponíveis
   2. Todos os cupons existentes têm min_purchase = 0 por padrão
   3. O admin panel já está configurado para usar esses campos
   4. O app mobile já exibe essas informações

📊 Total de cupons no banco: X

✨ Processo concluído!
```

### 2. Reiniciar Backend (se estiver rodando)

```bash
# Se estiver usando o script de desenvolvimento:
# Opção 3 no menu (Reiniciar Servidores)

# Ou manualmente:
cd backend
npm run dev
```

### 3. Testar no Admin Panel

1. Acesse o admin panel: http://localhost:5173
2. Vá em **Cupons** → **Novo Cupom**
3. Preencha os dados:
   - Código: `TESTE50`
   - Plataforma: **Amazon** (ou qualquer outra)
   - Tipo: **Porcentagem**
   - Valor: `50`
   - **Compra Mínima:** `299.00`
   - **Desconto Máximo:** `150.00`
4. Salve o cupom
5. Verifique se os campos aparecem na listagem

### 4. Testar no App Mobile

1. Abra o app
2. Vá em **Cupons**
3. Procure o cupom criado
4. Verifique se aparecem:
   - 💰 Mín. R$299
   - 📉 Máx. R$150
5. Toque no cupom para ver detalhes
6. Confirme que as informações estão corretas

---

## ✅ Checklist de Verificação

- [ ] Migration aplicada com sucesso
- [ ] Backend reiniciado
- [ ] Admin panel mostra campos para todas as plataformas
- [ ] Cupom de teste criado com limites
- [ ] App mobile exibe limites corretamente
- [ ] Cupons existentes continuam funcionando

---

## 🐛 Solução de Problemas

### Erro ao aplicar migration

**Problema:** Script falha ao executar SQL

**Solução:**
1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie o conteúdo de `backend/database/migrations/add_coupon_purchase_limits.sql`
4. Execute manualmente

### Campos não aparecem no admin

**Problema:** Campos min_purchase e max_discount_value não aparecem

**Solução:**
1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Verifique se o arquivo `admin-panel/src/pages/Coupons.jsx` foi atualizado
3. Reinicie o admin panel

### App não mostra limites

**Problema:** Limites não aparecem no app mobile

**Solução:**
1. Verifique se o cupom tem valores > 0 nos campos
2. Reinicie o app (feche e abra novamente)
3. Verifique se os arquivos do app foram atualizados:
   - `app/src/screens/coupons/CouponsScreen.js`
   - `app/src/screens/coupon/CouponDetailsScreen.js`
   - `app/src/components/coupons/CouponCard.js`

---

## 📞 Suporte

Se encontrar problemas, verifique:
1. Logs do backend: `backend/logs/app.log`
2. Console do navegador (F12)
3. Logs do app mobile (Metro bundler)

Documentação completa: `CUPOM_LIMITES_TODAS_PLATAFORMAS.md`
