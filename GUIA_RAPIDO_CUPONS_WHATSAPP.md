# 🚀 Guia Rápido: Resolver Problema de Cupons no WhatsApp Web

## ❌ Problema
Cupons criados pela plataforma admin ou bots não estão sendo publicados nos canais do WhatsApp Web.

## ✅ Causa
Todos os canais WhatsApp Web têm **filtro de categoria** configurado. Cupons **sem categoria** são automaticamente bloqueados.

## 🔧 Solução Rápida (3 opções)

### Opção 1: Sempre adicionar categoria aos cupons (RECOMENDADO)

Ao criar um cupom, sempre selecione uma categoria:
- ✅ No painel admin: use o campo "Categoria"
- ✅ Nos bots: adicione a categoria durante a criação

### Opção 2: Corrigir cupons existentes sem categoria

Execute o script interativo:

```bash
cd backend
node scripts/fix-coupons-without-category.js
```

O script vai:
1. Listar todos os cupons sem categoria
2. Mostrar as categorias disponíveis
3. Permitir atribuir categoria em massa ou individualmente

### Opção 3: Remover filtro de categoria de um canal

Se você quer que cupons sem categoria sejam publicados, acesse o banco de dados:

```sql
-- Ver canais atuais
SELECT id, name, category_filter FROM bot_channels WHERE platform = 'whatsapp_web';

-- Remover filtro do canal "PrecoCerto" (exemplo)
UPDATE bot_channels 
SET category_filter = NULL 
WHERE name = 'PrecoCerto';
```

## 🔍 Verificar se está funcionando

### 1. Execute o diagnóstico:

```bash
cd backend
node scripts/diagnose-whatsapp-coupons.js
```

### 2. Teste criando um cupom:

- Crie um cupom COM categoria
- Verifique se foi publicado nos canais WhatsApp Web

### 3. Verifique os logs:

```bash
# Ver logs em tempo real
tail -f backend/logs/combined.log | grep -i "cupom\|coupon"
```

## 📋 Categorias Aceitas

### Canal "PrecoCerto" aceita 8 categorias
### Canal "PreçoCerto Gamer" aceita 3 categorias

Para ver quais categorias cada canal aceita, execute:

```bash
cd backend
node scripts/diagnose-whatsapp-coupons.js
```

## ⚠️ Importante

- Cupons **COM categoria** que esteja na lista do canal → ✅ Publicado
- Cupons **SEM categoria** → ❌ Bloqueado (se o canal tiver filtro)
- Cupons **COM categoria** que NÃO esteja na lista → ❌ Bloqueado

## 🆘 Ainda não funciona?

Se após aplicar as correções os cupons ainda não forem publicados, verifique:

1. ✅ WhatsApp Web está conectado? (QR Code escaneado)
2. ✅ Os números dos canais estão corretos?
3. ✅ O serviço WhatsApp Web está ativo no painel admin?
4. ✅ Os canais estão marcados como ativos?

Execute o diagnóstico completo:

```bash
cd backend
node scripts/diagnose-whatsapp-coupons.js
```

## 📞 Suporte

Se precisar de ajuda adicional, verifique:
- Logs do servidor: `backend/logs/combined.log`
- Documentação completa: `PROBLEMA_CUPONS_WHATSAPP_WEB.md`
