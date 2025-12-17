# ⚡ Teste Rápido

Valide sua instalação com estes testes rápidos.

## 🚀 Teste 1: Backend Health Check

```bash
curl http://localhost:3000/api/health
```

**Esperado**:
```json
{
  "success": true,
  "message": "API MTW Promo está funcionando",
  "timestamp": "2024-12-14T..."
}
```

## 🔐 Teste 2: Login Admin

1. Acesse `http://localhost:5173`
2. Faça login com credenciais do admin
3. Verifique se o dashboard carrega

**Esperado**: Dashboard com estatísticas

## 📦 Teste 3: Criar Produto

No admin panel:
1. Vá em **Produtos** > **Novo Produto**
2. Preencha os campos básicos
3. Salve

**Esperado**: Produto criado e aparecendo na lista

## 🎟️ Teste 4: Criar Cupom

No admin panel:
1. Vá em **Cupons** > **Novo Cupom**
2. Preencha os campos
3. Salve

**Esperado**: Cupom criado e aparecendo na lista

## 📱 Teste 5: Mobile App

1. Inicie o app mobile (`npm start`)
2. Faça login
3. Verifique se produtos aparecem

**Esperado**: Home screen com produtos

## 🔌 Teste 6: API Endpoints

```bash
# Listar produtos
curl http://localhost:3000/api/products

# Listar cupons
curl http://localhost:3000/api/coupons

# Listar categorias
curl http://localhost:3000/api/categories
```

**Esperado**: Respostas JSON válidas

## ✅ Todos os Testes Passaram?

Se todos os testes passaram, sua instalação está funcionando! 🎉

## 🆘 Algum Teste Falhou?

Consulte:
- [Troubleshooting](../06-troubleshooting/README.md)
- Logs do backend (`logs/app.log`)
- Console do navegador (F12)

---

**Próximo**: [Configurar Integrações](../04-integrations/README.md)





