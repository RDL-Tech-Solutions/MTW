# Guia de Migração - Sistema de Recuperação de Senha

## Passo a Passo para Deploy

### 1. Backup do Banco de Dados
```bash
# Fazer backup antes de qualquer alteração
pg_dump -h seu-host -U seu-usuario -d seu-banco > backup_pre_migration.sql
```

### 2. Aplicar Migração do Banco
```bash
cd backend
node scripts/apply-verification-code-migration.js
```

**Verificar se migração foi aplicada:**
```sql
-- Conectar ao banco e executar:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('verification_code', 'verification_code_expiry');
```

### 3. Atualizar Variáveis de Ambiente

**Backend `.env`:**
```env
# Email Service (já configurado)
ONESIGNAL_EMAIL_ENABLED=true
SMTP_FALLBACK_ENABLED=true

# App URL (para emails)
APP_URL=https://seu-app.com
```

### 4. Instalar Dependências

**Backend:**
```bash
cd backend
npm install
```

**App Mobile:**
```bash
cd app
npm install
```

### 5. Remover Dependências Não Utilizadas (Opcional)

**Verificar se expo-auth-session é usado em outro lugar:**
```bash
cd app
grep -r "expo-auth-session" src/
grep -r "expo-web-browser" src/
```

**Se não houver outros usos, remover:**
```bash
npm uninstall expo-auth-session expo-web-browser
```

### 6. Testar em Desenvolvimento

**Backend:**
```bash
cd backend
npm run dev
```

**App Mobile:**
```bash
cd app
npm start
```

**Testes Manuais:**
1. ✅ Abrir app e ir para "Esqueci minha senha"
2. ✅ Digitar email válido
3. ✅ Verificar recebimento do email com código
4. ✅ Digitar código de 6 dígitos
5. ✅ Digitar nova senha
6. ✅ Confirmar que senha foi alterada
7. ✅ Fazer login com nova senha
8. ✅ Testar reenvio de código
9. ✅ Testar código expirado (aguardar 15 minutos)
10. ✅ Testar código inválido

### 7. Verificar Logs

**Backend:**
```bash
tail -f backend/logs/app.log | grep "forgotPassword\|resetPassword"
```

**Procurar por:**
- ✅ "Código gerado para [email]"
- ✅ "Email com código enviado para [email]"
- ✅ "Código verificado com sucesso"
- ✅ "Senha redefinida com sucesso"

### 8. Deploy em Staging

1. Fazer commit das alterações
2. Push para branch de staging
3. Deploy automático ou manual
4. Repetir testes manuais em staging
5. Verificar emails em staging

### 9. Deploy em Produção

**Checklist Pré-Deploy:**
- [ ] Backup do banco realizado
- [ ] Migração testada em staging
- [ ] Emails testados em staging
- [ ] Fluxo completo validado
- [ ] Rollback plan preparado

**Deploy:**
1. Aplicar migração do banco em produção
2. Deploy do backend
3. Deploy do app mobile
4. Monitorar logs por 24h
5. Verificar métricas de uso

### 10. Monitoramento Pós-Deploy

**Métricas para Acompanhar:**
- Taxa de sucesso de recuperação de senha
- Tempo médio do fluxo
- Taxa de reenvio de código
- Taxa de códigos expirados
- Erros de email

**Queries Úteis:**
```sql
-- Códigos ativos
SELECT email, verification_code, verification_code_expiry 
FROM users 
WHERE verification_code IS NOT NULL 
AND verification_code_expiry > NOW();

-- Códigos expirados nas últimas 24h
SELECT COUNT(*) 
FROM users 
WHERE verification_code_expiry > NOW() - INTERVAL '24 hours'
AND verification_code_expiry < NOW();
```

---

## Rollback (Se Necessário)

### 1. Reverter Código
```bash
git revert HEAD~3  # Ajustar número de commits
git push
```

### 2. Reverter Migração do Banco
```sql
ALTER TABLE users DROP COLUMN IF EXISTS verification_code;
ALTER TABLE users DROP COLUMN IF EXISTS verification_code_expiry;
DROP INDEX IF EXISTS idx_users_verification_code;
```

### 3. Restaurar Backup
```bash
psql -h seu-host -U seu-usuario -d seu-banco < backup_pre_migration.sql
```

---

## Troubleshooting

### Problema: Email não chega
**Solução:**
1. Verificar logs do backend
2. Verificar configuração SMTP/OneSignal
3. Verificar spam/lixeira
4. Testar com `backend/scripts/test-smtp.js`

### Problema: Código inválido
**Solução:**
1. Verificar se código não expirou (15 minutos)
2. Verificar se código foi digitado corretamente
3. Verificar logs do backend
4. Tentar reenviar código

### Problema: Migração falhou
**Solução:**
1. Verificar logs de erro
2. Verificar permissões do banco
3. Executar comandos SQL manualmente
4. Restaurar backup se necessário

### Problema: App não compila
**Solução:**
1. Limpar cache: `npm start -- --clear`
2. Reinstalar dependências: `rm -rf node_modules && npm install`
3. Verificar imports removidos
4. Verificar diagnostics

---

## Suporte

Para problemas ou dúvidas:
1. Verificar logs detalhados
2. Consultar `PASSWORD_RECOVERY_MIGRATION_COMPLETE.md`
3. Revisar código dos arquivos modificados
4. Contatar equipe de desenvolvimento

---

**Última Atualização:** 27 de Fevereiro de 2026
