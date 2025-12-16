# 🏗️ Arquitetura do Sistema

Visão geral da arquitetura do MTW Promo.

## 📊 Diagrama de Arquitetura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Mobile App │────▶│  Backend API│────▶│  Supabase   │
│  (Expo)     │     │  (Node.js)  │     │  (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
                            │
                            │
                    ┌───────┴───────┐
                    │               │
            ┌───────▼──────┐ ┌──────▼──────┐
            │ Admin Panel  │ │   Redis     │
            │  (React)     │ │  (Cache)    │
            └──────────────┘ └─────────────┘
```

## 🏗️ Componentes Principais

### 1. Backend API
- **Tecnologia**: Node.js + Express
- **Banco**: PostgreSQL (Supabase)
- **Cache**: Redis (opcional)
- **Autenticação**: JWT

### 2. Admin Panel
- **Tecnologia**: React + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Estado**: Zustand

### 3. Mobile App
- **Tecnologia**: React Native + Expo
- **Navegação**: React Navigation
- **Estado**: Zustand

## 🔄 Fluxo de Dados

### Autenticação
1. Usuário faz login
2. Backend valida credenciais
3. Backend retorna JWT token
4. Cliente armazena token
5. Token enviado em requisições

### Produtos
1. Cliente solicita produtos
2. Backend consulta banco (com cache Redis se disponível)
3. Backend retorna dados
4. Cliente exibe produtos

### Cupons
1. Sistema captura cupons (cron ou Telegram Collector)
2. Cupons salvos no banco (pendentes)
3. Admin aprova cupons
4. Cliente solicita cupons ativos
5. Backend retorna cupons

### Notificações
1. Novo cupom/produto criado
2. Sistema verifica canais ativos
3. Bots enviam notificações
4. Push notifications enviadas

## 🔐 Segurança

- **JWT** para autenticação
- **Row Level Security (RLS)** no Supabase
- **Rate Limiting** nas APIs
- **CORS** configurado
- **Helmet.js** para headers de segurança
- **Validação** de inputs (Joi)

## 📚 Mais Detalhes

- [Arquitetura Detalhada](../07-architecture/README.md)

---

**Próximo**: [Instalação](../02-setup-installation/README.md)



