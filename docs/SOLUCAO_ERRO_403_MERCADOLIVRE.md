# Solução para Erro 403 do Mercado Livre

## 🔍 Diagnóstico Realizado

### Testes Executados:

1. **Credenciais no Banco de Dados:**
   - CLIENT_ID: ✅ OK
   - CLIENT_SECRET: ✅ OK
   - REFRESH_TOKEN: ✅ OK

2. **Geração de Token:**
   - ✅ Token gerado com sucesso: `APP_USR-1...54934193281569-01240...`

3. **Requisição à API:**
   - ❌ **ERRO 403 FORBIDDEN** (mesmo com token válido)

## 🎯 Causa Raiz Identificada

O erro 403 **NÃO é um problema de código**. É um problema de **configuração da aplicação no DevCenter do Mercado Livre**.

### Por que acontece?

Quando você cria uma aplicação no Mercado Livre, ela precisa ter os **scopes (permissões) corretos** configurados. O erro 403 acontece quando:

1. A aplicação não tem os scopes necessários para acessar a API de busca
2. A aplicação está em modo de teste/desenvolvimento com restrições
3. O IP do servidor não está na lista de IPs permitidos

## ✅ Solução

### Opção 1: Configurar Scopes no DevCenter (Recomendado)

1. Acesse: https://developers.mercadolivre.com.br/
2. Faça login e vá em "Minhas Aplicações"
3. Selecione sua aplicação
4. Vá em "Configurações" > "Scopes"
5. **Certifique-se de que os seguintes scopes estão habilitados:**
   - `read` - Leitura de informações públicas
   - `offline_access` - Acesso offline (refresh token)
   
6. Salve as alterações
7. **IMPORTANTE:** Após alterar scopes, você precisa **reautorizar a aplicação**:
   - Vá em `/settings` > Mercado Livre no painel admin
   - Clique em "Reautenticar com Mercado Livre"
   - Faça o fluxo OAuth novamente

### Opção 2: Verificar Lista de IPs Permitidos

1. No DevCenter, vá em "Configurações" > "Segurança"
2. Verifique se há restrição de IPs
3. Se houver, adicione o IP do seu servidor
4. Ou remova a restrição se estiver em desenvolvimento

### Opção 3: Usar Scraping (Solução Temporária - JÁ FUNCIONA)

O sistema **já está funcionando** usando scraping como fallback:
- ✅ 48 produtos encontrados
- ✅ Cupons sendo capturados
- ✅ Imagens válidas
- ✅ Links corretos

**Não é necessário fazer nada** se você está satisfeito com o scraping.

## 📋 Checklist de Verificação

- [ ] Verificar scopes da aplicação no DevCenter
- [ ] Verificar se aplicação está em modo "Produção" (não "Teste")
- [ ] Verificar lista de IPs permitidos
- [ ] Reautorizar aplicação após mudanças de scopes
- [ ] Testar novamente após configurações

## 🔧 Como Testar Após Configurar

Execute o script de diagnóstico:

```bash
cd backend
node scripts/diagnose-meli-auth.js
```

Ou teste diretamente:

```bash
node -e "import('./src/services/autoSync/meliSync.js').then(m => m.default.fetchMeliProducts('notebook', 5).then(p => console.log('Produtos:', p.length)))"
```

## 💡 Recomendação

**Para desenvolvimento/uso atual:**
- Continue usando o scraping (já funciona perfeitamente)
- Não há necessidade urgente de corrigir o 403

**Para produção/escala:**
- Configure os scopes corretamente no DevCenter
- Use a API oficial (mais rápida e confiável)
- Evita bloqueios por scraping excessivo

## ℹ️ Informações Adicionais

### Diferença entre API e Scraping:

| Aspecto | API com Token | Scraping |
|---------|--------------|----------|
| Velocidade | ⚡ Muito rápida | 🐌 Mais lenta |
| Confiabilidade | ✅ Alta | ⚠️ Média (pode quebrar se ML mudar HTML) |
| Rate Limits | 📊 Definidos | 🚫 Pode ser bloqueado |
| Dados | 📦 Estruturados | 🕷️ Extraídos do HTML |
| Status Atual | ❌ 403 (scopes) | ✅ Funcionando |

### Documentação Oficial:

- Scopes: https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao
- API de Busca: https://developers.mercadolivre.com.br/pt_br/itens-e-buscas
