# 📡 API Reference

Documentação completa da API REST do MTW Promo.

## 🔗 Base URL

```
http://localhost:3000/api
```

## 🔐 Autenticação

A maioria dos endpoints requer autenticação via JWT.

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

## 📋 Endpoints

### Autenticação
- [Autenticação](./authentication.md)

### Produtos
- [Produtos](./products.md)

### Cupons
- [Cupons](./coupons.md)

### Categorias
- [Categorias](./categories.md)

### Analytics
- [Analytics](./analytics.md)

### Bots
- [Bots](./bots.md)

### Usuários
- [Usuários](./users.md)

### Notificações
- [Notificações](./notifications.md)

## 📊 Estrutura de Resposta

### Sucesso
```json
{
  "success": true,
  "data": { ... },
  "message": "Operação realizada com sucesso"
}
```

### Erro
```json
{
  "success": false,
  "error": "Mensagem de erro",
  "code": "ERROR_CODE"
}
```

## 🔒 Códigos de Status

- `200` - Sucesso
- `201` - Criado
- `400` - Requisição inválida
- `401` - Não autenticado
- `403` - Não autorizado
- `404` - Não encontrado
- `500` - Erro interno

## 📚 Documentação Detalhada

Veja os documentos específicos para cada grupo de endpoints.

---

**Próximo**: [Troubleshooting](../06-troubleshooting/README.md)



