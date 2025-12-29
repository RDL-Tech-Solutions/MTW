# 🧪 Script de Teste da API do Mercado Livre

## 📋 Descrição

Script completo para testar **todos os endpoints** da API do Mercado Livre, incluindo:
- ✅ Autenticação (Access Token e Refresh Token)
- ✅ Busca de Produtos
- ✅ Categorias
- ✅ Ofertas e Descontos  
- ✅ Trends
- ✅ Rate Limits
- ✅ Endpoints de Seller
- ✅ Multiget (busca múltipla)

## 🚀 Como Usar

### Pré-requisitos

Certifique-se de ter as credenciais configuradas:
- No banco de dados (Admin Panel), **OU**
- No arquivo `.env` do backend

### Executar Testes

```powershell
# Execute o script:
node backend/scripts/test-meli-api.js
```

## 📊 O Que o Script Testa

### 🔐 AUTENTICAÇÃO (Testes 1-3)
1. **Validar Credenciais** - Verifica se Client ID e Secret estão configurados
2. **Obter/Renovar Token** - Testa renovação via Refresh Token ou Client Credentials
3. **Validar Access Token** - Confirma que o token está válido e retorna informações do usuário

### 🔍 API PÚBLICA (Testes 4-8)
4. **Buscar Categorias** - Lista todas as categorias disponíveis no Mercado Livre
5. **Buscar Produtos** - Testa busca por termo (ex: "notebook")
6. **Detalhes de Produto** - Obtém informações completas de um produto
7. **Buscar Ofertas** - Busca produtos com desconto (10-100% OFF)
8. **Buscar Trends** - Obtém tendências de busca

### ⚡ AVANÇADO (Testes 9-12)
9. **Rate Limits** - Verifica quantas requisições restam
10. **Endpoints de Seller** - Testa endpoints específicos de vendedor
11. **Buscar por Categoria** - Busca produtos em categoria específica
12. **Multiget** - Busca múltiplos produtos de uma vez

## 📈 Exemplo de Saída

```
================================================================================
🧪 TESTE COMPLETO DA API DO MERCADO LIVRE
================================================================================

━━━ Carregando Configurações ━━━
ℹ️  Configurações carregadas
   Client ID: 123456789...
   Access Token: APP-ABC123...
   User ID: 260114746

━━━ TESTES DE AUTENTICAÇÃO ━━━
📋 1. Validar Credenciais
✅ PASSOU

📋 2. Obter/Renovar Access Token
   Novo Access Token: APP-XYZ789...
✅ PASSOU

📋 3. Validar Access Token
   User ID: 260114746
   Nickname: MEUUSER
   Site: MLB
✅ PASSOU

━━━ TESTES DE API PÚBLICA ━━━
📋 4. Buscar Categorias
   Total de categorias: 42
   Exemplo: Veículos (MLB1743)
✅ PASSOU

📋 5. Buscar Produtos (Search)
   Produtos encontrados: 5
   Exemplo: Notebook Dell Intel Core i5
      Preço: R$ 2499.90
      ID: MLB123456789
✅ PASSOU

━━━ TESTES AVANÇADOS ━━━
📋 9. Verificar Rate Limits
   Rate Limit: 9500/10000 requests restantes
✅ PASSOU

================================================================================
RESUMO DOS TESTES
================================================================================
Total de Testes: 12
✅ Passou: 12
❌ Falhou: 0
⚠️  Avisos: 0
⏱️  Duração: 8.42s
📊 Taxa de Sucesso: 100.0%

🎉 TODOS OS TESTES PASSARAM!
```

## ⚠️ Se Algo Falhar

### Erro de Autenticação
```
❌ ERRO: Error validating grant
```
**Solução:** Seu refresh token expirou. Reautentique via:
1. Painel Admin → Configurações → Mercado Livre → "Obter Refresh Token"
2. Ou execute: `node backend/scripts/get-meli-token.js`

### Erro de Credenciais
```
❌ Client ID não configurado
```
**Solução:** Configure no Admin Panel ou no `.env`:
```env
MELI_CLIENT_ID=seu_client_id
MELI_CLIENT_SECRET=seu_client_secret
```

### Rate Limit Excedido
```
⚠️  Atenção: Apenas 50 requests restantes!
```
**Solução:** Aguarde alguns minutos. O Mercado Livre limita 10.000 requests/dia.

## 🔧 Customização

Para adicionar mais testes, edite o arquivo e adicione funções seguindo o padrão:

```javascript
async function testMeuNovoTeste() {
  const response = await axios.get('https://api.mercadolibre.com/...');
  log.debug(`Resultado: ${response.data}`);
  return true; // ou false se falhou
}

// Adicione na função main():
await runTest('X. Meu Novo Teste', testMeuNovoTeste);
```

## 📚 Documentação da API

Para mais informações sobre a API do Mercado Livre:
- [Documentação Oficial](https://developers.mercadolivre.com.br/pt_br/api-docs-pt-br)
- [OAuth 2.0](https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao)
- [Endpoints](https://developers.mercadolivre.com.br/pt_br/api-docs-pt-br)

## 💡 Dicas

- **Execute regularmente** para garantir que a integração está funcionando
- **CI/CD**: Adicione ao pipeline para testes automatizados
- **Monitoramento**: Use para verificar health da API periodicamente
- **Debug**: Logs detalhados ajudam a diagnosticar problemas

---

**Desenvolvido por:** RDL Tech Solutions  
**Data:** 29/12/2025
