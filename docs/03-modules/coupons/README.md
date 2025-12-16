# 🎟️ Sistema de Cupons

Documentação do sistema de captura e gerenciamento de cupons.

## 📋 Visão Geral

O sistema de cupons permite capturar, gerenciar e distribuir cupons de desconto de múltiplas plataformas.

## 🔄 Fontes de Captura

### 1. Mercado Livre ✅
- Captura automática via API
- Links de afiliados
- Status: 100% funcional

### 2. Shopee ✅
- Captura automática via API
- Links de afiliados
- Status: 90% funcional

### 3. Telegram Channels ✅
- Captura de canais públicos
- Detecção automática
- Status: 100% funcional

### 4. Gatry ✅
- Web scraping
- Captura automática
- Status: 100% funcional

### 5. Amazon ⚠️
- Em desenvolvimento
- Status: 30%

### 6. AliExpress ⚠️
- Em desenvolvimento
- Status: 30%

## 🔄 Fluxo de Aprovação

1. **Captura**: Sistema captura cupom automaticamente
2. **Pendente**: Cupom fica pendente de aprovação
3. **Aprovação**: Admin aprova ou rejeita
4. **Ativo**: Cupom fica disponível para usuários

## 📊 Gerenciamento

### Via Admin Panel

1. Acesse `/coupons`
2. Veja cupons pendentes
3. Aprove ou rejeite
4. Edite informações se necessário

### Via API

- `GET /api/coupons` - Listar cupons ativos
- `GET /api/coupon-capture/pending` - Listar pendentes
- `PUT /api/coupon-capture/coupons/:id/approve` - Aprovar
- `PUT /api/coupon-capture/coupons/:id/reject` - Rejeitar

## 🔍 Detecção Automática

O sistema detecta automaticamente:
- Códigos de cupom (4-15 caracteres)
- Descontos (percentual ou valor fixo)
- Plataformas (Mercado Livre, Shopee, etc)
- Validade
- Compra mínima

## 📚 Mais Informações

- [API Reference](../05-api-reference/coupons.md)
- [Telegram Collector](../04-integrations/telegram-collector/README.md)

---

**Próximo**: [Auto Sync](./auto-sync/README.md)



