# 🔄 Auto Sync

Sistema de sincronização automática de produtos.

## 📋 Visão Geral

O Auto Sync sincroniza produtos automaticamente das plataformas integradas.

## 🔄 Plataformas Suportadas

- **Mercado Livre** ✅ - 100% funcional
- **Shopee** ✅ - 90% funcional
- **Amazon** ⚠️ - Em desenvolvimento
- **AliExpress** ⚠️ - Em desenvolvimento

## ⚙️ Configuração

### Via Admin Panel

1. Acesse `/sync` (se disponível)
2. Configure frequência de sincronização
3. Selecione plataformas
4. Salve

### Via API

- `GET /api/sync/config` - Obter configuração
- `POST /api/sync/config` - Salvar configuração
- `POST /api/sync/run-now` - Executar agora

## 🔄 Frequência

- **Padrão**: A cada 15 minutos
- **Configurável**: Via admin panel

## 📊 Logs

Veja os logs de sincronização:
- `GET /api/sync/history` - Histórico
- `GET /api/sync/stats` - Estatísticas

## 📚 Mais Informações

- [API Reference](../05-api-reference/sync.md)

---

**Próximo**: [Índice](../README.md)



